# Team Contracts: Read Before Coding

This is the **single source of truth** for everything that crosses between people:

- the API Ahmed's site calls
- the functions Zarpash writes and Mekkial calls
- the data files Zarpash produces

**Rules:**
1. Build against these exact names and shapes. Don't guess.
2. Something wrong, missing or unclear? **Post it in the group chat first.** Don't silently change your side.
3. A contract change lands in a PR that edits this file and tags all three of us. Nobody merges their own contract change.
4. Open questions are listed at the bottom. Reply with 👍 or your objection by **10:40 today**. Silence counts as 👍.

---

## 1. Agent API (Mekkial builds; Ahmed and the graders call it)

### `GET /health`
Plain text, status 200, body `ok`. Not JSON.

### `POST /chat` (no login)
The grader fixed this format, so **don't add or rename top-level keys**.

Request:
```json
{"user_id": "ali", "thread_id": "t-1732370000", "message": "I want a car under 60 lakh in Lahore"}
```

Response (always status 200, even on internal errors):
```json
{
  "reply": "Here are 2 cars under PKR 6,000,000 in Lahore: ...",
  "tool_calls": [
    {"name": "search_listings", "args": {"max_price": 6000000, "kind": "car", "city": "Lahore"}}
  ],
  "tokens": {"in": 812, "out": 143}
}
```

- **`tool_calls`:** every tool the agent called this turn, in order. Each entry has exactly `name` and `args`, and the list is `[]` when no tool ran. Tool names are `search_listings`, `calculate_financing`, `search_policies` and `book_visit`.
- **`tokens`:** the sum for this turn only. Refused or blocked turns return `{"in": 0, "out": 0}`.
- **Booking flow:**
  1. On turn 1, `tool_calls` contains `book_visit`, and the reply asks *"Confirm visit to … at …? (yes/no)"*. Nothing is saved yet.
  2. On turn 2, the user replies "yes" or "no" in the **same thread**. The reply then says the visit is booked or cancelled. The frontend just shows the reply.
- **Errors:** the reply is a friendly message such as `"Sorry, something went wrong. Please try again."` with empty `tool_calls` and zero tokens.

### `GET /listings` (public; used by the customer page grid)
```json
[{"id": "c-002", "kind": "car", "title": "2019 Honda Civic, 45k km", "city": "Lahore", "price": 5400000, "details": "Automatic, petrol, white"}]
```

### Admin endpoints
Every admin request needs the header `X-Admin-Token: <ADMIN_TOKEN>`. Without it the API returns `401 {"detail": "unauthorized"}`. The token is shared privately and never committed.

| Method and path | Response |
|---|---|
| `GET /admin/stats` | `{"leads": 12, "qualified": 7, "visits_booked": 4, "conversion_rate": 0.33}` |
| `GET /admin/leads` | `[{"user_id": "ali", "last_thread_id": "t-1", "budget": 6000000, "kind": "car", "city": "Lahore", "timeline": "this month", "status": "qualified", "last_message": "...", "updated_at": "2026-11-23T21:04:00Z"}]` |
| `GET /admin/visits` | `[{"id": 3, "user_id": "ali", "listing_id": "c-002", "listing_title": "2019 Honda Civic", "when": "Saturday 11am", "status": "booked", "created_at": "..."}]` |
| `POST /admin/visits/{id}/status`, body `{"status": "confirmed" \| "cancelled"}` | the updated visit object |
| `GET /admin/threads/{user_id}` | `[{"thread_id": "t-1", "updated_at": "...", "messages": [{"role": "user", "content": "..."}, {"role": "ai", "content": "..."}]}]` |
| `GET /admin/memory/{user_id}` | `[{"key": "budget", "text": "Budget is PKR 6,000,000", "kind": "semantic", "source": "user_stated", "importance": 8, "valid_from": "2026-11-23", "valid_to": null}]` |
| `DELETE /admin/memory/{user_id}/{key}` | `{"deleted": true}` |

Field notes:
- **Lead `status`:** `"new"`, `"qualified"` (budget and kind are known) or `"visit_booked"`.
- **Visit `status`:** `"booked"` (the user said yes), `"confirmed"` (the admin approved it) or `"cancelled"`.
- **Money:** every amount is an **integer in PKR**, with no strings and no lakh units. The frontend formats it for display.
- **`thread_id`:** always the client's own id. The backend's internal `user_id:thread_id` key is never exposed.

### Demo users (for the site switcher and the tests)
`ali`, `sana`, `bilal`. Each new conversation uses `thread_id = "t-" + Date.now()`.

---

## 2. `app/rules.py` (Zarpash writes; Mekkial calls)

Requirements for this file:
- Pure functions only: **standard library only**, no LLM, no database, no network.
- Mark every function `# CUSTOM:`.
- Each function gets tests in `tests/test_rules.py`.

```python
from datetime import datetime
from typing import Literal

ALLOWED_MEMORY_KEYS = {"name", "budget", "kind", "city", "timeline", "contact_pref", "visit_booked"}

def thread_key(user_id: str, thread_id: str) -> str:
    """Internal checkpointer key: f"{user_id}:{thread_id}"."""

def parse_budget(text: str) -> int | None:
    """PKR integer or None. "50 lakh"->5_000_000, "2 crore"->20_000_000,
    "5.4M"->5_400_000, "60,00,000"->6_000_000, "under 60 lakh"->6_000_000."""

def parse_kind_city_timeline(text: str) -> dict:
    """{"kind": "car"|"house"|None, "city": str|None, "timeline": str|None}.
    house also matches apartment/plot/flat/ghar; car also matches gaari/vehicle."""

def is_injection(text: str) -> bool:
    """Prompt injection or jailbreak: "ignore previous", "system prompt", "you are now",
    "developer mode", "pretend you", attempts to read another user's data, etc."""

def is_off_topic(text: str) -> bool:
    """Clearly unrelated to buying cars or property (homework, code, politics, recipes ...).
    Keep it conservative: when unsure, return False."""

def is_yes(text: str) -> bool:
    """yes / y / haan / han / ji / confirm / ok / sure / theek hai."""

def is_no(text: str) -> bool:
    """no / nahi / cancel / not now."""

def route(flags: dict) -> Literal["sales", "booking", "refuse"]:
    """flags = {"blocked": bool, "pending_booking": bool, "message": str}.
    blocked -> "refuse"; pending_booking or a book/visit/test drive message -> "booking";
    anything else -> "sales"."""

def redact(text: str) -> str:
    """Mask card numbers, CNIC (12345-1234567-1) and phone numbers as [REDACTED]."""

def passes_write_gates(item: dict) -> bool:
    """item = {"key", "text", "kind", "source", "importance", "valid_from", "valid_to"}.
    True only if key is in ALLOWED_MEMORY_KEYS, source is "user_stated" or "tool_verified",
    text contains nothing redact() would mask, and is_injection(text) is False."""

def consolidate_op(existing: dict | None, new: dict) -> Literal["ADD", "UPDATE", "NOOP", "DELETE"]:
    """new.get("forget") -> "DELETE"; no existing -> "ADD";
    same text (case-insensitive) -> "NOOP"; otherwise -> "UPDATE"."""

def score_memory(item: dict, relevance: float, now: datetime,
                 alpha: float = 1, beta: float = 1, gamma: float = 1, decay: float = 0.99) -> float:
    """alpha*decay**hours_since(item["last_access"]) + beta*item["importance"]/10 + gamma*relevance."""

def rrf(rank_lists: list[list[str]], k: int = 60) -> list[str]:
    """Reciprocal rank fusion over lists of ids; best first."""
```

---

## 3. Data files (Zarpash produces; Mekkial loads them)

- **`data/listings.json`:** a list of `{"id", "kind", "title", "city", "price", "details"}`.
  - Ids look like `c-001` for cars and `h-001` for houses.
  - `price` is an integer in PKR.
  - Keep `c-002` as the 2019 Honda Civic at 5,400,000 PKR, because an existing test depends on it.
- **`data/policies/*.md`:** short markdown files, one topic each, with `#`/`##` headings. One of them is `data/policies/_redteam.md`, which contains the planted injection line.
- **`tests.json`:** `[{"id", "category", "turns": [{"user_id", "thread_id", "message"}], "expected": {"tools": [...], "reply_contains": [...], "reply_not_contains": [...]}}]`.

---

## 4. Open questions: reply in the group chat by 10:40

1. Is the visit status flow `booked` → `confirmed`/`cancelled` (admin) OK?
2. Is it OK to drop extra keys such as `pending_confirmation` from `/chat`, given the grader format is strict and the frontend reads the reply text instead?
3. Are the demo user ids `ali`, `sana` and `bilal` OK?
4. Is any function missing from `rules.py` that you'll need?
