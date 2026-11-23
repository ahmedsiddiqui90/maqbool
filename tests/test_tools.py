from app.tools import search_listings


def test_search_respects_budget():
    res = search_listings.invoke({"max_price": 6000000, "kind": "car"})
    assert "c-002" in [r["id"] for r in res]
    assert all(r["kind"] == "car" and r["price"] <= 6000000 for r in res)
