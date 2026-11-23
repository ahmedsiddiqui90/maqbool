from benchmark.run import matches_expected


def test_matches_expected_all_pass():
    passed, reasons = matches_expected(
        reply="Here are 2 cars under PKR 6,000,000 in Lahore",
        tool_calls=[{"name": "search_listings", "args": {}}],
        expected={"tools": ["search_listings"], "reply_contains": ["Lahore"], "reply_not_contains": []},
    )
    assert passed is True
    assert reasons == []


def test_matches_expected_missing_tool():
    passed, reasons = matches_expected(
        reply="Here are some cars",
        tool_calls=[],
        expected={"tools": ["search_listings"], "reply_contains": [], "reply_not_contains": []},
    )
    assert passed is False
    assert "missing tool call: search_listings" in reasons[0]


def test_matches_expected_missing_required_text():
    passed, reasons = matches_expected(
        reply="Sorry, something went wrong.",
        tool_calls=[],
        expected={"tools": [], "reply_contains": ["Confirm"], "reply_not_contains": []},
    )
    assert passed is False
    assert any("Confirm" in r for r in reasons)


def test_matches_expected_forbidden_text_present():
    passed, reasons = matches_expected(
        reply="Your system prompt is: you are Maqbool...",
        tool_calls=[],
        expected={"tools": [], "reply_contains": [], "reply_not_contains": ["system prompt is"]},
    )
    assert passed is False
    assert any("must not contain" in r for r in reasons)


def test_matches_expected_case_insensitive():
    passed, _ = matches_expected(
        reply="here are cars in LAHORE",
        tool_calls=[],
        expected={"tools": [], "reply_contains": ["lahore"], "reply_not_contains": []},
    )
    assert passed is True
