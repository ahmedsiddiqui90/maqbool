"""Guards: off-topic refusal, prompt-injection screening, human approval for risky tools."""

RISKY_TOOLS = {"book_visit"}  # require human approval via interrupt()


def looks_like_injection(text: str) -> bool:
    t = text.lower()
    return any(p in t for p in ("ignore previous", "ignore all previous", "system prompt", "you are now"))
