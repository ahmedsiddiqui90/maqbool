"""Short-term memory: checkpointer keyed by thread_id.
Long-term memory: store keyed by user_id (namespace ('leads', user_id)).
In production swap the in-memory implementations for Postgres/SQLite."""
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.store.memory import InMemoryStore

checkpointer = InMemorySaver()
store = InMemoryStore()
