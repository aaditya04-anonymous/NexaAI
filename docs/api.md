# API

Interactive OpenAPI documentation is available at `/docs` when the backend is running.

Important routes: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`, `GET|PUT /api/profile`, and `GET|PUT /api/users/me`.

The goal-first career loop uses:

- `POST|GET /api/goals`, `GET|PUT /api/goals/{goal_id}`, and `POST /api/goals/{goal_id}/discuss`;
- `POST /api/goals/{goal_id}/roadmap/generate`, `PUT /api/roadmaps/{roadmap_id}`, and `POST /api/roadmaps/{roadmap_id}/finalize`;
- `POST /api/tasks/generate-daily`, `GET /api/tasks/today`, and `POST /api/tasks/{task_id}/complete`;
- `POST /api/learning/generate/{task_id}`, `GET /api/learning/today`, `POST /api/learning/{learning_id}/assessment`, and `POST /api/assessments/{assessment_id}/submit`;
- `POST /api/news/generate` and `GET /api/news/today`; research returns only verified provider results and falls back to the latest verified article or an explicit unavailable state;
- `POST /api/recommendations/generate`, `POST /api/memories/extract`, `GET /api/history`, `GET /api/reports/weekly`, `GET /api/dashboard`, and `GET /api/progress`.

Generic resource CRUD remains available for `/api/tasks`, `/api/memories`, `/api/recommendations`, and `/api/automations`. Chat remains available at `POST /api/chat`.

All protected endpoints require `Authorization: Bearer <JWT>`. Resource repositories include `user_id` in every lookup, so resource identifiers are not cross-account capabilities.
