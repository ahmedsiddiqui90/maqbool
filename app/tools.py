import json
from pathlib import Path
from langchain_core.tools import tool

DATA = Path(__file__).resolve().parent.parent / "data"


@tool
def search_listings(max_price: int, kind: str = "any") -> list[dict]:
    """Search synthetic property/car listings at or under max_price. kind: 'house', 'car' or 'any'."""
    items = json.loads((DATA / "listings.json").read_text(encoding="utf-8"))
    return [i for i in items if i["price"] <= max_price and kind in ("any", i["kind"])]


@tool
def book_visit(listing_id: str, when: str) -> str:
    """Book a site visit or test drive. Risky/outbound: must be approved by a human (see safety)."""
    # TODO: persist to DB, notify the dealer
    return f"Visit booked for {listing_id} at {when}"


TOOLS = [search_listings, book_visit]
