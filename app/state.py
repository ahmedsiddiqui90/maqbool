from typing import Annotated, Optional
from typing_extensions import TypedDict
from langgraph.graph.message import add_messages


class LeadState(TypedDict, total=False):
    """Graph state, persisted per thread by the checkpointer.

    Pinned slots (budget, kind, city, timeline) live in typed fields so they survive
    message trimming (L10: pin critical slots in state, window the history).
    """
    messages: Annotated[list, add_messages]
    blocked: bool            # set by guard: injection / off-topic
    block_reason: str        # "injection" | "off_topic"
    budget: Optional[int]    # PKR integer, filled by the qualifier
    kind: Optional[str]      # "car" | "house"
    city: Optional[str]
    timeline: Optional[str]
    qualified: bool          # budget and kind known
    booking_open: bool       # a booking conversation is in progress (router -> booking)
    turn_facts: dict         # facts stated in THIS turn only (input to memory_writer)
