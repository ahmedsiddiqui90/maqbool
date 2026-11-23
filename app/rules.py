"""Pure rule-based helpers for Maqbool: parsing, routing, safety and memory policy.

Standard library only. No LLM, no database, no network. See docs/contracts.md
section 2 for the exact signatures this file must keep.
"""

import re
from datetime import datetime
from typing import Literal, Optional

ALLOWED_MEMORY_KEYS = {"name", "budget", "kind", "city", "timeline", "contact_pref", "visit_booked"}

_NUM = r"(\d[\d,]*(?:\.\d+)?)"

_CITIES = (
    "lahore", "karachi", "islamabad", "rawalpindi", "faisalabad", "multan",
    "peshawar", "quetta", "sialkot", "gujranwala", "hyderabad", "sargodha",
    "bahawalpur", "sukkur", "larkana", "sheikhupura", "abbottabad",
)

_HOUSE_WORDS = ("house", "apartment", "plot", "flat", "ghar")
_CAR_WORDS = ("car", "gaari", "gari", "vehicle")

_TIMELINE_RE = re.compile(
    r"\b(asap|immediately|right away|"
    r"this week|this month|this year|"
    r"next week|next month|next year|"
    r"within \d+ (?:days?|weeks?|months?)|"
    r"in \d+ (?:days?|weeks?|months?))\b"
)

_INJECTION_PATTERNS = (
    "ignore previous", "ignore all previous", "ignore the above",
    "disregard previous", "disregard all previous", "disregard the above",
    "system prompt", "reveal your prompt", "show your instructions",
    "you are now", "pretend you", "pretend to be", "act as if you",
    "developer mode", "jailbreak", "dan mode",
    "new instructions", "override your instructions",
)

_CROSS_USER_PATTERNS = (
    "another user", "other user", "other users", "someone else's",
    "all users", "every user", "all customers", "other customer",
)

# Regex patterns tuned against deepset/prompt-injections (benchmark/eval_injection_dataset.py).
# Each requires an instruction/role-play word nearby, not just "ignore"/"forget" on its own,
# so ordinary dealer chat ("act as guarantor", "ignore the previous listing") stays unflagged.
_INJECTION_RE = (
    re.compile(r"ignore\b.{0,40}\b(instructions?|orders?|commands?|rules?|directives?|prompts?)\b"),
    re.compile(r"forget\b.{0,30}\b(previous|prior|preceding|everything|all)\b.{0,20}\b(task|instruction|order|prompt|information|rule)"),
    re.compile(r"(remove|leave|discard)\b.{0,30}\b(previous|prior|all)\b.{0,20}\b(task|instruction|information)"),
    re.compile(r"\b(i want you to |you will |please )?act as (if you|a |an )?(dan|chatgpt|an? ai\b|assistant|bot|linux|terminal|debater|different|evil|unfiltered|jailbroken)"),
    re.compile(r"\bnow you are\b"),
    re.compile(r"stay in character|absorbed in (your|his|her) role"),
    re.compile(r"start (over|from scratch) with a new (task|prompt)"),
)

_DOMAIN_WORDS = (
    "car", "cars", "vehicle", "gaari", "gari",
    "house", "property", "apartment", "plot", "flat", "ghar",
    "listing", "listings", "price", "budget", "lakh", "crore",
    "visit", "test drive", "book", "booking", "financing", "finance",
    "loan", "installment", "instalment", "down payment", "policy",
    "warranty", "refund", "documents", "bank",
)

_OFFTOPIC_WORDS = (
    "homework", "essay", "assignment", "recipe", "cook", "politics",
    "election", "write code", "write a program", "programming",
    "weather", "cricket score", "football", "joke", "poem", "song lyrics",
    "math problem", "translate this",
)

_YES_RE = re.compile(r"\b(yes|y|haan|han|ji|confirm|ok|okay|sure|theek hai)\b")
_NO_RE = re.compile(r"\b(no|nahi|cancel|not now)\b")
_BOOKING_WORDS = ("book", "booking", "visit", "test drive", "schedule")

_CNIC_RE = re.compile(r"\d{5}-\d{7}-\d{1}")
_PHONE_RE = re.compile(r"(?:\+92|0)\d{3}[- ]?\d{7}")
_CARD_RE = re.compile(r"(?:\d[ -]?){13,19}")


def _to_number(raw: str) -> float:
    return float(raw.replace(",", ""))


# CUSTOM:
def thread_key(user_id: str, thread_id: str) -> str:
    """Internal checkpointer key: f"{user_id}:{thread_id}"."""
    return f"{user_id}:{thread_id}"


# CUSTOM:
def parse_budget(text: str) -> Optional[int]:
    """PKR integer or None. "50 lakh"->5_000_000, "2 crore"->20_000_000,
    "5.4M"->5_400_000, "60,00,000"->6_000_000, "under 60 lakh"->6_000_000."""
    t = text.lower()

    m = re.search(_NUM + r"\s*crore", t)
    if m:
        return int(_to_number(m.group(1)) * 10_000_000)

    m = re.search(_NUM + r"\s*(?:lakh|lac)s?", t)
    if m:
        return int(_to_number(m.group(1)) * 100_000)

    m = re.search(_NUM + r"\s*(?:million|m)\b", t)
    if m:
        return int(_to_number(m.group(1)) * 1_000_000)

    m = re.search(_NUM, t)
    if m:
        return int(_to_number(m.group(1)))

    return None


# CUSTOM:
def parse_kind_city_timeline(text: str) -> dict:
    """{"kind": "car"|"house"|None, "city": str|None, "timeline": str|None}.
    house also matches apartment/plot/flat/ghar; car also matches gaari/vehicle."""
    t = text.lower()

    kind = None
    if any(w in t for w in _HOUSE_WORDS):
        kind = "house"
    elif any(w in t for w in _CAR_WORDS):
        kind = "car"

    city = None
    for name in _CITIES:
        if re.search(r"\b" + name + r"\b", t):
            city = name.capitalize()
            break

    m = _TIMELINE_RE.search(t)
    timeline = m.group(1) if m else None

    return {"kind": kind, "city": city, "timeline": timeline}


# CUSTOM:
def is_injection(text: str) -> bool:
    """Prompt injection or jailbreak: "ignore previous", "system prompt", "you are now",
    "developer mode", "pretend you", attempts to read another user's data, etc."""
    t = text.lower()
    if any(p in t for p in _INJECTION_PATTERNS):
        return True
    if any(p in t for p in _CROSS_USER_PATTERNS):
        return True
    if any(p.search(t) for p in _INJECTION_RE):
        return True
    return False


# CUSTOM:
def is_off_topic(text: str) -> bool:
    """Clearly unrelated to buying cars or property (homework, code, politics, recipes ...).
    Keep it conservative: when unsure, return False."""
    t = text.lower()
    if any(w in t for w in _DOMAIN_WORDS):
        return False
    if any(w in t for w in _OFFTOPIC_WORDS):
        return True
    return False


# CUSTOM:
def is_yes(text: str) -> bool:
    """yes / y / haan / han / ji / confirm / ok / sure / theek hai."""
    return bool(_YES_RE.search(text.lower()))


# CUSTOM:
def is_no(text: str) -> bool:
    """no / nahi / cancel / not now."""
    return bool(_NO_RE.search(text.lower()))


# CUSTOM:
def route(flags: dict) -> Literal["sales", "booking", "refuse"]:
    """flags = {"blocked": bool, "pending_booking": bool, "message": str}.
    blocked -> "refuse"; pending_booking or a book/visit/test drive message -> "booking";
    anything else -> "sales"."""
    if flags.get("blocked"):
        return "refuse"
    if flags.get("pending_booking"):
        return "booking"
    message = (flags.get("message") or "").lower()
    if any(w in message for w in _BOOKING_WORDS):
        return "booking"
    return "sales"


# CUSTOM:
def redact(text: str) -> str:
    """Mask card numbers, CNIC (12345-1234567-1) and phone numbers as [REDACTED]."""
    text = _CNIC_RE.sub("[REDACTED]", text)
    text = _PHONE_RE.sub("[REDACTED]", text)
    text = _CARD_RE.sub("[REDACTED]", text)
    return text


# CUSTOM:
def passes_write_gates(item: dict) -> bool:
    """item = {"key", "text", "kind", "source", "importance", "valid_from", "valid_to"}.
    True only if key is in ALLOWED_MEMORY_KEYS, source is "user_stated" or "tool_verified",
    text contains nothing redact() would mask, and is_injection(text) is False."""
    if item.get("key") not in ALLOWED_MEMORY_KEYS:
        return False
    if item.get("source") not in ("user_stated", "tool_verified"):
        return False
    text = item.get("text", "")
    if redact(text) != text:
        return False
    if is_injection(text):
        return False
    return True


# CUSTOM:
def consolidate_op(existing: Optional[dict], new: dict) -> Literal["ADD", "UPDATE", "NOOP", "DELETE"]:
    """new.get("forget") -> "DELETE"; no existing -> "ADD";
    same text (case-insensitive) -> "NOOP"; otherwise -> "UPDATE"."""
    if new.get("forget"):
        return "DELETE"
    if existing is None:
        return "ADD"
    if existing.get("text", "").lower() == new.get("text", "").lower():
        return "NOOP"
    return "UPDATE"


def _hours_since(last_access, now: datetime) -> float:
    if isinstance(last_access, str):
        last_access = datetime.fromisoformat(last_access)
    return (now - last_access).total_seconds() / 3600


# CUSTOM:
def score_memory(item: dict, relevance: float, now: datetime,
                  alpha: float = 1, beta: float = 1, gamma: float = 1, decay: float = 0.99) -> float:
    """alpha*decay**hours_since(item["last_access"]) + beta*item["importance"]/10 + gamma*relevance."""
    hours = _hours_since(item["last_access"], now)
    return alpha * (decay ** hours) + beta * (item["importance"] / 10) + gamma * relevance


# CUSTOM:
def rrf(rank_lists: list, k: int = 60) -> list:
    """Reciprocal rank fusion over lists of ids; best first."""
    scores: dict = {}
    for ranked in rank_lists:
        for rank, item_id in enumerate(ranked, start=1):
            scores[item_id] = scores.get(item_id, 0.0) + 1.0 / (k + rank)
    return sorted(scores, key=lambda item_id: scores[item_id], reverse=True)
