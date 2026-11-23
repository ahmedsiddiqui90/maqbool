"""Offline ($0, no LLM) precision/recall of app.rules.is_injection() against
deepset/prompt-injections (Apache-2.0, 662 labelled prompts; label 1 = injection).

Usage:
    python benchmark/eval_injection_dataset.py

Reads the cached dataset at benchmark/data/prompt_injections.json (fetched once
from the Hugging Face datasets-server API; see README.md "Data" section for the
source and license) and writes a short report to benchmark/results.md under the
"Injection guard (offline)" heading.
"""

import json
from pathlib import Path

from app.rules import is_injection

ROOT = Path(__file__).resolve().parent.parent
DATASET = ROOT / "benchmark" / "data" / "prompt_injections.json"
RESULTS = ROOT / "benchmark" / "results.md"


def _looks_german(text: str) -> bool:
    """Heuristic only (umlauts / eszett): deepset/prompt-injections pairs each English
    prompt with a German translation. Maqbool's users write English/Roman Urdu, so a
    German miss isn't part of this bot's actual threat surface - reported separately
    rather than folded into the headline recall number."""
    return any(ch in text for ch in "äöüÄÖÜß")


def _score(rows):
    tp = fp = tn = fn = 0
    false_negatives = []
    false_positives = []

    for row in rows:
        actual = bool(row["label"])
        predicted = is_injection(row["text"])
        if predicted and actual:
            tp += 1
        elif predicted and not actual:
            fp += 1
            false_positives.append(row["text"])
        elif not predicted and actual:
            fn += 1
            false_negatives.append(row["text"])
        else:
            tn += 1

    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0

    return {
        "n": len(rows),
        "tp": tp, "fp": fp, "tn": tn, "fn": fn,
        "precision": precision, "recall": recall, "f1": f1,
        "false_positives": false_positives[:10],
        "false_negatives": false_negatives[:10],
    }


def evaluate():
    rows = json.loads(DATASET.read_text(encoding="utf-8"))
    overall = _score(rows)
    english_only = _score([r for r in rows if not _looks_german(r["text"])])
    overall["english_only"] = english_only
    return overall


def write_report(stats):
    lines = [
        "## Injection guard (offline)",
        "",
        f"`app/rules.py::is_injection()` against `deepset/prompt-injections` "
        f"({stats['n']} labelled prompts, label 1 = injection). No LLM calls; $0.",
        "",
        "| Metric | Value |",
        "|---|---|",
        f"| True positives | {stats['tp']} |",
        f"| False positives | {stats['fp']} |",
        f"| True negatives | {stats['tn']} |",
        f"| False negatives | {stats['fn']} |",
        f"| Precision | {stats['precision']:.3f} |",
        f"| Recall | {stats['recall']:.3f} |",
        f"| F1 | {stats['f1']:.3f} |",
        "",
        f"English-only subset (umlaut/eszett heuristic strips the dataset's German "
        f"translations, which aren't Maqbool's threat surface): n={stats['english_only']['n']}, "
        f"recall={stats['english_only']['recall']:.3f}, precision={stats['english_only']['precision']:.3f}.",
        "",
        "Sample false negatives (missed injections) — guard patterns to consider adding:",
        "",
    ]
    for text in stats["false_negatives"][:5]:
        lines.append(f"- {text[:160]!r}")
    lines.append("")
    lines.append("Sample false positives (legitimate text flagged as injection):")
    lines.append("")
    for text in stats["false_positives"][:5]:
        lines.append(f"- {text[:160]!r}")
    lines.append("")

    report = "\n".join(lines) + "\n"

    existing = RESULTS.read_text(encoding="utf-8") if RESULTS.exists() else ""
    marker = "## Injection guard (offline)"
    if marker in existing:
        before, _, after_marker = existing.partition(marker)
        # drop the old section (up to the next "## " heading or end of file)
        rest = after_marker.split("\n## ", 1)
        after = ("\n## " + rest[1]) if len(rest) > 1 else ""
        existing = before + after
    RESULTS.write_text(existing.rstrip("\n") + "\n\n" + report if existing.strip() else report, encoding="utf-8")


if __name__ == "__main__":
    stats = evaluate()
    write_report(stats)
    print(f"n={stats['n']} tp={stats['tp']} fp={stats['fp']} tn={stats['tn']} fn={stats['fn']}")
    print(f"precision={stats['precision']:.3f} recall={stats['recall']:.3f} f1={stats['f1']:.3f}")
    print(f"Report written to {RESULTS}")
