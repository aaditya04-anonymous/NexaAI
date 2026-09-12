# Nexa Frontend (React)

A full React + TypeScript + Vite frontend for the NexaAI backend, replacing the
Streamlit app in `frontend/`. It covers the whole API surface: auth, profile,
goal discovery → roadmap → daily tasks, learning + assessments, career news,
coach chat, memories, document search (RAG), recommendations, projects,
progress/dashboard, and notification preferences.

## Requirements

- Node.js 20+
- The NexaAI backend running somewhere reachable (locally via `uvicorn`, or
  via the project's `docker-compose.yml`)

## 1. Local development

```bash
cd nexa-frontend
npm install
cp .env.example .env.local   # set VITE_API_BASE_URL if not http://localhost:8000
npm run dev
```

This starts Vite's dev server, printing a local URL (typically
`http://localhost:5173`).

**Point it at your backend.** By default it targets `http://localhost:8000`.
You can either:
- Set `VITE_API_BASE_URL` in `.env.local` before starting the dev server, or
- Leave it as-is and change the API URL later from the app's **Settings**
  page — it's stored in the browser's `localStorage` and takes effect
  immediately, no rebuild needed.

**Allow it through CORS.** The backend only accepts requests from origins
listed in `ALLOWED_ORIGINS` (see the backend's `.env`). Add whichever origin
you're serving the frontend from, e.g.:

```
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:4173,http://localhost:8501
```

(`5173` is the Vite dev server, `4173` is `vite preview`, `8501` is the old
Streamlit app if you're keeping both around.)

## 2. Production build

```bash
npm run build      # outputs to dist/
npm run preview    # serve the production build locally to sanity-check it
```

## 3. Docker

A multi-stage `Dockerfile` is included (Node build → static Nginx serve),
matching the pattern of the existing `Dockerfile.backend` /
`Dockerfile.frontend` in the project root.

Build and run standalone:

```bash
docker build -t nexa-frontend-react \
  --build-arg VITE_API_BASE_URL=http://localhost:8000 \
  ./nexa-frontend
docker run -p 5173:80 nexa-frontend-react
```

### Wiring into the existing `docker-compose.yml`

To run this alongside (or instead of) the Streamlit service, add a service
like this to the project's `docker-compose.yml`:

```yaml
  frontend-react:
    build:
      context: ./nexa-frontend
      args:
        VITE_API_BASE_URL: http://localhost:8000
    depends_on: { backend: { condition: service_healthy } }
    ports: ["5173:80"]
```

Notes:
- `VITE_API_BASE_URL` is baked in at build time. Since the app also calls
  the backend from the *browser* (not from inside the Docker network), point
  it at whatever host/port the backend is reachable from your machine —
  typically `http://localhost:8000`, same as the backend's own `ports:`
  mapping — not the internal service name `http://backend:8000`.
- Update the backend's `ALLOWED_ORIGINS` to include `http://localhost:5173`
  (or whatever port you map this service to).
- To fully replace Streamlit, remove or comment out the `frontend:` service
  and its `8501` port mapping.

## Project structure

```
src/
  lib/          API client, typed endpoint functions, shared types
  context/      Auth context (token + current user)
  components/   Shared UI primitives, app shell, route guards
  pages/        One file per screen, plus pages/auth/ for the auth flow
```

## Known limitations

- The backend doesn't expose a "list discussion history" endpoint for goal
  discovery, so the discovery chat thread is only kept for the current
  browser session — reloading mid-discussion starts a fresh visible thread
  (the backend's own record of it is untouched).
- The weekly report and activity-log endpoints return loosely-typed JSON on
  the backend, so those sections render generically rather than with
  bespoke layouts per field.
- News, recommendations, and chat quality depend on the backend having
  `GEMINI_API_KEY` (and `TAVILY_API_KEY` for news) configured — without
  them, those endpoints return their documented fallback/"unavailable"
  responses, which the UI handles explicitly rather than erroring.
