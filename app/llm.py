"""Model factory. MOCK_LLM=1 swaps in a scripted offline model so UI/tests cost $0."""
import os
import re

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.outputs import ChatGeneration, ChatResult

from . import rules


def get_llm() -> BaseChatModel:
    if os.getenv("MOCK_LLM") == "1":
        return MockChat()
    from langchain_anthropic import ChatAnthropic
    return ChatAnthropic(
        model=os.getenv("MODEL", "claude-haiku-5-5"),
        max_tokens=400, max_retries=2, timeout=30,
    )


class MockChat(BaseChatModel):
    """Keyword-scripted stand-in that exercises tools, memory and the booking interrupt."""

    @property
    def _llm_type(self) -> str:
        return "mock"

    def bind_tools(self, tools, **kwargs):
        return self

    def _generate(self, messages, stop=None, run_manager=None, **kwargs) -> ChatResult:
        msg = self._respond(messages)
        msg.usage_metadata = {"input_tokens": 100, "output_tokens": 20, "total_tokens": 120}
        return ChatResult(generations=[ChatGeneration(message=msg)])

    @staticmethod
    def _call(name: str, args: dict) -> AIMessage:
        return AIMessage(content="", tool_calls=[{"name": name, "args": args, "id": f"call_{name}"}])

    def _respond(self, messages) -> AIMessage:
        last = messages[-1]
        if isinstance(last, ToolMessage):
            c = str(last.content)
            if c.startswith("BOOKED"):
                return AIMessage(content=f"Done. Your visit is booked. {c[7:]}")
            if c.startswith("Not confirmed"):
                return AIMessage(content="No problem, I have not booked anything.")
            if c.startswith("POLICY"):
                return AIMessage(content="According to our policy [1]: " + c.split("\n\n", 1)[-1][:160])
            if "Monthly installment" in c:
                return AIMessage(content=c)
            return AIMessage(content=("Here are some options in PKR: " + c[:260]) if c != "[]" else "I could not find a match.")
        text = str(last.content)
        t = text.lower()
        system = next((str(m.content) for m in messages if isinstance(m, SystemMessage)), "")
        if re.search(r"book|visit|test drive", t):
            lid = re.search(r"\b[ch]-\d{3}\b", t)
            when = re.search(r"\b(?:on|at|for)\s+((?:mon|tues|wednes|thurs|fri|satur|sun)day.*|tomorrow.*)$", t)
            if lid and when:
                return self._call("book_visit", {"listing_id": lid.group(0), "when": when.group(1)})
            return AIMessage(content="Which listing id and what day and time would you like?")
        if re.search(r"installment|emi|monthly", t):
            price = rules.parse_budget(text.replace("20%", "")) or 6_000_000
            return self._call("calculate_financing", {"price": price, "down_payment_pct": 20, "years": 5})
        if re.search(r"document|policy|policies|warranty|refund|insurance|extended|financing terms", t):
            return self._call("search_policies", {"query": text})
        if "budget" in t and re.search(r"what|remind|again", t):
            m = re.search(r"Budget is [^\n\[]+", system)
            if m:
                return AIMessage(content=f"Your {m.group(0).lower()}.")
            earlier = [str(x.content) for x in messages if isinstance(x, HumanMessage) and "budget is" in str(x.content).lower()]
            m = re.search(r"\d[\d.,]*\s*(?:lakh|crore)", earlier[-1], re.I) if earlier else None
            return AIMessage(content=f"Your budget is {m.group(0)}." if m else "I don't have your budget yet. What is it?")
        if re.search(r"car|house|plot|apartment|under|budget|listing", t):
            kind = "house" if re.search(r"house|plot|apartment", t) else "car"
            return self._call("search_listings", {"max_price": rules.parse_budget(text) or 10**9, "kind": kind})
        return AIMessage(content="Hello! Tell me your budget and whether you want a car or a house.")
