"""Connected career-loop services. Pure planning helpers remain deterministic and testable."""
from datetime import date


DISCOVERY_QUESTIONS = (
    "What is motivating this career goal?",
    "What relevant experience, skills, and projects do you already have?",
    "How much time can you realistically learn on most days?",
    "What deadline, learning style, and technologies do you prefer?",
)


def discussion_reply(existing_answers: int) -> str:
    if existing_answers >= len(DISCOVERY_QUESTIONS):
        return "Thanks — I have enough context to prepare a draft roadmap. Review it, adjust any phase, then finalize it when it fits your plan."
    return f"I’ve noted that. Before I draft a roadmap, {DISCOVERY_QUESTIONS[existing_answers]}"


def build_roadmap(goal: dict, profile: dict) -> list[dict]:
    """Create a personalized draft from stated gaps; it is never finalized automatically."""
    current = {skill.casefold() for skill in profile.get("current_skills", profile.get("skills", []))}
    target = list(dict.fromkeys(goal.get("preferred_technologies", []) + profile.get("target_skills", [])))
    target_role = goal.get("target_role") or profile.get("target_career") or goal["title"]
    candidates = target or ["role foundations", "portfolio project", "career preparation"]
    gaps = [skill for skill in candidates if skill.casefold() not in current]
    phases = []
    for position, skill in enumerate(gaps[:8], start=1):
        phases.append({"order": position, "title": f"{skill} for {target_role}", "description": f"Build practical capability in {skill}, connected to your target role.", "skills": [skill], "estimated_minutes": 600, "priority": "high" if position <= 2 else "medium", "status": "not_started"})
    if not phases:
        phases.append({"order": 1, "title": f"Portfolio project for {target_role}", "description": "Apply your existing skills in a demonstrable project.", "skills": [], "estimated_minutes": 900, "priority": "high", "status": "not_started"})
    return phases


def plan_daily_tasks(phase: dict, available_minutes: int, due_date: date) -> list[dict]:
    """Budget tasks instead of assigning a fixed count; keep assessment coupled to learning."""
    topic, budget = phase["title"], max(15, available_minutes)
    allocations = [("learning", "Learn", min(45, max(15, budget // 2))), ("practice", "Practice", min(45, max(0, budget - 20))), ("assessment", "Check understanding", min(20, max(0, budget - 90)))]
    tasks, remaining = [], budget
    for kind, verb, minutes in allocations:
        minutes = min(minutes, remaining)
        if minutes < 10:
            continue
        tasks.append({"title": f"{verb}: {topic}", "description": f"A {kind} activity generated from your current roadmap phase.", "task_type": kind, "priority": phase.get("priority", "medium"), "difficulty": "adaptive", "estimated_minutes": minutes, "due_date": due_date.isoformat(), "status": "planned", "completion_percentage": 0, "generated_by_ai": True})
        remaining -= minutes
    return tasks


def calculate_progress(tasks: list[dict], phases: list[dict]) -> dict:
    completed = [task for task in tasks if task.get("status") == "completed"]
    task_progress = round(sum(task.get("completion_percentage", 0) for task in tasks) / len(tasks)) if tasks else 0
    phase_progress = round(sum(100 if phase.get("status") == "completed" else 0 for phase in phases) / len(phases)) if phases else 0
    return {"task_completion_rate": round(100 * len(completed) / len(tasks)) if tasks else 0, "task_progress": task_progress, "roadmap_progress": phase_progress, "goal_progress": round(task_progress * .6 + phase_progress * .4)}


def insight(progress: dict, current_phase: dict | None) -> str:
    if not current_phase:
        return "Start a goal discussion so NexaAI can understand your destination before proposing a roadmap."
    if progress["task_completion_rate"] < 50:
        return f"Your current focus is {current_phase['title']}. Reduce today’s scope if needed, then complete one focused task to rebuild momentum."
    return f"You are making progress in {current_phase['title']}. Complete the linked practice and assessment to turn activity into evidence of skill growth."
