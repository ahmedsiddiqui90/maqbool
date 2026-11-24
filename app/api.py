"""FastAPI backend: graded /chat + /health, /chat/stream progress events, public /listings, token-protected /admin/*."""
import hmac
import json
import logging
import os
import queue
import threading
from contextlib import asynccontextmanager
from urllib.parse import quote

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, StreamingResponse
from langchain_core.messages import AIMessage, HumanMessage
from langgraph.types import Command
from pydantic import BaseModel

from . import db, memory, rules
from .graph import FALLBACK_REPLY, build_graph
from .trace import TurnRecorder

load_dotenv()
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("maqbool.api")

_graph = None
_store = None


def _warm_rag() -> None:
    try:
        from . import rag
        rag.get_index()
    except Exception:
        log.exception("RAG warm-up failed")


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _graph, _store
    from langgraph.checkpoint.postgres import PostgresSaver
    from langgraph.store.postgres import PostgresStore

    if not db.enabled():
        raise RuntimeError("DATABASE_URL is not set: add it in the host's environment settings")
    try:
        db.init_db()
    except Exception as e:
        log.error("cannot reach the database (check DATABASE_URL): %s: %s", type(e).__name__, e)
        raise
    pool = db.get_pool()
    saver, _store = PostgresSaver(pool), PostgresStore(pool)
    saver.setup()
    _store.setup()
    _graph = build_graph(saver, _store)
    threading.Thread(target=_warm_rag, daemon=True).start()  # don't block /health on model load
    yield


app = FastAPI(title="Maqbool DealCloser", lifespan=lifespan)
def cors_origins(raw: str | None = None) -> list[str]:
    """Parse CORS_ORIGINS. Browsers send Origin without a trailing slash, so
    "https://app.vercel.app/" (a common paste) would never match: strip slashes, spaces and quotes."""
    raw = os.getenv("CORS_ORIGINS", "*") if raw is None else raw
    origins = [o.strip().strip('"').strip("'").rstrip("/") for o in raw.split(",")]
    return [o for o in origins if o] or ["*"]


app.add_middleware(CORSMiddleware, allow_origins=cors_origins(),
                   allow_methods=["*"], allow_headers=["*"])


class ChatIn(BaseModel):
    user_id: str
    thread_id: str
    message: str


def _ident(raw: str) -> str:
    """Injective, ':'-free identifier so (user, thread) keys can never collide across users."""
    return quote(raw.strip()[:128], safe="")


def _reply_text(msg) -> str:
    c = msg.content
    return c if isinstance(c, str) else "".join(b.get("text", "") for b in c if isinstance(b, dict))


@app.get("/health", response_class=PlainTextResponse)
def health():
    return "ok"


@app.post("/chat")
def chat(body: ChatIn):
    return _turn(body, TurnRecorder())


@app.post("/chat/stream")
def chat_stream(body: ChatIn):
    """Same turn as /chat, plus live progress as server-sent events (one JSON object per event):
    {"type":"thinking"} | {"type":"tool","name","args"} | {"type":"tool_done","name"} |
    {"type":"done","result":<exactly the /chat response>}. /chat itself is unchanged."""
    events: queue.Queue = queue.Queue()

    def work():
        try:
            events.put({"type": "done", "result": _turn(body, TurnRecorder(emit=events.put))})
        except Exception:  # _turn already returns a fallback; this is belt and braces
            events.put({"type": "done", "result": {"reply": FALLBACK_REPLY, "tool_calls": [], "tokens": {"in": 0, "out": 0}}})

    threading.Thread(target=work, daemon=True).start()

    def sse():
        while True:
            event = events.get()
            yield "data: " + json.dumps(event, default=str) + "\n\n"
            if event["type"] == "done":
                return

    return StreamingResponse(sse(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


def _turn(body: ChatIn, rec: TurnRecorder) -> dict:
    try:
        uid, tid, message = _ident(body.user_id), _ident(body.thread_id), body.message.strip()[:2000]
        if not uid or not tid or not message:
            return {"reply": "Please send a message.", "tool_calls": [], "tokens": {"in": 0, "out": 0}}
        cfg = {"configurable": {"thread_id": rules.thread_key(uid, tid), "user_id": uid},
               "recursion_limit": 14, "callbacks": [rec]}

        snap = _graph.get_state(cfg)
        pending = next((i for t in snap.tasks for i in t.interrupts), None)
        if pending is not None and not (rules.is_yes(message) or rules.is_no(message)):
            # A booking is waiting for confirmation: re-ask instead of guessing (0 tokens).
            return {"reply": f"I still need your confirmation. {pending.value['question']}",
                    "tool_calls": [], "tokens": {"in": 0, "out": 0}}
        inp = Command(resume=message) if pending is not None else {"messages": [HumanMessage(content=message)]}
        out = _graph.invoke(inp, cfg)

        if out.get("__interrupt__"):
            payload = out["__interrupt__"][0].value
            reply = payload["question"]
        else:
            reply = _reply_text(next(m for m in reversed(out["messages"]) if isinstance(m, AIMessage)))

        try:  # dashboard bookkeeping must never break the chat turn
            db.touch_thread(uid, tid)
            db.upsert_lead(uid, tid, _graph.get_state(cfg).values, rules.redact(message))
        except Exception:
            log.exception("lead upsert failed")
        return {"reply": reply, "tool_calls": rec.tool_calls, "tokens": rec.tokens}
    except Exception:
        log.exception("chat failed")
        return {"reply": FALLBACK_REPLY, "tool_calls": [], "tokens": {"in": 0, "out": 0}}


@app.get("/listings")
def listings():
    return db.list_listings()


# ---- admin (X-Admin-Token) -------------------------------------------------------------------

def admin(x_admin_token: str | None = Header(default=None)):
    expected = os.getenv("ADMIN_TOKEN", "")
    if not expected or not x_admin_token or not hmac.compare_digest(x_admin_token, expected):
        raise HTTPException(status_code=401, detail="unauthorized")


class StatusIn(BaseModel):
    status: str


@app.get("/admin/stats", dependencies=[Depends(admin)])
def admin_stats():
    return db.stats()


@app.get("/admin/leads", dependencies=[Depends(admin)])
def admin_leads():
    return db.list_leads()


@app.get("/admin/visits", dependencies=[Depends(admin)])
def admin_visits():
    return db.list_visits()


@app.post("/admin/visits/{visit_id}/status", dependencies=[Depends(admin)])
def admin_visit_status(visit_id: int, body: StatusIn):
    if body.status not in ("confirmed", "cancelled"):
        raise HTTPException(status_code=422, detail="status must be confirmed or cancelled")
    visit = db.set_visit_status(visit_id, body.status)
    if visit is None:
        raise HTTPException(status_code=404, detail="visit not found")
    return visit


@app.get("/admin/threads/{user_id}", dependencies=[Depends(admin)])
def admin_threads(user_id: str):
    uid, out = _ident(user_id), []
    for t in db.list_threads(uid):
        cfg = {"configurable": {"thread_id": rules.thread_key(uid, t["thread_id"])}}
        msgs = _graph.get_state(cfg).values.get("messages", [])
        out.append({**t, "messages": [
            {"role": "user" if isinstance(m, HumanMessage) else "ai", "content": _reply_text(m)}
            for m in msgs if isinstance(m, (HumanMessage, AIMessage))]})
    return out


@app.get("/admin/memory/{user_id}", dependencies=[Depends(admin)])
def admin_memory(user_id: str):
    return memory.list_memories(_store, _ident(user_id), include_history=True)


@app.delete("/admin/memory/{user_id}/{key}", dependencies=[Depends(admin)])
def admin_memory_delete(user_id: str, key: str):
    _store.delete(memory.ns(_ident(user_id)), key)
    return {"deleted": True}
