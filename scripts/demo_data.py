"""Reset the database to a clean demo state and seed a few realistic customers.

    python scripts/demo_data.py --reset            # asks you to type "reset" first
    python scripts/demo_data.py                    # seed only (adds to what is there)
    python scripts/demo_data.py --api http://127.0.0.1:8000 --reset --yes   # local testing

--reset TRUNCATES leads, visits, threads, conversations (checkpoints) and saved memories (store).
It keeps listings and the migration tables. Seeding goes through the real /chat API, so the
conversations, memories, leads and visits are exactly what a real customer would produce
(about 11 model turns, roughly 30k tokens on the real model).

Leaves ali / sana / bilal untouched so the live demo starts from a blank slate.
Needs DATABASE_URL (for --reset) and ADMIN_TOKEN, from the environment or .env.
"""
import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent

# user_id -> list of messages (one conversation each). "yes"/"no" answer the booking prompt.
CUSTOMERS = {
    "hamza": ["Assalam o alaikum, mujhe 50 lakh tak ki gaari chahiye Lahore mein",
              "What documents do I need if I finance it?"],
    "zainab": ["I'm looking for a house in Islamabad, around 2 crore, and I want to buy within 3 months",
               "Book a site visit for h-002 on Sunday 4pm", "yes"],
    "usman": ["My budget is 1 crore and I want a car in Karachi",
              "Book a test drive for c-007 on Friday 3pm", "yes"],
    "mehwish": ["What are your warranty terms on used cars?"],
    "kamran": ["I want to buy a house in Karachi, my budget is 1.5 crore",
               "Book a site visit for h-004 on Saturday 11am", "no"],
}
STAFF_CONFIRMS = "zainab"  # her visit is confirmed by staff; usman's is left awaiting confirmation


def env(name: str) -> str:
    if os.getenv(name):
        return os.environ[name].strip().strip('"').strip("'")
    f = ROOT / ".env"
    if f.exists():
        for line in f.read_text().splitlines():
            if line.startswith(name + "="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return ""


def call(api, method, path, body=None, token=None):
    headers = {"content-type": "application/json", **({"X-Admin-Token": token} if token else {})}
    req = urllib.request.Request(api + path, json.dumps(body).encode() if body is not None else None, headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.loads(r.read() or "null")
    except urllib.error.HTTPError as e:
        sys.exit(f"{method} {path} failed: HTTP {e.code} {e.read()[:200]!r}")


def reset(url: str, assume_yes: bool) -> None:
    import psycopg
    host = urlparse(url).hostname
    print(f"About to DELETE all leads, visits, conversations and memories in the database at {host}.")
    if not assume_yes and input('Type "reset" to continue: ').strip() != "reset":
        sys.exit("Cancelled. Nothing was changed.")
    with psycopg.connect(url, autocommit=True) as c:
        c.execute("TRUNCATE leads, threads, checkpoints, checkpoint_blobs, checkpoint_writes, store")
        c.execute("TRUNCATE visits RESTART IDENTITY")
    print("Cleared (listings and migrations kept).")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--api", default="https://maqbool.onrender.com")
    ap.add_argument("--reset", action="store_true", help="clear all customer data first")
    ap.add_argument("--yes", action="store_true", help="skip the typed confirmation")
    a = ap.parse_args()
    api, token = a.api.rstrip("/"), env("ADMIN_TOKEN")
    if not token:
        sys.exit("ADMIN_TOKEN is not set (environment or .env)")
    if a.reset:
        url = env("DATABASE_URL")
        if not url:
            sys.exit("DATABASE_URL is not set (environment or .env)")
        reset(url, a.yes)

    for user, messages in CUSTOMERS.items():
        print(f"\n== {user}")
        for m in messages:
            r = call(api, "POST", "/chat", {"user_id": user, "thread_id": f"t-{user}-1", "message": m})
            print(f"  > {m}\n    {[t['name'] for t in r['tool_calls']]}  {r['reply'][:110]!r}")

    visits = {v["user_id"]: v for v in call(api, "GET", "/admin/visits", token=token)}
    if STAFF_CONFIRMS in visits:
        call(api, "POST", f"/admin/visits/{visits[STAFF_CONFIRMS]['id']}/status", {"status": "confirmed"}, token)

    stats = call(api, "GET", "/admin/stats", token=token)
    leads = call(api, "GET", "/admin/leads", token=token)
    print("\nDONE:", stats)
    for l in leads:
        print(f"  {l['user_id']:9} {l['status']:13} budget={l['budget']} kind={l['kind']} city={l['city']}")
    print("Visits:", [(v["user_id"], v["status"]) for v in call(api, "GET", "/admin/visits", token=token)])


if __name__ == "__main__":
    main()
