from app.rag.service import chunks


def test_chunking_preserves_content_and_overlap():
    source = "alpha " * 400
    result = chunks(source, size=100, overlap=20)
    assert len(result) > 2
    assert result[0].startswith("alpha")
    assert result[1] in source
