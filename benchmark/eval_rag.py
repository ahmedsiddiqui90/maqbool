"""Offline retrieval check for search_policies (L9 metrics, $0, no LLM calls).

Runs each hand-labelled question in benchmark/data/rag_eval.json through app.rag's ranking
and reports Recall@1, Recall@3 and MRR for the expected policy section. Labels name the file
and '## heading', not chunk numbers, so they survive edits to the policy docs.

    python benchmark/eval_rag.py               # BM25 + dense, as deployed (downloads bge-small once)
    python benchmark/eval_rag.py --bm25-only   # BM25 only, as with DISABLE_EMBEDDINGS=1

Writes/replaces its section in benchmark/results.md.
"""
import argparse
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
LABELS = ROOT / "benchmark" / "data" / "rag_eval.json"
RESULTS = ROOT / "benchmark" / "results.md"
HEADER = "## Policy retrieval (offline)"


def section_of(chunk: dict) -> tuple[str, str]:
    """('warranty.md', 'Cars') from a chunk whose text starts 'Warranty - Cars\\n...'."""
    first = chunk["text"].split("\n", 1)[0]
    return chunk["source"], first.split(" - ", 1)[-1].strip()


def evaluate(cases: list[dict]) -> tuple[list[dict], str]:
    from app import rag

    idx = rag.get_index()
    mode = "BM25 + dense (bge-small), RRF" if idx["vecs"] is not None else "BM25 only"
    rows = []
    for c in cases:
        ranked = [section_of(h) for h in rag.search(c["q"], k=len(idx["chunks"]))]
        want = (c["source"], c["section"])
        rank = ranked.index(want) + 1 if want in ranked else None
        rows.append({**c, "rank": rank, "top1": "{} :: {}".format(*ranked[0]) if ranked else "-"})
    return rows, mode


def summarise(rows: list[dict]) -> dict:
    n = len(rows)
    hit = lambda k: sum(1 for r in rows if r["rank"] and r["rank"] <= k) / n
    return {"n": n, "r1": hit(1), "r3": hit(3), "mrr": sum(1 / r["rank"] for r in rows if r["rank"]) / n}


def report(rows: list[dict], mode: str, s: dict) -> str:
    lines = [
        HEADER, "",
        f"`app.rag.search` on {s['n']} hand-labelled questions (`benchmark/data/rag_eval.json`), "
        f"retrieval mode: **{mode}**. No LLM calls; $0. Run: `python benchmark/eval_rag.py`.", "",
        "| Metric | Value |", "|---|---|",
        f"| Recall@1 | {s['r1']:.2f} |", f"| Recall@3 | {s['r3']:.2f} |", f"| MRR | {s['mrr']:.2f} |", "",
        "| Question | Expected section | Rank | Top hit |", "|---|---|---|---|",
    ]
    for r in rows:
        lines.append(f"| {r['q']} | {r['source']} :: {r['section']} | {r['rank'] or 'miss'} | {r['top1']} |")
    return "\n".join(lines) + "\n"


def write_results(section: str) -> None:
    text = RESULTS.read_text(encoding="utf-8") if RESULTS.exists() else ""
    if HEADER in text:
        before, rest = text.split(HEADER, 1)
        after = rest.split("\n## ", 1)
        text = before.rstrip("\n") + ("\n\n## " + after[1] if len(after) > 1 else "")
    RESULTS.write_text(text.rstrip("\n") + "\n\n" + section, encoding="utf-8")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--bm25-only", action="store_true", help="skip dense embeddings (DISABLE_EMBEDDINGS=1)")
    ap.add_argument("--no-write", action="store_true", help="print only; leave results.md untouched")
    args = ap.parse_args()
    if args.bm25_only:
        os.environ["DISABLE_EMBEDDINGS"] = "1"

    rows, mode = evaluate(json.loads(LABELS.read_text(encoding="utf-8")))
    s = summarise(rows)
    out = report(rows, mode, s)
    print(out)
    if not args.no_write:
        write_results(out)


if __name__ == "__main__":
    main()
