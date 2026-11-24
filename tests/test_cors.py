"""CORS configuration (no database needed)."""
from app.api import cors_origins


def test_default_is_wildcard():
    assert cors_origins("") == ["*"]
    assert cors_origins("*") == ["*"]


def test_trailing_slash_spaces_and_quotes_are_stripped():
    assert cors_origins('https://a.vercel.app/') == ["https://a.vercel.app"]
    assert cors_origins('"https://a.vercel.app/", https://b.vercel.app ') == ["https://a.vercel.app", "https://b.vercel.app"]


def test_empty_entries_dropped():
    assert cors_origins("https://a.vercel.app,,") == ["https://a.vercel.app"]
