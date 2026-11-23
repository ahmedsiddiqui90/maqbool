"""FastAPI backend: customer chat + admin endpoints."""
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Maqbool DealCloser")


class ChatIn(BaseModel):
    user_id: str
    thread_id: str
    message: str


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/chat")
def chat(body: ChatIn):
    # TODO: invoke graph with config={"configurable": {"thread_id": body.thread_id, "user_id": body.user_id}}
    return {"reply": "not implemented yet"}


@app.get("/admin/leads")
def leads():
    # TODO: admin dashboard data (leads, status, booked visits)
    return []
