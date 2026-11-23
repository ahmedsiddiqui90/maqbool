# Maqbool: AI lead closer for real estate / car dealers

Replies to new leads within a minute, qualifies budget and timeline, follows up, and books site visits or test drives.
Built for the AI-4016 Agentic AI hackathon (track 3: DealCloser). Model: `claude-haiku-5-5`.

## Setup
```bash
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env    # add your key; never commit it
uvicorn app.api:app --reload      # backend
langgraph dev                     # graph server + Studio
pytest
```

## Requirements checklist
- [ ] Website: customer page + admin dashboard (`frontend/`) + FastAPI backend (`app/api.py`)
- [ ] LangGraph graph with 2+ nodes of distinct roles (`app/graph.py`)
- [ ] 2+ real tools (`app/tools.py`)
- [ ] Short-term memory by thread_id, trim/summarise (`app/memory.py`)
- [ ] Long-term memory by user_id (`app/memory.py`)
- [ ] Multi-user isolation
- [ ] Safety: off-topic + injection refusal, human approval for risky actions (`app/safety.py`)
- [ ] Benchmark: 10 own cases + 5 attack tests, pass rate here (`benchmark/`)
- [ ] Deploy + public repo: demo GIF, architecture diagram, benchmark table, no API keys

## Benchmark results
_TBD_
