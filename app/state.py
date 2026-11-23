from typing import Annotated, Optional
from typing_extensions import TypedDict
from langgraph.graph.message import add_messages


class LeadState(TypedDict, total=False):
    """Graph state, persisted per thread_id by the checkpointer."""
    messages: Annotated[list, add_messages]
    budget: Optional[int]        # filled by the qualifier
    timeline: Optional[str]      # e.g. "within 2 months"
    qualified: bool
