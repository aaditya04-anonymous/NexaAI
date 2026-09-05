"""Deterministic building blocks for NexaAI's connected intelligence loop.

These helpers intentionally produce structured, reviewable data. Model- and web-backed
enrichment can replace individual fields without changing user-owned relationships.
"""
from datetime import UTC, datetime
import re


def topic_from_task(task: dict) -> str:
    return re.sub(r"^(Learn|Practice|Check understanding):\s*", "", task.get("title", "your current topic"), flags=re.I)


def build_learning(task: dict) -> dict:
    topic = topic_from_task(task)
    return {
        "title": f"Interactive lesson: {topic}",
        "topic": topic,
        "task_id": task["id"],
        "goal_id": task.get("goal_id"),
        "roadmap_phase_id": task.get("roadmap_phase_id"),
        "status": "available",
        "completion_percentage": 0,
        "sections": [
            {"type": "concept", "heading": f"What is {topic}?", "content": f"Start with the core problem that {topic} solves in your current roadmap phase."},
            {"type": "analogy", "heading": "A simple mental model", "content": f"Think of {topic} as a repeatable workflow: understand the input, apply the method, and validate the result."},
            {"type": "flow", "heading": "How it works", "nodes": ["Problem", "Input", topic, "Practice", "Evidence of skill"]},
            {"type": "exercise", "heading": "Mini challenge", "content": f"Explain {topic} in your own words, then apply it to one small example."},
            {"type": "mistakes", "heading": "Common mistakes", "content": "Memorizing terminology without practicing, skipping validation, and moving on before explaining the result."},
        ],
        "video_resources": [],
    }


def build_assessment(learning: dict, difficulty: str = "foundation") -> dict:
    topic = learning["topic"]
    return {"title": f"{topic} check-in", "learning_id": learning["id"], "goal_id": learning.get("goal_id"), "difficulty": difficulty, "status": "available", "questions": [
        {"id": "understanding", "type": "explanation", "prompt": f"In your own words, what problem does {topic} solve?", "rubric": "Names the problem, the approach, and a practical outcome."},
        {"id": "application", "type": "scenario", "prompt": f"Give one practical situation where you would use {topic}.", "rubric": "Connects the topic to a realistic use case."},
    ]}


def evaluate_assessment(assessment: dict, answers: dict[str, str]) -> dict:
    answered = [answer.strip() for answer in answers.values() if answer and answer.strip()]
    score = round(100 * len(answered) / max(1, len(assessment["questions"])))
    if score < 50:
        return {"score": score, "outcome": "revise", "next_action": "Review the lesson analogy and complete one guided example before retrying.", "difficulty_next": "foundation"}
    if score < 100:
        return {"score": score, "outcome": "practice", "next_action": "Complete the missing response, then apply the topic in a short practical exercise.", "difficulty_next": "foundation"}
    return {"score": score, "outcome": "advance", "next_action": "You are ready for a practical challenge or the next roadmap activity.", "difficulty_next": "applied"}


def extract_memories(text: str) -> list[dict]:
    """Extract only explicit durable preferences, goals, strengths, and weaknesses."""
    lower = text.lower()
    rules = [
        ("preference", ("prefer", "learning style", "schedule"), "preference"),
        ("career", ("want to become", "career goal", "target role"), "career_goal"),
        ("weakness", ("struggle", "weakness", "find difficult"), "weakness"),
        ("strength", ("completed", "experienced", "strong at"), "strength"),
    ]
    return [{"category": category, "content": text.strip(), "source": "conversation", "confidence": "explicit"} for _, terms, category in rules if any(term in lower for term in terms)]


def recommendation(profile: dict, goal: dict | None, metrics: dict, weak_area: str | None = None) -> dict:
    focus = weak_area or (goal or {}).get("target_role") or profile.get("profession") or "your current roadmap phase"
    if metrics.get("task_completion_rate", 0) < 50:
        return {"title": f"Protect a focused session for {focus}", "kind": "learning", "why": "Recent completion evidence suggests your current plan needs a smaller, more achievable next action.", "how": "Complete the first learning task, then record a short reflection.", "expected_benefit": "Restores learning momentum with evidence you can build on."}
    return {"title": f"Apply {focus} in a small portfolio artifact", "kind": "project", "why": "You have recent completion evidence and benefit from converting knowledge into demonstrable capability.", "how": "Choose one current concept and publish a concise implementation, explanation, or case study.", "expected_benefit": "Strengthens practical skill and portfolio evidence."}


def safe_news_query(profession: str | None, target_role: str | None) -> str:
    subject = target_role or profession or "technology careers"
    return f"latest authoritative developments and job skills for {subject}"


def weekly_report(metrics: dict, attempts: list[dict]) -> dict:
    scores = [attempt.get("score", 0) for attempt in attempts]
    average = round(sum(scores) / len(scores)) if scores else None
    return {"title": f"Weekly NexaAI report — {datetime.now(UTC).date().isoformat()}", "task_completion_rate": metrics.get("task_completion_rate", 0), "assessment_average": average, "summary": f"You completed {metrics.get('completed_tasks', 0)} tasks. Next, focus on the weakest concept before increasing difficulty."}
