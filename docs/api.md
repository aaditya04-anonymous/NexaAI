# API

Interactive OpenAPI documentation is available at `/docs` when the backend is running.

Important routes: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`, `GET|PUT /api/profile`, `POST /api/chat`, resource CRUD for `/api/goals`, `/api/tasks`, `/api/memories`, `/api/recommendations`, and `/api/automations`, and `GET /api/progress/summary`.

All protected endpoints require `Authorization: Bearer <JWT>`. Resource repositories include `user_id` in every lookup, so resource identifiers are not cross-account capabilities.
