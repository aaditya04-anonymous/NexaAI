"""Centralized AI Provider Layer supporting Groq as primary and Gemini as fallback.

Features:
- Groq client with async streaming and completion
- Gemini client fallback when Groq is unavailable or errors
- Explicit fallback policy for timeouts, 429 rate-limits, 5xx errors, network failures
- Safe non-leaking logging and operational telemetry
- Token usage and latency tracking
- Zero proactive calls to Gemini when Groq succeeds
"""
import asyncio
import json
import logging
import random
import time
from dataclasses import dataclass, field
from typing import Any, AsyncIterator

from ..core.config import Settings, get_settings

logger = logging.getLogger("nexa.ai.provider")


@dataclass
class TokenUsage:
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


@dataclass
class AIResponse:
    content: str
    provider: str
    model: str
    latency_ms: float
    fallback_used: bool = False
    fallback_reason: str | None = None
    token_usage: TokenUsage | None = None
    raw_metadata: dict[str, Any] = field(default_factory=dict)


class AIProviderError(Exception):
    """Base exception for AI provider errors."""
    def __init__(self, message: str, provider: str | None = None, is_recoverable: bool = False, status_code: int | None = None):
        super().__init__(message)
        self.provider = provider
        self.is_recoverable = is_recoverable
        self.status_code = status_code


class AIConfigurationError(AIProviderError):
    """Raised when no provider is configured."""
    pass


class AIAllProvidersFailedError(AIProviderError):
    """Raised when all configured providers failed."""
    pass


def is_recoverable_provider_error(exc: Exception) -> tuple[bool, int | None]:
    """Classify if an exception from a provider is recoverable and eligible for retry or fallback.
    
    Returns (is_recoverable, status_code).
    """
    status_code: int | None = getattr(exc, "status_code", None)
    if status_code is None and hasattr(exc, "response") and hasattr(exc.response, "status_code"):
        status_code = exc.response.status_code

    exc_name = exc.__class__.__name__.lower()
    msg = str(exc).lower()

    # Rate limits (429)
    if status_code == 429 or "rate_limit" in exc_name or "rate limit" in msg or "429" in msg:
        return True, 429

    # Server errors (500, 502, 503, 504)
    if status_code in (500, 502, 503, 504):
        return True, status_code
    if any(code in msg for code in ("500", "502", "503", "504", "service unavailable", "bad gateway", "gateway timeout")):
        return True, status_code or 503

    # Timeouts and network errors
    if any(term in exc_name or term in msg for term in ("timeout", "timed out", "connecterror", "connection", "network", "dns", "remoteprotocolerror")):
        return True, status_code or 504

    # Authentication/permission errors (401, 403) - eligible for fallback to next provider, but NOT for retrying the same provider
    if status_code in (401, 403) or "unauthorized" in msg or "authentication" in msg or "invalid api key" in msg:
        return False, status_code

    # 400 Bad Request / Schema errors are generally not recoverable by blind retry
    if status_code == 400 or "bad request" in msg:
        return False, 400

    return False, status_code


class AIProviderService:
    """Manages Groq-first generation with automatic Gemini fallback."""

    def __init__(self, settings: Settings | None = None):
        self._settings = settings or get_settings()
        self._groq_client = None

    @property
    def groq_api_key(self) -> str | None:
        return self._settings.groq_api_key

    @property
    def groq_model(self) -> str:
        return self._settings.groq_model

    @property
    def gemini_api_key(self) -> str | None:
        return self._settings.gemini_api_key

    @property
    def gemini_model(self) -> str:
        return self._settings.gemini_model

    @property
    def timeout_seconds(self) -> float:
        return max(1.0, self._settings.ai_provider_timeout_ms / 1000.0)

    @property
    def max_retries(self) -> int:
        return max(0, self._settings.ai_provider_max_retries)

    def _get_groq_client(self):
        if not self.groq_api_key:
            return None
        if self._groq_client is None:
            try:
                from groq import AsyncGroq
                self._groq_client = AsyncGroq(
                    api_key=self.groq_api_key,
                    timeout=self.timeout_seconds,
                    max_retries=0,  # We manage bounded retries explicitly
                )
            except ImportError:
                logger.warning("Groq SDK is not installed; Groq provider cannot be initialized.")
                return None
        return self._groq_client

    async def _execute_with_retry(self, provider_name: str, op_func):
        """Execute operation with bounded exponential backoff and jitter for recoverable errors."""
        retries = 0
        last_error = None

        while retries <= self.max_retries:
            try:
                return await op_func()
            except Exception as e:
                last_error = e
                recoverable, code = is_recoverable_provider_error(e)
                # If non-recoverable (like 401, 400) or reached max retries, break immediately
                if not recoverable or retries >= self.max_retries:
                    break

                retries += 1
                backoff = min(2.0, (0.2 * (2 ** (retries - 1)))) + random.uniform(0.05, 0.2)
                logger.info(
                    "Recoverable error from provider=%s (status=%s). Retrying %d/%d after %.2fs...",
                    provider_name, code, retries, self.max_retries, backoff
                )
                await asyncio.sleep(backoff)

        if last_error is not None:
            raise last_error
        raise AIProviderError(
            f"Operation failed for provider '{provider_name}' with no exception recorded",
            provider=provider_name
        )

    async def _call_groq_text(self, prompt: str, system: str | None = None, temperature: float = 0.3) -> AIResponse:
        client = self._get_groq_client()
        if not client:
            raise AIConfigurationError("Groq API key is not configured", provider="groq")

        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        start_time = time.perf_counter()

        async def _invoke():
            return await client.chat.completions.create(
                model=self.groq_model,
                messages=messages,
                temperature=temperature,
            )

        completion = await self._execute_with_retry("groq", _invoke)
        latency_ms = (time.perf_counter() - start_time) * 1000

        content = completion.choices[0].message.content or ""
        usage = None
        if getattr(completion, "usage", None):
            usage = TokenUsage(
                prompt_tokens=completion.usage.prompt_tokens or 0,
                completion_tokens=completion.usage.completion_tokens or 0,
                total_tokens=completion.usage.total_tokens or 0,
            )

        logger.info(
            "Groq text generation succeeded. model=%s latency_ms=%.1f tokens=%s",
            self.groq_model, latency_ms, usage.total_tokens if usage else "n/a"
        )

        return AIResponse(
            content=content,
            provider="groq",
            model=self.groq_model,
            latency_ms=latency_ms,
            fallback_used=False,
            token_usage=usage,
        )

    async def _call_gemini_text(self, prompt: str, system: str | None = None, temperature: float = 0.3, fallback_reason: str | None = None) -> AIResponse:
        if not self.gemini_api_key:
            raise AIConfigurationError("Gemini API key is not configured", provider="gemini")

        start_time = time.perf_counter()

        async def _invoke():
            # Use langchain_google_genai or direct request
            from langchain_google_genai import ChatGoogleGenerativeAI
            full_prompt = f"System: {system}\n\n{prompt}" if system else prompt
            llm = ChatGoogleGenerativeAI(
                model=self.gemini_model,
                google_api_key=self.gemini_api_key,
                temperature=temperature,
                request_timeout=self.timeout_seconds,
            )
            return await llm.ainvoke(full_prompt)

        res = await self._execute_with_retry("gemini", _invoke)
        latency_ms = (time.perf_counter() - start_time) * 1000
        content = str(res.content) if hasattr(res, "content") else str(res)

        logger.info(
            "Gemini generation succeeded. model=%s latency_ms=%.1f fallback_used=True reason='%s'",
            self.gemini_model, latency_ms, fallback_reason or "unknown"
        )

        return AIResponse(
            content=content,
            provider="gemini",
            model=self.gemini_model,
            latency_ms=latency_ms,
            fallback_used=True,
            fallback_reason=fallback_reason,
        )

    async def generate_text(self, prompt: str, system: str | None = None, temperature: float = 0.3) -> AIResponse:
        """Generate text using Groq first, falling back to Gemini only if Groq is unavailable or fails."""
        groq_error = None

        # 1. Attempt Groq first if configured
        if self.groq_api_key:
            try:
                return await self._call_groq_text(prompt, system=system, temperature=temperature)
            except Exception as exc:
                groq_error = exc
                is_rec, code = is_recoverable_provider_error(exc)
                logger.warning(
                    "Primary provider Groq failed (status=%s, recoverable=%s, error_type=%s). Attempting Gemini fallback.",
                    code, is_rec, exc.__class__.__name__
                )
        else:
            logger.info("Groq is not configured (missing key). Attempting Gemini.")

        # 2. Attempt Gemini fallback if configured
        if self.gemini_api_key:
            reason = str(groq_error) if groq_error else "Groq not configured"
            try:
                return await self._call_gemini_text(prompt, system=system, temperature=temperature, fallback_reason=reason)
            except Exception as gemini_err:
                logger.error(
                    "Fallback provider Gemini also failed (error_type=%s).",
                    gemini_err.__class__.__name__
                )
                raise AIAllProvidersFailedError(
                    f"All AI providers failed. Groq: {groq_error.__class__.__name__ if groq_error else 'not configured'}; Gemini: {gemini_err.__class__.__name__}"
                ) from gemini_err

        # 3. Neither provider succeeded
        if groq_error:
            raise AIAllProvidersFailedError(f"Groq failed ({groq_error.__class__.__name__}) and Gemini is not configured") from groq_error
        raise AIConfigurationError("Neither Groq nor Gemini API key is configured")

    async def generate_structured_output(self, prompt: str, system: str | None = None, temperature: float = 0.2) -> dict[str, Any]:
        """Generate structured JSON output with Groq primary and Gemini fallback."""
        json_system = (system or "") + "\nYou MUST respond with valid, parseable JSON only. Do not include markdown formatting or prose outside the JSON object."
        response = await self.generate_text(prompt=prompt, system=json_system.strip(), temperature=temperature)
        raw = response.content.strip()
        if raw.startswith("```json"):
            raw = raw[7:]
        if raw.startswith("```"):
            raw = raw[3:]
        if raw.endswith("```"):
            raw = raw[:-3]
        return json.loads(raw.strip())

    async def generate_stream(self, prompt: str, system: str | None = None, temperature: float = 0.3) -> AsyncIterator[str]:
        """Stream generated text chunks. Groq is primary.
        
        Falls back to Gemini only if Groq fails BEFORE any chunks have been yielded.
        """
        client = self._get_groq_client()
        groq_failed_early = False
        groq_error = None

        if client:
            messages = []
            if system:
                messages.append({"role": "system", "content": system})
            messages.append({"role": "user", "content": prompt})

            has_yielded = False
            try:
                stream = await client.chat.completions.create(
                    model=self.groq_model,
                    messages=messages,
                    temperature=temperature,
                    stream=True,
                )
                async for chunk in stream:
                    delta = chunk.choices[0].delta.content or ""
                    if delta:
                        has_yielded = True
                        yield delta
                return
            except Exception as e:
                groq_error = e
                if has_yielded:
                    logger.error("Groq stream interrupted after output was committed. Cannot safely restart fallback.")
                    raise
                logger.warning("Groq stream failed before committing output. Falling back to Gemini.")
                groq_failed_early = True
        else:
            groq_failed_early = True

        # Fallback to Gemini stream
        if self.gemini_api_key:
            from langchain_google_genai import ChatGoogleGenerativeAI
            full_prompt = f"System: {system}\n\n{prompt}" if system else prompt
            llm = ChatGoogleGenerativeAI(
                model=self.gemini_model,
                google_api_key=self.gemini_api_key,
                temperature=temperature,
                request_timeout=self.timeout_seconds,
            )
            async for chunk in llm.astream(full_prompt):
                text = str(chunk.content) if hasattr(chunk, "content") else str(chunk)
                if text:
                    yield text
        else:
            if groq_error:
                raise AIAllProvidersFailedError(f"Groq stream failed and Gemini is not configured") from groq_error
            raise AIConfigurationError("Neither Groq nor Gemini API key is configured for streaming")


_default_service: AIProviderService | None = None


def get_ai_service() -> AIProviderService:
    global _default_service
    if _default_service is None:
        _default_service = AIProviderService()
    return _default_service
