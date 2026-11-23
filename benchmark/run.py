"""Benchmark runner: hits the live POST /chat and checks tool names + reply keywords
against tests.json (10 own cases) and benchmark/cases.json (5 attack tests), per
docs/contracts.md. Records pass/fail, latency and tokens, and writes benchmark/results.md.

Usage:
    python benchmark/run.py --base-url http://127.0.0.1:8000
    python benchmark/run.py --base-url http://127.0.0.1:8000 --mode attack
    python benchmark/run.py --ablation-m0-url http://host:8000 --ablation-m4-url http://host:8001

MOCK_LLM=1 dry runs are expected to fail most keyword checks (the mock backend doesn't
know this contract); that's fine for a dry run - it only proves the harness itself works.
The real-LLM run should be done once, against a live, contract-compliant deployment.
"""

import argparse
import json
import time
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parent.parent
OWN_CASES_FILE = ROOT / "tests.json"
ATTACK_CASES_FILE = ROOT / "benchmark" / "cases.json"
RESULTS = ROOT / "benchmark" / "results.md"


def load_cases(mode: str):
    cases = []
    if mode in ("own", "all"):
        cases += [("own", c) for c in json.loads(OWN_CASES_FILE.read_text(encoding="utf-8"))]
    if mode in ("attack", "all"):
        attack = json.loads(ATTACK_CASES_FILE.read_text(encoding="utf-8"))
        cases += [("attack", c) for c in attack.get("attack_tests", [])]
    return cases


def matches_expected(reply: str, tool_calls: list, expected: dict) -> tuple:
    """Pure check, no network - exercised directly by tests/test_benchmark_run.py."""
    reasons = []
    called = {tc["name"] for tc in tool_calls}

    for name in expected.get("tools", []):
        if name not in called:
            reasons.append(f"missing tool call: {name}")

    for needle in expected.get("reply_contains", []):
        if needle.lower() not in reply.lower():
            reasons.append(f"reply missing {needle!r}")

    for needle in expected.get("reply_not_contains", []):
        if needle.lower() in reply.lower():
            reasons.append(f"reply must not contain {needle!r}")

    return (len(reasons) == 0, reasons)


def run_case(client: httpx.Client, base_url: str, case: dict) -> dict:
    start = time.perf_counter()
    tokens_in = tokens_out = 0
    reply = ""
    tool_calls = []
    error = None

    try:
        for turn in case["turns"]:
            resp = client.post(
                f"{base_url}/chat",
                json={
                    "user_id": turn["user_id"],
                    "thread_id": turn["thread_id"],
                    "message": turn["message"],
                },
                timeout=30,
            )
            resp.raise_for_status()
            data = resp.json()
            reply = data.get("reply", "")
            tool_calls = data.get("tool_calls", [])
            usage = data.get("tokens", {})
            tokens_in += usage.get("in", 0)
            tokens_out += usage.get("out", 0)
    except Exception as exc:  # noqa: BLE001 - record as a failed case, don't crash the run
        error = str(exc)

    latency_ms = (time.perf_counter() - start) * 1000

    if error is not None:
        return {
            "id": case["id"], "category": case["category"], "passed": False,
            "reasons": [f"request error: {error}"], "latency_ms": latency_ms,
            "tokens_in": tokens_in, "tokens_out": tokens_out,
        }

    passed, reasons = matches_expected(reply, tool_calls, case["expected"])
    return {
        "id": case["id"], "category": case["category"], "passed": passed,
        "reasons": reasons, "latency_ms": latency_ms,
        "tokens_in": tokens_in, "tokens_out": tokens_out,
    }


def run_all(base_url: str, mode: str) -> list:
    cases = load_cases(mode)
    results = []
    with httpx.Client() as client:
        for source, case in cases:
            result = run_case(client, base_url, case)
            result["source"] = source
            results.append(result)
    return results


def _table(results: list) -> str:
    lines = [
        "| Case | Source | Result | Latency (ms) | Tokens in/out | Notes |",
        "|---|---|---|---|---|---|",
    ]
    for r in results:
        status = "PASS" if r["passed"] else "FAIL"
        notes = "; ".join(r["reasons"]) if r["reasons"] else ""
        lines.append(
            f"| {r['id']} | {r['source']} | {status} | {r['latency_ms']:.0f} | "
            f"{r['tokens_in']}/{r['tokens_out']} | {notes} |"
        )
    passed = sum(1 for r in results if r["passed"])
    lines.append("")
    lines.append(f"**{passed}/{len(results)} passed.**")
    return "\n".join(lines)


def write_results_md(results: list):
    heading = "## Live-agent benchmark"
    section = f"{heading}\n\n{_table(results)}\n"

    existing = RESULTS.read_text(encoding="utf-8") if RESULTS.exists() else ""
    if heading in existing:
        before, _, after_marker = existing.partition(heading)
        rest = after_marker.split("\n## ", 1)
        after = ("\n## " + rest[1]) if len(rest) > 1 else ""
        existing = before + after
    RESULTS.write_text(
        (existing.rstrip("\n") + "\n\n" + section) if existing.strip() else section,
        encoding="utf-8",
    )


def run_ablation(m0_url: str, m4_url: str):
    """Runs the memory-category own cases against two separately-configured deployments
    (M0 = memory writer off, M4 = full memory) and reports where they diverge. This is a
    deployment-level comparison, not a new wire-protocol flag - docs/contracts.md is
    unchanged."""
    own_cases = [c for _, c in load_cases("own") if c["category"] == "memory"]
    with httpx.Client() as client:
        m0 = [run_case(client, m0_url, c) for c in own_cases]
        m4 = [run_case(client, m4_url, c) for c in own_cases]

    print("\n## Memory ablation (M0 vs M4)\n")
    print("| Case | M0 passed | M4 passed |")
    print("|---|---|---|")
    for c, r0, r4 in zip(own_cases, m0, m4):
        print(f"| {c['id']} | {r0['passed']} | {r4['passed']} |")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--mode", choices=["own", "attack", "all"], default="all")
    parser.add_argument("--ablation-m0-url", default=None)
    parser.add_argument("--ablation-m4-url", default=None)
    args = parser.parse_args()

    if args.ablation_m0_url and args.ablation_m4_url:
        run_ablation(args.ablation_m0_url, args.ablation_m4_url)
        return

    results = run_all(args.base_url, args.mode)
    write_results_md(results)
    passed = sum(1 for r in results if r["passed"])
    print(f"{passed}/{len(results)} passed. Report written to {RESULTS}")
    for r in results:
        if not r["passed"]:
            print(f"  FAIL {r['id']}: {'; '.join(r['reasons'])}")


if __name__ == "__main__":
    main()
