"""Per-turn recorder: tool calls and token usage for the /chat response (L8: trace every step).

With an `emit` callback it also reports progress as it happens (model thinking, tool started,
tool finished), which /chat/stream forwards to the browser as server-sent events.
"""
from langchain_core.callbacks import BaseCallbackHandler


class TurnRecorder(BaseCallbackHandler):
    def __init__(self, emit=None) -> None:
        self.tool_calls: list[dict] = []
        self.tokens = {"in": 0, "out": 0}
        self._emit = emit

    def _send(self, event: dict) -> None:
        if self._emit is not None:
            try:
                self._emit(event)
            except Exception:
                pass  # progress reporting must never break the turn

    def on_chat_model_start(self, serialized, messages, **kwargs):
        self._send({"type": "thinking"})

    def on_llm_start(self, serialized, prompts, **kwargs):
        self._send({"type": "thinking"})

    def on_tool_start(self, serialized, input_str, *, inputs=None, **kwargs):
        args = inputs if isinstance(inputs, dict) else {}
        name = (serialized or {}).get("name") or kwargs.get("name", "tool")
        self.tool_calls.append({"name": name, "args": args})
        self._send({"type": "tool", "name": name, "args": args})

    def on_tool_end(self, output, **kwargs):
        self._send({"type": "tool_done", "name": kwargs.get("name") or ""})

    def on_llm_end(self, response, **kwargs):
        for gens in response.generations:
            for g in gens:
                usage = getattr(getattr(g, "message", None), "usage_metadata", None) or {}
                self.tokens["in"] += int(usage.get("input_tokens", 0))
                self.tokens["out"] += int(usage.get("output_tokens", 0))
