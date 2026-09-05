"""Modular LangGraph workflow; privileged user id is injected by the API, never by model input."""
from typing import TypedDict
from langgraph.graph import END, START, StateGraph
from ..core.config import get_settings


class AgentState(TypedDict, total=False):
    user_id: str
    message: str
    context: dict
    intent: str
    sources: list[dict]
    response: str


def classify(state: AgentState) -> AgentState:
    text = state["message"].lower()
    intent = "web" if any(token in text for token in ("latest", "recent", "current", "today", "internship")) else "general"
    if any(token in text for token in ("document", "resume", "pdf", "file")): intent = "document"
    return {"intent": intent}


def route(state: AgentState) -> str: return state["intent"]


def answer(state: AgentState) -> AgentState:
    context = state.get("context", {})
    settings = get_settings()
    if not settings.gemini_api_key:
        return {"response": "AI responses are not configured yet. Set GEMINI_API_KEY on the backend and try again.", "sources": []}
    from langchain_google_genai import ChatGoogleGenerativeAI
    profile = context.get("profile", {})
    safe_profile = {key: value for key, value in profile.items() if key in {"name", "career_field", "target_career", "skills", "interests", "communication_style"}}
    prompt = ("You are Nexa, a supportive personal growth AI. You are an AI, not a person. "
                "Use only supplied user context for claims about the user. State uncertainty plainly; do not fabricate progress, sources, or document content. "
                "For high-stakes medical, legal, mental-health, or financial requests, provide general safety-oriented guidance and encourage qualified help. "
                f"User profile: {safe_profile}\nUser request: {state['message']}")
    model = ChatGoogleGenerativeAI(model=settings.gemini_model, google_api_key=settings.gemini_api_key, temperature=0.3)
    response = model.invoke(prompt)
    return {"response": str(response.content), "sources": []}


def build_graph():
    graph = StateGraph(AgentState)
    graph.add_node("classify_intent", classify)
    graph.add_node("generate_response", answer)
    graph.add_edge(START, "classify_intent")
    graph.add_conditional_edges("classify_intent", route, {"general": "generate_response", "web": "generate_response", "document": "generate_response"})
    graph.add_edge("generate_response", END)
    return graph.compile()
