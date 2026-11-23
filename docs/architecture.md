# Architecture

## Target design (planned, per `docs/contracts.md`)

This is the design the team agreed on — not yet built. `app/graph.py` is currently a 2-node
scaffold (see "Current state" below); Mekkial is building the 7-node version below.

```mermaid
flowchart LR
    U[Customer chat / Vercel frontend] -->|POST /chat| API[FastAPI app/api.py]
    API --> GUARD[guard<br/>rules, 0 tokens]
    GUARD -->|blocked| REFUSE[refuse<br/>fixed text]
    GUARD --> QUAL[qualifier<br/>rules: budget/kind/city/timeline]
    QUAL --> ROUTER[router<br/>pure function]
    ROUTER -->|sales| SALES[sales_agent<br/>create_react_agent, Haiku]
    ROUTER -->|booking| BOOK[booking_agent<br/>create_react_agent, Haiku]
    ROUTER -->|refuse flag| REFUSE
    SALES --> MEM[memory_writer<br/>rules, 0 tokens]
    BOOK --> MEM
    REFUSE --> MEM
    MEM --> END[END]

    SALES -.tools.-> T1[search_listings]
    SALES -.tools.-> T2[calculate_financing]
    SALES -.tools.-> T3[search_policies]
    BOOK -.tools.-> T1
    BOOK -.tools.-> T4["book_visit (interrupt)"]

    MEM <-.-> STORE[(Postgres Store<br/>per user_id)]
    GUARD <-.-> SAVER[(Postgres Saver<br/>per thread_id)]
```

Node summary (full detail in `docs/contracts.md`):

| Node | Kind | Job |
|---|---|---|
| `guard` | rules | Injection/off-topic detection, 0 tokens |
| `qualifier` | rules | Parses budget, kind, city, timeline into state |
| `router` | pure function | Sends to `sales`, `booking` or `refuse` |
| `sales_agent` | ReAct (Haiku) | `search_listings`, `calculate_financing`, `search_policies` |
| `booking_agent` | ReAct (Haiku) | `search_listings`, `book_visit` (interrupts for human "yes") |
| `refuse` | fixed text | Polite redirect |
| `memory_writer` | rules | Four-gate write policy, Store `put`, 0 tokens |

Tool allow-lists (`ALLOWED = {"sales": {...}, "booking": {...}}`) are enforced in code, not just
prompted — the sales agent cannot call `book_visit`.

## Current state (scaffold, as of commit `070af33`)

Real output of `graph.get_graph().draw_mermaid()` against today's `app/graph.py` — a 2-node
qualifier → closer stub, no router, no memory writer, no RAG tool yet:

```mermaid
graph TD;
	__start__([<p>__start__</p>]):::first
	qualifier(qualifier)
	closer(closer)
	__end__([<p>__end__</p>]):::last
	__start__ --> qualifier;
	qualifier --> closer;
	closer --> __end__;
	classDef default fill:#f2f0ff,line-height:1.2
	classDef first fill-opacity:0
	classDef last fill:#bfb6fc
```

Regenerate after the real graph lands:

```bash
python -c "from app.graph import graph; print(graph.get_graph().draw_mermaid())"
```
