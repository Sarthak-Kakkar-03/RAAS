# Retrieval-as-a-Service (RaaS)

Self-hosted retrieval backend for RAG applications, with a small convenience frontend for managing projects and documents.

Upload documents, index them into Chroma, and query top-k relevant chunks through a project-scoped API.

## What This Project Is

RaaS provides the retrieval layer of a RAG stack:
- document ingestion
- chunking
- embedding generation
- vector indexing
- similarity retrieval APIs

RaaS does not include answer generation or chat orchestration. Your app calls RaaS for context, then passes that context to your LLM of choice.

## Architecture

```text
Client / App Server
        |
        v
Fly / Local Container
        |
        +--> Next.js convenience frontend
        |
        +--> FastAPI (RaaS API)
        |
        +--> SQLite (projects, jobs, document registry)
        |
        +--> Local file storage (raw uploaded PDFs)
        |
        +--> Chroma Vector DB (chunk vectors + metadata)
```

Ingestion path:
`upload -> extract text -> chunk -> embed -> upsert to Chroma`

Retrieval path:
`query -> embed query -> similarity search in Chroma -> top-k chunks`

## Features

- Project creation with per-project API key
- Auth-protected project endpoints
- Convenience frontend for project/document management
- PDF upload and raw file storage
- Document registry with ingest status
- Synchronous ingest endpoint
- Project-scoped retrieval with optional metadata filters
- Chroma health check integration
- Persistent project/job/document state in SQLite

## Tech Stack

- API: FastAPI
- Frontend: Next.js
- Language: Python 3.12
- Vector DB: Chroma
- Embeddings: OpenAI (`langchain-openai`)
- PDF extraction: PyMuPDF
- Chunking: LangChain text splitters
- Persistence: SQLite
- Local orchestration: Docker Compose

## Project Structure

```text
api/
  core/       # config, db, auth
  models/     # pydantic schemas
  routes/     # HTTP routes
  services/   # ingest, indexing, retrieval, registries
raas-frontend/
  app/        # convenience UI
start.sh      # launches chroma, api, frontend
data/
  raw/        # uploaded files
  registry.db # sqlite persistence
docker-compose.yml
fly.toml
README.md
```

## Local Run (Docker Compose)

1. Set environment variables in `.env`:

```env
OPENAI_API_KEY=your_key_here
ADMIN_PASSWORD=choose_a_password_you_will_use_for_admin_sign_in
ADMIN_SESSION_SECRET=generate_a_long_random_secret_for_cookie_signing
PROJECT_API_KEY_SECRET=optional-for-local-dev-set-for-shared-use
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

`ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` guidance:
- `ADMIN_PASSWORD` is required for project create/delete access
- `ADMIN_SESSION_SECRET` should be long, random, and kept stable between restarts

`PROJECT_API_KEY_SECRET` guidance:
- Optional for local single-user/dev use
- Set it for shared/team/prod deployments and keep it stable
- If unset, app falls back to a development secret and logs a warning

2. Start services:

```bash
docker compose up -d
```

`api` service uses `uv` internally (`uv sync --frozen` then `uv run uvicorn ...`).

3. Verify services:

```bash
curl http://localhost:8000/health
curl http://localhost:8001/api/v1/heartbeat
```

4. Run the frontend separately:

```bash
cd raas-frontend
npm install
npm run dev
```

5. Stop services:

```bash
docker compose down
```

Full reset (wipe local state):

```bash
docker compose down -v
rm -rf data/
```

Use this when you want to remove all persisted state, including:
- `data/registry.db`
- uploaded files in `data/raw/`
- Chroma vectors stored in the `chroma_data` volume

## Fly.io Deployment

This repo now supports a single Fly app that runs:
- Next.js convenience frontend
- FastAPI API
- Chroma

All persistent state is mounted under `/app/data` on one Fly volume:
- SQLite database at `data/registry.db`
- uploaded source files under `data/raw/`
- Chroma persistence under `data/chroma/`

This is a pragmatic MVP deployment, not a high-durability architecture. It is acceptable if you are comfortable with the operational risk of colocating API, SQLite, uploads, and Chroma on one machine/volume.

### Deployment Files

- `fly.toml` defines the Fly app and mounts `/app/data`
- `Dockerfile` builds one image for frontend + API + Chroma
- `start.sh` starts Chroma, Uvicorn, and Next.js
- `raas-frontend/next.config.ts` rewrites `/api/*` to the local FastAPI process

### Required Fly Secrets

Set these before deploying:

```bash
fly secrets set \
  OPENAI_API_KEY=your_key_here \
  ADMIN_PASSWORD=replace_with_a_single_admin_password \
  ADMIN_SESSION_SECRET=replace_with_a_stable_random_session_secret \
  PROJECT_API_KEY_SECRET=replace_with_your_project_api_key_secret \
  CORS_ALLOWED_ORIGINS=https://your-app.fly.dev
```

Optional overrides:

```bash
fly secrets set \
  OPENAI_EMBEDDING_MODEL=text-embedding-3-small \
  ADMIN_SESSION_MAX_AGE_SECONDS=86400 \
  ADMIN_SESSION_COOKIE_SECURE=true
```

### Create the Volume

Create the volume once in the same region as the app:

```bash
fly volumes create raas_data --region ewr --size 10
```

### Deploy

```bash
fly launch --no-deploy
fly deploy
```

Health checks go through:

```text
/api/health
```

### Post-Deployment Retrieval

After deployment, your retrieval endpoint will be available at:

```text
https://your-app.fly.dev/api/projects/<PROJECT_ID>/query
```

Send requests with:
- `Authorization: Bearer <PROJECT_API_KEY>`
- `Content-Type: application/json`

Request schema:

```json
{
  "query": "What does this document say about pricing?",
  "top_k": 5,
  "where": {
    "filename": "pricing.pdf"
  }
}
```

Field notes:
- `query` is required
- `top_k` is optional and controls how many chunks are returned
- `where` is optional and can be used for metadata filtering

Example:

```bash
curl -X POST https://your-app.fly.dev/api/projects/<PROJECT_ID>/query \
  -H "Authorization: Bearer <PROJECT_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"query":"Summarize the refund policy","top_k":5}'
```

## API Endpoints

- `GET /health` - API and Chroma heartbeat status
- `POST /auth/login` - create admin session cookie from the configured admin password
- `GET /auth/session` - check whether the current admin session cookie is valid
- `POST /auth/logout` - clear the current admin session cookie
- `POST /projects` - create project (`id`, `name`, `api_key`) (admin session required)
- `GET /projects` - list projects
- `POST /projects/{project_id}/documents` - upload PDF (auth required)
- `GET /projects/{project_id}/documents` - list uploaded docs (auth required)
- `GET /projects/{project_id}/docs` - list document registry entries (auth required)
- `GET /projects/{project_id}/docs/{doc_id}` - get document registry entry (auth required)
- `DELETE /projects/{project_id}/docs/{doc_id}` - delete doc from Chroma + registry (auth required)
- `POST /projects/{project_id}/ingest` - synchronous ingest of pending docs (auth required)
- `POST /projects/{project_id}/index` - enqueue background indexing job (auth required)
- `GET /jobs/{job_id}` - fetch job status/result
- `POST /projects/{project_id}/query` - retrieve top-k chunks (auth required)
- `DELETE /projects/{project_id}` - delete project and associated storage (admin session required)
- `POST /retrieve` - legacy alias (returns note)

## API Flow (Quick Example)

1. Sign in as admin and store the session cookie:

```bash
curl -s -c cookies.txt -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"<ADMIN_PASSWORD>"}'
```

2. Create a project:

```bash
curl -s -b cookies.txt -X POST http://localhost:8000/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"demo"}'
```

3. Upload a PDF:

```bash
curl -s -X POST http://localhost:8000/projects/<PROJECT_ID>/documents \
  -H "Authorization: Bearer <API_KEY>" \
  -F "file=@./sample.pdf"
```

4. Index documents (choose one):

Synchronous:
```bash
curl -s -X POST http://localhost:8000/projects/<PROJECT_ID>/ingest \
  -H "Authorization: Bearer <API_KEY>"
```

Background job:
```bash
curl -s -X POST http://localhost:8000/projects/<PROJECT_ID>/index \
  -H "Authorization: Bearer <API_KEY>"
```

Check job status:
```bash
curl -s http://localhost:8000/jobs/<JOB_ID>
```

5. Query retrieval:

```bash
curl -s -X POST http://localhost:8000/projects/<PROJECT_ID>/query \
  -H "Authorization: Bearer <API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"query":"What does this document say?","top_k":5}'
```

6. Delete a project with the admin session:

```bash
curl -s -b cookies.txt -X DELETE \
  http://localhost:8000/projects/<PROJECT_ID>
```

## Persistence and Data

- Projects and jobs are stored in `data/registry.db`
- Document registry metadata is stored in `data/registry.db`
- Uploaded files are stored at `data/raw/<project_id>/`
- Chroma data is persisted at `data/chroma/`
