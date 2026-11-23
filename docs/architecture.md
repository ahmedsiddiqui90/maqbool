# Architecture (draft)
Customer page / admin dashboard -> FastAPI -> LangGraph (qualifier -> closer) -> tools (listings DB, visit booking)
Short-term memory: checkpointer by thread_id. Long-term: store by user_id. Safety: injection/off-topic guards + human approval on risky tools.
