from datetime import date

from app.services.career import build_roadmap, calculate_progress, discussion_reply, plan_daily_tasks


def test_roadmap_is_personalized_to_skill_gaps():
    phases = build_roadmap(
        {"title": "Become an AI engineer", "target_role": "AI Engineer", "preferred_technologies": ["Python", "RAG", "Docker"]},
        {"current_skills": ["Python"]},
    )
    assert [phase["skills"][0] for phase in phases] == ["RAG", "Docker"]
    assert all(phase["status"] == "not_started" for phase in phases)


def test_daily_plan_respects_available_time_and_includes_learning():
    tasks = plan_daily_tasks({"title": "RAG fundamentals", "priority": "high"}, 60, date.today())
    assert sum(task["estimated_minutes"] for task in tasks) <= 60
    assert tasks[0]["task_type"] == "learning"
    assert all(task["generated_by_ai"] for task in tasks)


def test_progress_is_activity_based():
    progress = calculate_progress(
        [{"status": "completed", "completion_percentage": 100}, {"status": "in_progress", "completion_percentage": 50}],
        [{"status": "completed"}, {"status": "not_started"}],
    )
    assert progress == {"task_completion_rate": 50, "task_progress": 75, "roadmap_progress": 50, "goal_progress": 65}


def test_goal_discussion_requires_discovery_before_draft():
    assert "motivating" in discussion_reply(0)
    assert "enough context" in discussion_reply(4)
