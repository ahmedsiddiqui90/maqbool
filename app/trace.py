"""Per-turn recorder: tool calls and token usage for the /chat response (L8: trace every step)."""
from langchain_core.callbacks import BaseCallbackHandler


class TurnRecorder(BaseCallbackHandler):
    def __init__(self) -> None:
        self.tool_calls: list[dict] = []
        self.tokens = {"in": 0, "out": 0}

    def on_tool_start(self, serialized, input_str, *, inputs=None, **kwargs):
        args = inputs if isinstance(inputs, dict) else {}
        self.tool_calls.append({"name": (serialized or {}).get("name") or kwargs.get("name", "tool"), "args": args})

    def on_llm_end(self, response, **kwargs):
        for gens in response.generations:
            for g in gens:
                usage = getattr(getattr(g, "message", None), "usage_metadata", None) or {}
                self.tokens["in"] += int(usage.get("input_tokens", 0))
                self.tokens["out"] += int(usage.get("output_tokens", 0))
