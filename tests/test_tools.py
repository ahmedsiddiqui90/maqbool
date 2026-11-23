from app.tools import search_listings


def test_search_respects_budget():
    res = search_listings.invoke({"max_price": 6000000, "kind": "car"})
    assert [r["id"] for r in res] == ["c-002"]
