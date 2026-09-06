# Copilot Instructions for NexaAI

This document guides Copilot sessions working on NexaAI, a personal AI career growth agent.

## Quick Start

### Prerequisites
- Python 3.10+
- MongoDB (local or Atlas)
- Virtual environment: `python -m venv .venv` and activate it

### Running Locally

**Backend:**
```bash
pip install -r backend/requirements.txt
cp .env.example .env  # Update JWT_SECRET_KEY, MONGODB_URI, and API keys
cd backend
uvicorn app.main:app --reload
```
API runs at `http://localhost:8000`, OpenAPI docs at `/docs`.

**Frontend:**
```bash
pip install -r frontend/requirements.txt
streamlit run frontend/app.py
```
Frontend runs at `http://localhost:8501`.

**Tests:**
```bash
cd backend
pytest tests  # Run all tests
pytest tests/test_security.py  # Run specific test file
```

**Docker:**
```bash
docker compose up --build
```
Backend health: `GET /api/health`, frontend at `http://localhost:8501`.

## Architecture

### Stack
- **Backend API:** FastAPI with Motor (async MongoDB driver)
- **Database:** MongoDB with user-scoped repository pattern
- **AI Agents:** LangGraph workflow with 8 specialized agents
- **Frontend:** Streamlit single-page application
- **Auth:** Argon2 password hashing + expiring JWT tokens

### Core Intelligence Loop
```
USER → PROFILE → GOAL → DISCUSSION → SKILL GAP → ROADMAP → DAILY TASKS 
→ LEARNING → ASSESSMENT → PROGRESS → MEMORY → CAREER INTELLIGENCE 
→ RECOMMENDATIONS → NEXT ACTION → REPEAT
```

### User Data Isolation
**Critical security pattern:** All repository queries include `user_id`. This is enforced at the repository layer (see `backend/app/repositories/base.py`):
- `UserOwnedRepository.list(user_id, limit=100)` — returns up to 100 records sorted by `created_at` descending
- `UserOwnedRepository.get(user_id, item_id)` — validates both user ownership and ObjectId format
- `UserOwnedRepository.create/update/delete()` — all include user_id in queries
- Models and agents never receive database access; the API passes only the authenticated `user_id` to services

### Career Loop (Goal-First)
The API enforces an intentional progression:
1. **Profile & Goals:** `POST /api/goals`, `POST /api/goals/{goal_id}/discuss`
2. **Roadmap:** `POST /api/goals/{goal_id}/roadmap/generate`, `PUT /api/roadmaps/{roadmap_id}`, `POST /api/roadmaps/{roadmap_id}/finalize`
3. **Daily Tasks:** `POST /api/tasks/generate-daily`, `POST /api/tasks/{task_id}/complete`
4. **Learning & Evidence:** `POST /api/learning/generate/{task_id}`, `POST /api/assessments/{assessment_id}/submit`
5. **Insights:** `POST /api/recommendations/generate`, `GET /api/progress`, `GET /api/reports/weekly`

Also available: research/news, memory extraction, custom automations, and chat.

### Specialized AI Agents
Located in `backend/app/ai/agents.py`:
- **GoalDiscussionAgent** - Conversational goal planning with progressive questions
- **SkillGapAgent** - Analyzes gaps between current and target skills
- **RoadmapGenerationAgent** - Creates personalized learning roadmaps
- **LearningContentAgent** - Generates interactive lesson structures
- **AssessmentAgent** - Creates adaptive assessments and evaluates responses
- **MemoryAgent** - Extracts structured memories from interactions
- **RecommendationAgent** - Generates personalized recommendations
- **CareerIntelligenceAgent** - Analyzes market trends and career requirements

### Repository Structure
```
backend/
  app/
    ai/               # 8 specialized agents and workflows
    api/              # FastAPI routes (routes.py + extended_routes.py)
    core/             # Config, security (hashing, JWT), exceptions
    db/               # Motor connection lifecycle
    rag/              # Document ingestion and vector search
    repositories/     # UserOwnedRepository pattern for all CRUD
    schemas/          # Pydantic models for request/response validation
    services/         # Business logic (career, auth, loop, learning, memory, news, progress)
    workers/          # Background scheduler for recurring tasks
  tests/              # Pytest suite
  requirements.txt    # FastAPI, Motor, LangChain, LangGraph, etc.

frontend/
  app.py              # Streamlit entry point
  requirements.txt    # Streamlit
```

## Key Services Implemented

### Learning Service (`backend/app/services/learning.py`)
- Create interactive learning content with sections, diagrams, code examples, exercises
- Retrieve learning content with context
- Generate assessments based on topics
- Submit assessments with automatic evaluation
- Provide detailed feedback and identify strengths/weaknesses

### Memory Service (`backend/app/services/memory.py`)
- Extract structured memories from interactions
- Categorize memories (preference, career, skill, goal, learning, strength, weakness, behavior, project, decision, recommendation)
- Retrieve relevant memories based on context
- User-controlled memory management (edit, delete)
- Track memory usage and relevance

### Recommendation Service (`backend/app/services/news.py`)
- Generate personalized recommendations combining goal, skill, market, and performance data
- Rank by priority (critical, high, medium, low) and relevance score
- Track recommendation status (suggested, accepted, rejected, completed)
- Generate learning, revision, practice, project, interview, and portfolio recommendations

### Progress Service (`backend/app/services/progress.py`)
- Multi-level progress calculation (goal, skill, task, learning, assessment)
- Career readiness scoring (0-100)
- Activity history logging for all user actions
- Weekly report generation with insights
- Identify strengths and areas for improvement

## Key Conventions

### Pydantic Schemas
- `auth.py` — authentication payloads
- `career.py` — goal, roadmap, task, learning, assessment, recommendation, memory structures
- `common.py` — profile, resource base models
All resources use `id` (derived from MongoDB `_id`), `created_at`, `updated_at`.

### Services
- `services/auth.py` — registration, login, reset token handling
- `services/career.py` — goal discussion, roadmap building, task planning
- `services/loop.py` — learning, assessments, recommendations
- `services/learning.py` — interactive learning content and assessment
- `services/memory.py` — memory extraction and retrieval
- `services/news.py` — recommendation generation
- `services/progress.py` — progress tracking and analytics

### API Response Pattern
```python
@router.get("/some-resource/{resource_id}")
async def get_resource(resource_id: str, user: dict = Depends(current_user)):
    service = SomeService(get_db())
    return await service.get_something(user["id"], resource_id)
```

All protected endpoints use the `current_user` dependency from `api/deps.py`.

### Error Handling
- Use `HTTPException(status_code=...)` for HTTP errors
- Log unhandled exceptions; main.py includes a global exception handler
- Auth failures return 401; permission failures return 403; validation errors return 422

### Password Reset Security
- Reset tokens are random, hashed before storage, and single-use (deleted after use)
- TTL index ensures expiry via MongoDB
- Account enumeration is avoided: "reset sent if account exists" message for all inputs

### Environment Configuration
Located in `core/config.py`:
- `Settings` class loads from `.env` (MONGODB_URI, JWT_SECRET_KEY, GEMINI_API_KEY, TAVILY_API_KEY, etc.)
- Use `get_settings()` to access config (singleton via `@lru_cache`)
- Never hardcode secrets; always use environment variables

## Testing

**Run all tests:**
```bash
pytest backend/tests
```

**Test categories:**
- `test_security.py` — password hashing, JWT creation/validation
- `test_agents.py` — LangGraph workflow and agent responses
- `test_career.py` — goal, roadmap, and task logic
- `test_loop.py` — learning, assessments, and progress
- `test_rag.py` — document ingestion and search

**Key patterns:**
- Use `pytest` and `pytest-asyncio` for async functions
- Mock external services (Gemini, Tavily) using fixtures
- Always test user isolation: verify queries with wrong `user_id` return no results
- Test memory extraction, recommendation generation, progress calculation

## Documentation

- `docs/architecture.md` — system design, safety model, isolation
- `docs/api.md` — endpoint details and career loop flow
- `docs/development.md` — local setup and testing
- `docs/deployment.md` — production considerations (managed MongoDB, HTTPS, secrets)
- `docs/implementation-plan.md` — incremental feature roadmap
- `IMPLEMENTATION_GUIDE.md` — detailed guide to all implemented features and workflow examples

## Important Notes

1. **Never commit `.env`** — rotate any exposed keys immediately
2. **Rotation cycle:** JWT tokens expire by design (default 60 minutes); reset tokens expire after 30 minutes
3. **External API keys:** Gemini and Tavily are optional; services degrade gracefully if not configured
4. **LangSmith:** Instrumentation is automatic if `LANGSMITH_API_KEY` is set; no manual code changes needed
5. **Async throughout:** Database, HTTP, and AI calls are all async; use `await` consistently
6. **Dates are UTC:** `datetime.now(UTC)` for all timestamps; stored and queried consistently
7. **Production:** Use MongoDB Atlas, enable HTTPS, set restrictive CORS, and monitor backups per `docs/deployment.md`
8. **User Isolation:** Every database query with user-specific data must include `user_id` filter
9. **Memory-Driven:** Personalization comes from extracted memories, not hardcoded rules
10. **Progressive:** Onboarding, goal discussion, and learning all reveal information progressively

## Next Priority Implementations

1. **Goal Discussion Workflow** - Fully integrate LLM for conversational goal planning
2. **Frontend Dashboard** - Build Streamlit pages for all features
3. **News Pipeline** - Web search → personalization → daily delivery
4. **Background Scheduler** - Daily task generation, news fetching, reminders
5. **YouTube Discovery** - Integrate video search for learning resources
6. **Comprehensive Testing** - Full test coverage for all services
7. **Performance Optimization** - Caching, indexing, async optimization
8. **Deployment Configuration** - Docker, environment configs, monitoring setup

