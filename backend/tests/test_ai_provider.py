"""Tests for Centralized AI Provider Layer (Groq primary, Gemini fallback)."""
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
import pytest

from app.core.config import Settings
from app.ai.provider import (
    AIProviderService,
    AIAllProvidersFailedError,
    AIConfigurationError,
    is_recoverable_provider_error,
)


class MockGroqResponse:
    def __init__(self, content="Hello from Groq", prompt_tokens=10, completion_tokens=20):
        self.choices = [MagicMock(message=MagicMock(content=content))]
        self.usage = MagicMock(prompt_tokens=prompt_tokens, completion_tokens=completion_tokens, total_tokens=prompt_tokens+completion_tokens)


class MockGeminiResponse:
    def __init__(self, content="Hello from Gemini"):
        self.content = content


class HTTPStatusError(Exception):
    def __init__(self, status_code: int, message: str = "HTTP error"):
        super().__init__(message)
        self.status_code = status_code


@pytest.fixture
def dual_settings():
    return Settings(
        groq_api_key="gsk-test-key-1234567890",
        groq_model="llama-3.3-70b-versatile",
        gemini_api_key="gemini-test-key-0987654321",
        gemini_model="gemini-2.0-flash",
        ai_provider_timeout_ms=1000,
        ai_provider_max_retries=1,
    )


@pytest.fixture
def gemini_only_settings():
    return Settings(
        groq_api_key=None,
        gemini_api_key="gemini-test-key-0987654321",
        gemini_model="gemini-2.0-flash",
        ai_provider_timeout_ms=1000,
        ai_provider_max_retries=1,
    )


@pytest.mark.asyncio
async def test_1_groq_succeeds_gemini_never_called(dual_settings):
    """1. Groq succeeds: Gemini is never called."""
    service = AIProviderService(dual_settings)
    mock_groq = AsyncMock()
    mock_groq.chat.completions.create.return_value = MockGroqResponse("Groq answer")
    service._groq_client = mock_groq

    with patch.object(service, "_call_gemini_text", new_callable=AsyncMock) as mock_gemini:
        res = await service.generate_text("test prompt")
        assert res.content == "Groq answer"
        assert res.provider == "groq"
        assert res.fallback_used is False
        mock_groq.chat.completions.create.assert_called_once()
        mock_gemini.assert_not_called()


@pytest.mark.asyncio
async def test_2_groq_timeout_gemini_attempted(dual_settings):
    """2. Groq returns a timeout: Gemini is attempted."""
    service = AIProviderService(dual_settings)
    mock_groq = AsyncMock()
    mock_groq.chat.completions.create.side_effect = asyncio.TimeoutError("Groq request timed out")
    service._groq_client = mock_groq

    with patch.object(service, "_call_gemini_text", new_callable=AsyncMock) as mock_gemini:
        mock_gemini.return_value = MagicMock(content="Gemini fallback response", provider="gemini", model="gemini-2.0-flash", fallback_used=True)
        res = await service.generate_text("test prompt")
        assert res.provider == "gemini"
        mock_gemini.assert_called_once()


@pytest.mark.asyncio
async def test_3_groq_429_fallback_attempted(dual_settings):
    """3. Groq returns HTTP 429: fallback is attempted."""
    service = AIProviderService(dual_settings)
    mock_groq = AsyncMock()
    mock_groq.chat.completions.create.side_effect = HTTPStatusError(429, "Rate limit reached")
    service._groq_client = mock_groq

    with patch.object(service, "_call_gemini_text", new_callable=AsyncMock) as mock_gemini:
        mock_gemini.return_value = MagicMock(content="Gemini fallback response", provider="gemini", model="gemini-2.0-flash", fallback_used=True)
        res = await service.generate_text("test prompt")
        assert res.provider == "gemini"
        mock_gemini.assert_called_once()


@pytest.mark.asyncio
async def test_4_groq_temporary_server_error_fallback_attempted(dual_settings):
    """4. Groq returns a temporary server error: fallback is attempted."""
    service = AIProviderService(dual_settings)
    mock_groq = AsyncMock()
    mock_groq.chat.completions.create.side_effect = HTTPStatusError(503, "Service Unavailable")
    service._groq_client = mock_groq

    with patch.object(service, "_call_gemini_text", new_callable=AsyncMock) as mock_gemini:
        mock_gemini.return_value = MagicMock(content="Gemini fallback response", provider="gemini", model="gemini-2.0-flash", fallback_used=True)
        res = await service.generate_text("test prompt")
        assert res.provider == "gemini"
        mock_gemini.assert_called_once()


@pytest.mark.asyncio
async def test_5_groq_credentials_missing_gemini_attempted(gemini_only_settings):
    """5. Groq credentials are missing: configured Gemini is attempted."""
    service = AIProviderService(gemini_only_settings)
    with patch.object(service, "_call_gemini_text", new_callable=AsyncMock) as mock_gemini:
        mock_gemini.return_value = MagicMock(content="Gemini direct response", provider="gemini", model="gemini-2.0-flash", fallback_used=True)
        res = await service.generate_text("test prompt")
        assert res.provider == "gemini"
        mock_gemini.assert_called_once()


@pytest.mark.asyncio
async def test_6_gemini_succeeds_after_groq_fails(dual_settings):
    """6. Gemini succeeds after Groq fails."""
    service = AIProviderService(dual_settings)
    mock_groq = AsyncMock()
    mock_groq.chat.completions.create.side_effect = ConnectionError("Connection refused")
    service._groq_client = mock_groq

    with patch("langchain_google_genai.ChatGoogleGenerativeAI.ainvoke", new_callable=AsyncMock) as mock_ainvoke:
        mock_ainvoke.return_value = MockGeminiResponse("Recovered with Gemini")
        res = await service.generate_text("career advice")
        assert res.content == "Recovered with Gemini"
        assert res.provider == "gemini"
        assert res.fallback_used is True


@pytest.mark.asyncio
async def test_7_both_providers_fail_controlled_error(dual_settings):
    """7. Both providers fail: a controlled error is returned."""
    service = AIProviderService(dual_settings)
    mock_groq = AsyncMock()
    mock_groq.chat.completions.create.side_effect = HTTPStatusError(500, "Groq Crash")
    service._groq_client = mock_groq

    with patch.object(service, "_call_gemini_text", new_callable=AsyncMock) as mock_gemini:
        mock_gemini.side_effect = RuntimeError("Gemini also failed")
        with pytest.raises(AIAllProvidersFailedError):
            await service.generate_text("test prompt")


@pytest.mark.asyncio
async def test_8_invalid_requests_do_not_trigger_pointless_retries(dual_settings):
    """8. Invalid requests do not trigger pointless retries."""
    service = AIProviderService(dual_settings)
    mock_groq = AsyncMock()
    mock_groq.chat.completions.create.side_effect = HTTPStatusError(400, "Bad Request: malformed prompt")
    service._groq_client = mock_groq

    with patch.object(service, "_call_gemini_text", new_callable=AsyncMock) as mock_gemini:
        mock_gemini.side_effect = RuntimeError("Gemini failed")
        with pytest.raises(AIAllProvidersFailedError):
            await service.generate_text("invalid prompt")
        # Should NOT have retried Groq multiple times for 400
        assert mock_groq.chat.completions.create.call_count == 1


@pytest.mark.asyncio
async def test_9_invalid_credentials_handled_explicitly(dual_settings):
    """9. Invalid credentials (401/403) trigger immediate fallback without retrying the bad key."""
    service = AIProviderService(dual_settings)
    mock_groq = AsyncMock()
    mock_groq.chat.completions.create.side_effect = HTTPStatusError(401, "Invalid API Key")
    service._groq_client = mock_groq

    with patch.object(service, "_call_gemini_text", new_callable=AsyncMock) as mock_gemini:
        mock_gemini.return_value = MagicMock(content="Gemini fallback response", provider="gemini", model="gemini-2.0-flash", fallback_used=True)
        res = await service.generate_text("test prompt")
        assert res.provider == "gemini"
        # Should only call groq ONCE (no retry loop on 401)
        assert mock_groq.chat.completions.create.call_count == 1
        mock_gemini.assert_called_once()


@pytest.mark.asyncio
async def test_10_structured_outputs_maintain_expected_schema(dual_settings):
    """10. Structured outputs maintain expected schema."""
    service = AIProviderService(dual_settings)
    mock_groq = AsyncMock()
    mock_groq.chat.completions.create.return_value = MockGroqResponse('{"status": "ok", "recommendation": "Learn Docker"}')
    service._groq_client = mock_groq

    data = await service.generate_structured_output("give me a plan")
    assert isinstance(data, dict)
    assert data["status"] == "ok"
    assert data["recommendation"] == "Learn Docker"


@pytest.mark.asyncio
async def test_11_streaming_does_not_duplicate_or_corrupt_output(dual_settings):
    """11. Streaming does not duplicate or corrupt output."""
    service = AIProviderService(dual_settings)
    mock_groq = AsyncMock()

    class AsyncChunkStream:
        def __init__(self, chunks):
            self._chunks = chunks
        def __aiter__(self):
            return self
        async def __anext__(self):
            if not self._chunks:
                raise StopAsyncIteration
            chunk = self._chunks.pop(0)
            return MagicMock(choices=[MagicMock(delta=MagicMock(content=chunk))])

    mock_groq.chat.completions.create.return_value = AsyncChunkStream(["Step 1", " -> ", "Step 2"])
    service._groq_client = mock_groq

    chunks = []
    async for chunk in service.generate_stream("stream me"):
        chunks.append(chunk)

    assert "".join(chunks) == "Step 1 -> Step 2"


def test_12_secrets_never_exposed_in_responses_or_logs(dual_settings, caplog):
    """12. Secrets are never exposed in responses or logs."""
    import logging
    caplog.set_level(logging.DEBUG)

    service = AIProviderService(dual_settings)
    recoverable, code = is_recoverable_provider_error(HTTPStatusError(500, "Error with gsk-test-key-1234567890"))
    assert recoverable is True
    # Verify our key strings are never in logs emitted by our module
    for record in caplog.records:
        assert dual_settings.groq_api_key not in record.message
        assert dual_settings.gemini_api_key not in record.message
