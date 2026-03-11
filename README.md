# Retrieval-as-a-Service (RaaS)

Self-hosted retrieval backend for RAG applications.

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
FastAPI (RaaS API)
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
- PDF upload and raw file storage
- Document registry with ingest status
- Synchronous ingest endpoint
- Asynchronous indexing jobs (`queued/running/completed/failed`)
- Project-scoped retrieval with optional metadata filters
- Chroma health check integration
- Persistent project/job/document state in SQLite

## Tech Stack

- API: FastAPI
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
data/
  raw/        # uploaded files
  registry.db # sqlite persistence
docker-compose.yml
README.md
```

## Local Run (Docker Compose)

1. Set environment variables in `.env`:

```env
OPENAI_API_KEY=your_key_here
```

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

4. Stop services:

```bash
docker compose down
```

## Local Run (Without Docker)

If you prefer running directly with `uv`:

```bash
uv sync
uv run uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

Run Chroma separately (for example with Docker):

```bash
docker compose up -d chroma
```

## API Endpoints

- `GET /health` - API and Chroma heartbeat status
- `POST /projects` - create project (`id`, `name`, `api_key`)
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
- `POST /retrieve` - legacy alias (returns note)

## API Flow (Quick Example)

1. Create a project:

```bash
curl -s -X POST http://localhost:8000/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"demo"}'
```

2. Upload a PDF:

```bash
curl -s -X POST http://localhost:8000/projects/<PROJECT_ID>/documents \
  -H "Authorization: Bearer <API_KEY>" \
  -F "file=@./sample.pdf"
```

3. Index documents (choose one):

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

4. Query retrieval:

```bash
curl -s -X POST http://localhost:8000/projects/<PROJECT_ID>/query \
  -H "Authorization: Bearer <API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"query":"What does this document say?","top_k":5}'
```

## Persistence and Data

- Projects and jobs are stored in `data/registry.db`
- Document registry metadata is stored in `data/registry.db`
- Uploaded files are stored at `data/raw/<project_id>/`
- Chroma data is persisted through the `chroma_data` Docker volume

## Customization Points

- Swap embedding model in `api/core/config.py`
- Tune chunk size/overlap in `api/services/chunker.py`
- Add reranking or hybrid search in `api/services/retrieval_service.py`
- Replace local file storage with object storage (S3/GCS)
- Extend auth beyond API keys (JWT, service tokens, RBAC)

## Current Limitations

- No frontend in this repo
- No automated test suite yet
- SQLite + in-process background tasks are good for MVP, not high-scale production
- OCR for scanned PDFs is not implemented in current ingest flow
