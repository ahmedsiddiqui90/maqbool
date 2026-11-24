# Architecture

Built per `docs/contracts.md`. Only the two agent nodes call the LLM; every other node is
rule-based and costs 0 tokens. Each turn routes to exactly one agent.

```mermaid
flowchart LR
    U[Customer chat / staff dashboard<br/>frontend/, Vite + React] -->|POST /chat| API[FastAPI app/api.py]
    API --> GUARD[guard<br/>rules, 0 tokens]
    GUARD --> QUAL[qualifier<br/>rules: budget/kind/city/timeline]
    QUAL -->|router: pure function| SALES[sales<br/>ReAct agent, Haiku]
    QUAL -->|router| BOOK[booking<br/>ReAct agent, Haiku]
    QUAL -->|router: blocked| REFUSE[refuse<br/>fixed text]
    SALES --> MEM[memory_writer<br/>rules, 0 tokens]
    BOOK --> MEM
    MEM --> END[END]
    REFUSE --> END

    SALES -.tools.-> T1[search_listings]
    SALES -.tools.-> T2[calculate_financing]
    SALES -.tools.-> T3[search_policies]
    BOOK -.tools.-> T1
    BOOK -.tools.-> T4["book_visit (interrupt: yes/no)"]

    MEM <-.-> STORE[(Postgres Store<br/>per user_id)]
    API <-.-> SAVER[(Postgres Saver<br/>per user_id:thread_id)]
    U -->|GET /listings, /admin/*| API
```

| Node | Kind | Job |
|---|---|---|
| `guard` | rules | Injection/off-topic detection (`rules.is_injection`, `is_off_topic`); redacts card/CNIC/phone before anything reaches the model |
| `qualifier` | rules | Parses budget, kind, city, timeline into typed state; handles "forget my …" |
| router | pure function | `rules.route`: blocked → `refuse`; open booking or a book/visit/test-drive message → `booking`; else `sales` |
| `sales` | ReAct (Haiku) | `search_listings`, `calculate_financing`, `search_policies` |
| `booking` | ReAct (Haiku) | `search_listings`, `book_visit` (pauses for the customer's explicit "yes") |
| `refuse` | fixed text | Polite redirect; ends the turn without writing memory |
| `memory_writer` | rules | Four-gate write policy → consolidate (ADD/UPDATE/NOOP/DELETE) → Store |

Tool allow-lists (`tools.ALLOWED`) are enforced in code, not just prompted: the sales agent
cannot call `book_visit`. Each turn runs with `recursion_limit=14`.

## Frontend

`frontend/` is a Vite + React SPA with two routes:

- `/`: customer chat (demo users `ali`, `sana`, `bilal`). It shows which tools ran under each
  reply, and renders the booking confirmation as Yes/No buttons that send "yes"/"no" into the
  same thread. Listings come from `GET /listings`.
- `/staff`: staff dashboard behind `X-Admin-Token`. It covers leads, visits awaiting
  confirmation (confirm/cancel), and per-lead threads and long-term memory (delete a fact).

Product context is in `PRODUCT.md`; the visual system is in `DESIGN.md`.

## Graph as compiled

Real output of `graph.get_graph().draw_mermaid()` (dashed edges are the router's conditional edges):

```mermaid
graph TD;
	__start__([<p>__start__</p>]):::first
	guard(guard)
	qualifier(qualifier)
	sales(sales)
	booking(booking)
	refuse(refuse)
	memory_writer(memory_writer)
	__end__([<p>__end__</p>]):::last
	__start__ --> guard;
	booking --> memory_writer;
	guard --> qualifier;
	qualifier -.-> booking;
	qualifier -.-> refuse;
	qualifier -.-> sales;
	sales --> memory_writer;
	memory_writer --> __end__;
	refuse --> __end__;
	classDef default fill:#f2f0ff,line-height:1.2
	classDef first fill-opacity:0
	classDef last fill:#bfb6fc
```

Regenerate with:

```bash
python -c "from app.graph import graph; print(graph.get_graph().draw_mermaid())"
```
