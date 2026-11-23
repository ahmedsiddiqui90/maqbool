"""The four real tools. Identity (user_id) comes from the run config, never from tool arguments."""
from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool
from langgraph.types import interrupt

from . import db, rag, rules


def _user_id(config: RunnableConfig) -> str:
    return config["configurable"]["user_id"]


@tool
def search_listings(max_price: int, kind: str = "any", city: str = "") -> list[dict]:
    """Search car/house listings at or under max_price (integer PKR, e.g. 6000000 = 60 lakh).
    kind: 'car', 'house' or 'any'. city: optional exact city name such as 'Lahore'.
    Returns up to 5 listings with id, title, city, price and details."""
    if kind not in ("any", "car", "house"):
        kind = "any"
    return db.search_listings(int(max_price), kind, city.strip())


@tool
def calculate_financing(price: int, down_payment_pct: float = 20, years: int = 5,
                        annual_rate_pct: float = 18) -> str:
    """Exact monthly installment (EMI) for financing a car or property. price in PKR,
    down_payment_pct 0-90 (policy minimum: 20% cars, 30% property), years 1-20,
    annual_rate_pct default 18. Always use this tool for installment maths."""
    if price <= 0 or not (0 <= down_payment_pct < 100) or not (1 <= years <= 20) or not (0 <= annual_rate_pct <= 40):
        return "Invalid inputs: price must be > 0, down payment 0-99%, years 1-20, rate 0-40%."
    down = price * down_payment_pct / 100
    loan = price - down
    n, r = years * 12, annual_rate_pct / 100 / 12
    emi = loan / n if r == 0 else loan * r / (1 - (1 + r) ** -n)
    return (
        f"Price PKR {price:,.0f}; down payment PKR {down:,.0f} ({down_payment_pct:g}%); "
        f"loan PKR {loan:,.0f} at {annual_rate_pct:g}% for {years} years ({n} months). "
        f"Monthly installment: PKR {emi:,.0f}. Total payable: PKR {emi * n + down:,.0f}."
    )


@tool
def search_policies(query: str) -> str:
    """Search the dealer's policy documents (financing terms, documents required, test drives and
    site visits, token money and refunds, warranty). Returns numbered passages [1], [2] to cite."""
    return rag.format_passages(rag.search(query, k=3))


@tool
def book_visit(listing_id: str, when: str, config: RunnableConfig) -> str:
    """Book a test drive (cars) or site visit (property) for a listing at a given time, e.g.
    'Saturday 11am'. The customer is asked to confirm before anything is saved."""
    listing = db.get_listing(listing_id.strip())
    if listing is None:
        return f"Unknown listing '{listing_id}'. Use search_listings to find a valid listing id."
    when = when.strip()
    if not when:
        return "I need a day and time for the visit."
    # Human approval: pauses the graph. Nothing is written unless the customer says yes.
    answer = interrupt({
        "question": f"Confirm visit to {listing['title']} ({listing['id']}) at {when}? (yes/no)",
        "tool_call": {"name": "book_visit", "args": {"listing_id": listing["id"], "when": when}},
    })
    if rules.is_yes(str(answer)):
        visit_id = db.create_visit(_user_id(config), listing, when)
        return f"BOOKED visit #{visit_id}: {listing['title']} ({listing['id']}) at {when}."
    return "Not confirmed. No visit was booked."


# L8: least privilege per agent, enforced in code (a prompt is a request, a filter is a guarantee).
ALL_TOOLS = [search_listings, calculate_financing, search_policies, book_visit]
ALLOWED = {
    "sales": {"search_listings", "calculate_financing", "search_policies"},
    "booking": {"search_listings", "book_visit"},
}


def tools_for(agent: str) -> list:
    return [t for t in ALL_TOOLS if t.name in ALLOWED[agent]]
