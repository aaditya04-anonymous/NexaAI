# Nexa — Personal AI Growth Agent

Nexa is a deployable personal-growth workspace built with **FastAPI**, **MongoDB**, **LangGraph/LangChain**, **Google Gemini**, and **Streamlit**. It provides authenticated, isolated user data for profiles, goals, tasks, memories, recommendations, automations, conversations, and progress metrics.

## Architecture and safety

The frontend calls a typed REST API. Authentication uses Argon2 password hashes and expiring JWTs. Reset tokens are random, hashed before persistence, single-use, and expire via MongoDB TTL. User-owned repository methods scope all reads, updates, and deletes by authenticated `user_id`. The agent graph receives its user identity from the API—not model output—and prompts only receive a minimized profile context. See [architecture](docs/architecture.md).

## Setup

1. Copy `.env.example` to `.env` and set a strong `JWT_SECRET_KEY` plus `MONGODB_URI`.
2. Install backend dependencies: `pip install -r backend/requirements.txt`.
3. Start API: `uvicorn app.main:app --app-dir backend --reload`.
4. Install frontend dependencies: `pip install -r frontend/requirements.txt`.
5. Start UI: `streamlit run frontend/app.py`.

Set `GEMINI_API_KEY` and optionally `GEMINI_MODEL` to enable Gemini responses. Set `TAVILY_API_KEY` before deploying current-web-search functionality. LangSmith uses `LANGSMITH_API_KEY`, `LANGSMITH_PROJECT`, and `LANGSMITH_TRACING`; do not send secrets as prompt data.

## Docker

Copy `.env.example` to `.env`, update secrets, then run `docker compose up --build`. The API health endpoint is `GET /api/health`; OpenAPI is at `/docs`.

## Documentation

Read [API details](docs/api.md), [development notes](docs/development.md), and [deployment guidance](docs/deployment.md). Production deployments should use managed MongoDB/Atlas, HTTPS, strict CORS, environment-backed secrets, and monitored backups.

## Current integration requirements

MongoDB is required for persistent application data. Gemini responses require a Google API key. Password reset delivery requires SMTP wiring in the deployment environment; the API avoids account enumeration regardless of mail configuration.
