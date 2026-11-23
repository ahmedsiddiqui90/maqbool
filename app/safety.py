"""Guards: off-topic refusal, prompt-injection screening, human approval for risky tools.

The actual pattern matching lives in app/rules.py (pure, tested). This module holds the
policy: which tools are risky and what we say when we refuse.
"""
from . import rules

RISKY_TOOLS = {"book_visit"}  # require human approval via interrupt()

REFUSAL_INJECTION = (
    "I can't help with that. I'm Maqbool, a sales assistant for cars and property. "
    "Tell me your budget and what you're looking for, and I'll find you options."
)
REFUSAL_OFF_TOPIC = (
    "I can only help with buying cars and property: listings, financing, dealer policies "
    "and booking visits. What are you looking for?"
)


def screen(text: str) -> str | None:
    """Return a block reason ("injection" | "off_topic") or None if the message is fine."""
    if rules.is_injection(text):
        return "injection"
    if rules.is_off_topic(text):
        return "off_topic"
    return None


def refusal_text(reason: str) -> str:
    return REFUSAL_INJECTION if reason == "injection" else REFUSAL_OFF_TOPIC
