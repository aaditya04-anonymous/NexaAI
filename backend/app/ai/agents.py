"""Small, composable agent workflows selected by the Personal AI orchestrator."""
from typing import Callable


def goal_planning(context: dict) -> str:
    return "Let’s clarify your target role, current skills, available time, deadline, and preferred learning style before creating a roadmap draft."


def learning_coach(context: dict) -> str:
    lesson = context.get("context_record", {})
    topic = lesson.get("topic", "this concept")
    return f"Let’s work through {topic}: explain the problem it solves, try the mini challenge, then use the assessment to decide whether to revise or advance."


def career_intelligence(context: dict) -> str:
    return "I can explain the verified career update in your context and relate it to your roadmap. I will not infer a current event without a cited source."


def task_planning(context: dict) -> str:
    task = context.get("context_record", {})
    return f"Start with the smallest useful next step for {task.get('title', 'your task')}, then record completion evidence so your plan can adapt."


def progress_analysis(context: dict) -> str:
    return "I’ll use completed tasks, learning evidence, assessments, and projects—not arbitrary percentages—to recommend your next action."


AGENTS: dict[str, Callable[[dict], str]] = {
    "goal": goal_planning,
    "learning": learning_coach,
    "news": career_intelligence,
    "task": task_planning,
    "progress": progress_analysis,
}


def fallback_response(intent: str, context: dict) -> str:
    return AGENTS.get(intent, progress_analysis)(context)
