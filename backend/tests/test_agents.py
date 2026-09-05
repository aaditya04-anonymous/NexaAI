from app.ai.agents import fallback_response


def test_fallback_routes_to_contextual_specialist():
    assert "RAG" in fallback_response("learning", {"context_record": {"topic": "RAG"}})
    assert "verified" in fallback_response("news", {})
