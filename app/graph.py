"""DealCloser graph: qualifier -> closer. Two nodes with distinct roles."""
from dotenv import load_dotenv
from langchain.chat_models import init_chat_model
from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import create_react_agent

from .state import LeadState
from .tools import TOOLS

load_dotenv()
llm = init_chat_model("anthropic:claude-haiku-5-5")


def qualifier(state: LeadState) -> dict:
    """Role 1: work out budget + timeline from the conversation. TODO: structured output."""
    return {"qualified": bool(state.get("budget"))}


closer = create_react_agent(
    llm,
    TOOLS,
    prompt="You are a fast, friendly sales agent for a real-estate/car dealer. "
    "Qualify budget and timeline, recommend listings, and book visits. Stay on topic.",
)

builder = StateGraph(LeadState)
builder.add_node("qualifier", qualifier)
builder.add_node("closer", closer)
builder.add_edge(START, "qualifier")
builder.add_edge("qualifier", "closer")
builder.add_edge("closer", END)

# `langgraph dev` supplies its own persistence; compile with checkpointer/store when serving via FastAPI.
graph = builder.compile()
