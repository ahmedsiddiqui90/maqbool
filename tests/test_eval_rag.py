"""Offline checks for benchmark/eval_rag.py: labels still match the policy docs, metrics are right."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "benchmark"))

import eval_rag  # noqa: E402
from app import rag  # noqa: E402


def test_every_label_names_an_existing_policy_section():
    sections = {eval_rag.section_of(c) for c in rag.load_chunks()}
    for case in json.loads(eval_rag.LABELS.read_text(encoding="utf-8")):
        assert (case["source"], case["section"]) in sections, case


def test_summarise_recall_and_mrr():
    rows = [{"rank": 1}, {"rank": 3}, {"rank": None}, {"rank": 2}]
    s = eval_rag.summarise(rows)
    assert s["r1"] == 0.25
    assert s["r3"] == 0.75
    assert abs(s["mrr"] - (1 + 1 / 3 + 0 + 1 / 2) / 4) < 1e-9
