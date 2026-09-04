# Deployment

Set all production secrets through the deployment platform, use a MongoDB Atlas URI, configure HTTPS at an ingress/reverse proxy, and set `ALLOWED_ORIGINS`, `FRONTEND_URL`, and `BACKEND_URL` to public URLs. Run FastAPI with a production ASGI process manager and Streamlit as a separate service.

`docker compose up --build` starts a local MongoDB, backend, and frontend stack. For production, use managed MongoDB backups, restrictive network access, centralized logs, and a secret manager.
