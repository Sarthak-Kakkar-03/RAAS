# RaaS v0.1.0

Initial public release of Retrieval-as-a-Service (RaaS), a self-hosted retrieval layer for RAG workflows.

## What It Does

- creates isolated retrieval projects
- uploads project documents
- ingests and indexes files into Chroma
- serves retrieval results through API and UI flows
- protects project lifecycle actions behind admin auth
- issues per-project API keys for document and query access

## Included In This Release

- Next.js frontend for admin and project management
- FastAPI backend for auth, ingestion, and retrieval
- Chroma-backed vector storage
- local Docker Compose setup
- Fly.io deployment configuration

## Local Run

```bash
cp .env.example .env
docker compose up -d
cd raas-frontend
npm install
npm run dev
```

Backend health check:

```bash
curl http://localhost:8000/health
```

## Retrieval Example

```bash
curl -X POST http://localhost:8000/projects/<PROJECT_ID>/query \
  -H "Authorization: Bearer <PROJECT_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"query":"What does this document say?","top_k":5}'
```

## What’s Next

- add a real product screenshot or short GIF to the root README
- expand ingestion customization hooks
- improve docs around production deployment and operations
- add stronger automated test coverage across the full ingest/query flow
