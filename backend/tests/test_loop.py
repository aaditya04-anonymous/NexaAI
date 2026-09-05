from app.services.loop import build_assessment, build_learning, evaluate_assessment, extract_memories, recommendation


def test_learning_is_task_linked_and_interactive():
    lesson = build_learning({"id": "task-1", "title": "Learn: RAG fundamentals", "goal_id": "goal-1"})
    assert lesson["task_id"] == "task-1"
    assert lesson["topic"] == "RAG fundamentals"
    assert {section["type"] for section in lesson["sections"]} >= {"concept", "flow", "exercise"}


def test_assessment_adapts_after_incomplete_answers():
    assessment = build_assessment({"id": "learning-1", "topic": "Embeddings"})
    result = evaluate_assessment(assessment, {"understanding": "A representation for similarity."})
    assert result["outcome"] == "practice"
    assert result["difficulty_next"] == "foundation"


def test_memory_extraction_excludes_non_durable_small_talk():
    assert extract_memories("Hello, how are you today?") == []
    memories = extract_memories("I prefer project-based learning and struggle with probability.")
    assert {memory["category"] for memory in memories} == {"preference", "weakness"}


def test_recommendations_explain_what_why_how_and_benefit():
    result = recommendation({"profession": "AI Engineer"}, None, {"task_completion_rate": 20})
    assert {"title", "why", "how", "expected_benefit"} <= result.keys()
