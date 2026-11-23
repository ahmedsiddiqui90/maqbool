"""Postgres access (Neon in production, any Postgres locally).

Listings fall back to data/listings.json when DATABASE_URL is unset, so the pure tool tests
and `langgraph dev` still work without a database. Everything else needs Postgres.
"""
import json
import os
import threading
from datetime import timezone
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data"

_pool = None
_lock = threading.Lock()


def database_url() -> str:
    """DATABASE_URL with stray quotes/whitespace removed (dashboards often keep the .env quotes)."""
    return os.getenv("DATABASE_URL", "").strip().strip('"').strip("'")


def enabled() -> bool:
    return bool(database_url())


def get_pool():
    """One shared connection pool. autocommit + dict rows are required by PostgresSaver/Store."""
    global _pool
    if _pool is None:
        with _lock:
            if _pool is None:
                from psycopg.rows import dict_row
                from psycopg_pool import ConnectionPool

                _pool = ConnectionPool(
                    database_url(),
                    min_size=1,
                    max_size=int(os.getenv("DB_POOL_MAX", "6")),
                    kwargs={"autocommit": True, "prepare_threshold": 0, "row_factory": dict_row},
                    check=ConnectionPool.check_connection,  # Neon drops idle connections
                    max_lifetime=300,
                    open=True,
                )
    return _pool


SCHEMA = """
CREATE TABLE IF NOT EXISTS listings (
    id text PRIMARY KEY, kind text NOT NULL, title text NOT NULL, city text,
    price bigint NOT NULL, details text
);
CREATE TABLE IF NOT EXISTS visits (
    id serial PRIMARY KEY, user_id text NOT NULL, listing_id text NOT NULL,
    listing_title text, visit_when text NOT NULL, status text NOT NULL DEFAULT 'booked',
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS visits_user ON visits (user_id);
CREATE TABLE IF NOT EXISTS leads (
    user_id text PRIMARY KEY, last_thread_id text, budget bigint, kind text, city text,
    timeline text, status text NOT NULL DEFAULT 'new', last_message text,
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS threads (
    user_id text NOT NULL, thread_id text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (user_id, thread_id)
);
"""


def init_db() -> None:
    """Create tables and (re)seed listings from data/listings.json. Safe to run repeatedly."""
    with get_pool().connection() as conn:
        for stmt in filter(None, (x.strip() for x in SCHEMA.split(";"))):
            conn.execute(stmt)
        for it in _listings_json():
            conn.execute(
                """INSERT INTO listings (id, kind, title, city, price, details)
                   VALUES (%(id)s, %(kind)s, %(title)s, %(city)s, %(price)s, %(details)s)
                   ON CONFLICT (id) DO UPDATE SET kind=EXCLUDED.kind, title=EXCLUDED.title,
                   city=EXCLUDED.city, price=EXCLUDED.price, details=EXCLUDED.details""",
                {"city": None, "details": None, **it},
            )


def _listings_json() -> list[dict]:
    return json.loads((DATA / "listings.json").read_text(encoding="utf-8"))


def _iso(dt) -> str:
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def _fetch(sql: str, params=None) -> list[dict]:
    with get_pool().connection() as conn:
        return conn.execute(sql, params or ()).fetchall()


def _exec(sql: str, params=None) -> None:
    with get_pool().connection() as conn:
        conn.execute(sql, params or ())


# ---- listings (public data, not per-user) -----------------------------------------------------

def search_listings(max_price: int, kind: str = "any", city: str = "", limit: int = 5) -> list[dict]:
    if not enabled():
        rows = [i for i in _listings_json() if i["price"] <= max_price]
        if kind != "any":
            rows = [i for i in rows if i["kind"] == kind]
        if city:
            rows = [i for i in rows if (i.get("city") or "").lower() == city.lower()]
        return sorted(rows, key=lambda i: -i["price"])[:limit]
    return _fetch(
        """SELECT id, kind, title, city, price, details FROM listings
           WHERE price <= %s AND (%s = 'any' OR kind = %s) AND (%s = '' OR lower(city) = lower(%s))
           ORDER BY price DESC LIMIT %s""",
        (max_price, kind, kind, city, city, limit),
    )


def get_listing(listing_id: str) -> dict | None:
    if not enabled():
        return next((i for i in _listings_json() if i["id"] == listing_id), None)
    rows = _fetch("SELECT id, kind, title, city, price, details FROM listings WHERE id = %s", (listing_id,))
    return rows[0] if rows else None


def list_listings() -> list[dict]:
    if not enabled():
        return _listings_json()
    return _fetch("SELECT id, kind, title, city, price, details FROM listings ORDER BY id")


# ---- per-user data: every query is filtered by user_id ----------------------------------------

def create_visit(user_id: str, listing: dict, when: str) -> int:
    rows = _fetch(
        """INSERT INTO visits (user_id, listing_id, listing_title, visit_when)
           VALUES (%s, %s, %s, %s) RETURNING id""",
        (user_id, listing["id"], listing["title"], when),
    )
    return rows[0]["id"]


def _visit_out(r: dict) -> dict:
    return {
        "id": r["id"], "user_id": r["user_id"], "listing_id": r["listing_id"],
        "listing_title": r["listing_title"], "when": r["visit_when"], "status": r["status"],
        "created_at": _iso(r["created_at"]),
    }


def list_visits(user_id: str | None = None) -> list[dict]:
    if user_id is None:  # admin view
        rows = _fetch("SELECT * FROM visits ORDER BY created_at DESC LIMIT 200")
    else:
        rows = _fetch("SELECT * FROM visits WHERE user_id = %s ORDER BY created_at DESC", (user_id,))
    return [_visit_out(r) for r in rows]


def set_visit_status(visit_id: int, status: str) -> dict | None:
    rows = _fetch("UPDATE visits SET status = %s WHERE id = %s RETURNING *", (status, visit_id))
    return _visit_out(rows[0]) if rows else None


def touch_thread(user_id: str, thread_id: str) -> None:
    _exec(
        """INSERT INTO threads (user_id, thread_id) VALUES (%s, %s)
           ON CONFLICT (user_id, thread_id) DO UPDATE SET updated_at = now()""",
        (user_id, thread_id),
    )


def list_threads(user_id: str, limit: int = 20) -> list[dict]:
    rows = _fetch(
        "SELECT thread_id, updated_at FROM threads WHERE user_id = %s ORDER BY updated_at DESC LIMIT %s",
        (user_id, limit),
    )
    return [{"thread_id": r["thread_id"], "updated_at": _iso(r["updated_at"])} for r in rows]


def upsert_lead(user_id: str, thread_id: str, state: dict, last_message: str) -> None:
    _exec(
        """INSERT INTO leads (user_id, last_thread_id, budget, kind, city, timeline, last_message)
           VALUES (%s, %s, %s, %s, %s, %s, %s)
           ON CONFLICT (user_id) DO UPDATE SET last_thread_id = EXCLUDED.last_thread_id,
             budget = COALESCE(EXCLUDED.budget, leads.budget), kind = COALESCE(EXCLUDED.kind, leads.kind),
             city = COALESCE(EXCLUDED.city, leads.city), timeline = COALESCE(EXCLUDED.timeline, leads.timeline),
             last_message = EXCLUDED.last_message, updated_at = now()""",
        (user_id, thread_id, state.get("budget"), state.get("kind"), state.get("city"),
         state.get("timeline"), last_message[:500]),
    )
    _exec(
        """UPDATE leads SET status = CASE
             WHEN EXISTS (SELECT 1 FROM visits v WHERE v.user_id = leads.user_id AND v.status <> 'cancelled')
               THEN 'visit_booked'
             WHEN budget IS NOT NULL AND kind IS NOT NULL THEN 'qualified'
             ELSE 'new' END
           WHERE user_id = %s""",
        (user_id,),
    )


def list_leads() -> list[dict]:
    rows = _fetch("SELECT * FROM leads ORDER BY updated_at DESC LIMIT 200")
    return [{**r, "updated_at": _iso(r["updated_at"])} for r in rows]


def stats() -> dict:
    leads = _fetch("SELECT count(*) AS n, count(*) FILTER (WHERE status <> 'new') AS q FROM leads")[0]
    visits = _fetch("SELECT count(*) AS n FROM visits WHERE status <> 'cancelled'")[0]["n"]
    n = leads["n"]
    return {
        "leads": n, "qualified": leads["q"], "visits_booked": visits,
        "conversion_rate": round(visits / n, 2) if n else 0.0,
    }
