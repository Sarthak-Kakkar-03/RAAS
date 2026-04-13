# API README

The FastAPI app is mounted under `api.main:app` and is served:

- locally at `http://localhost:8000`
- on Fly behind the frontend at `https://raas-sk.fly.dev/api`

Common local run:

```bash
uv sync
uv run uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

Docker-backed local run from the repo root:

```bash
docker compose up --build
```

The main retrieval routes are:

- `POST /projects/{project_id}/query`
- `GET /projects/{project_id}/queries`
- `GET /projects/{project_id}/queries/summary`

Project-scoped routes require the project API key as a bearer token.

For deployment details, see the root [README](../README.md) and [DEV_README](../DEV_README.md).
