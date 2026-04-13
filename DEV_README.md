# Dev README

Developer notes for running, deploying, and extending RaaS.

## Project Structure

```text
api/
  core/
  models/
  routes/
  services/
raas-frontend/
  app/
start.sh
Dockerfile
docker-compose.yml
fly.toml
```

## Local Run

Create your local env file from [`.env.example`](.env.example):

```bash
cp .env.example .env
```

Then update the values in `.env` for your local setup.

Start backend dependencies:

```bash
docker compose up -d
```

Run the frontend:

```bash
cd raas-frontend
npm install
npm run dev
```

Useful checks:

```bash
curl http://localhost:8000/health
```

## Local Combined Container

Build:

```bash
docker build -t raas-fly-check .
```

Run as one app with frontend and direct API access:

```bash
docker run --rm \
  -p 8080:8080 \
  -p 8000:8000 \
  --env-file .env \
  --name raas-fly-check-local \
  raas-fly-check
```

## Fly Deploy

This repo deploys one container image defined by [`Dockerfile`](Dockerfile) and configured by [`fly.toml`](fly.toml). The Fly app name in this repo is `raas-sk`.

First-time setup for app `raas-sk`:

```bash
fly launch --name raas-sk --no-deploy
fly volumes create raas_data --region ewr --size 10 -a raas-sk

fly secrets set \
  OPENAI_API_KEY=your_key_here \
  ADMIN_PASSWORD=replace_with_a_single_admin_password \
  ADMIN_SESSION_SECRET=replace_with_a_stable_random_session_secret \
  PROJECT_API_KEY_SECRET=replace_with_your_project_api_key_secret \
  CORS_ALLOWED_ORIGINS=https://raas-sk.fly.dev \
  -a raas-sk

fly deploy
```

Normal update flow after you have already created the app:

```bash
fly status -a raas-sk
fly deploy -a raas-sk
```

That is the command you run when you want Fly.io to rebuild the Docker image with your latest code and roll out the updated container.

Useful release checks:

```bash
fly logs -a raas-sk
fly releases -a raas-sk
fly machine list -a raas-sk
```

If you change secrets or env-driven behavior:

```bash
fly secrets set KEY=value -a raas-sk
fly deploy -a raas-sk
```

After deploy:

```text
https://raas-sk.fly.dev
https://raas-sk.fly.dev/api/health
```

This app stores SQLite registry data and local Chroma persistence under `/app/data`, backed by the Fly volume mount `raas_data`.

## API Notes

Admin session routes:
- `POST /auth/login`
- `GET /auth/session`
- `POST /auth/logout`

Project routes:
- `POST /projects` requires admin session
- `DELETE /projects/{project_id}` requires admin session
- document, ingest, and query routes use the project API key

Quick API flow:

```bash
curl -s -c cookies.txt -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"<ADMIN_PASSWORD>"}'

curl -s -b cookies.txt -X POST http://localhost:8000/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"demo"}'

curl -s -X POST http://localhost:8000/projects/<PROJECT_ID>/documents \
  -H "Authorization: Bearer <API_KEY>" \
  -F "file=@./sample.pdf"

curl -s -X POST http://localhost:8000/projects/<PROJECT_ID>/ingest \
  -H "Authorization: Bearer <API_KEY>"

curl -s -X POST http://localhost:8000/projects/<PROJECT_ID>/query \
  -H "Authorization: Bearer <API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"query":"What does this document say?","top_k":5}'
```

## Retrieval API

Use the retrieval endpoint to fetch the most relevant chunks for a project:

```text
POST /projects/{project_id}/query
```

Authentication:
- Send the project API key as a bearer token in the `Authorization` header.

Expected request body:

```json
{
  "query": "What does this document say about refunds?",
  "top_k": 5,
  "where": {
    "doc_id": "optional-doc-filter"
  }
}
```

Request fields:
- `query`: required string, minimum length 1.
- `top_k`: optional integer, default `5`, allowed range `1` to `50`.
- `where`: optional object for Chroma metadata filters.
- `filters`: accepted as an alias for `where`.

Example request:

```bash
curl -s -X POST http://localhost:8000/projects/<PROJECT_ID>/query \
  -H "Authorization: Bearer <API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What does this document say about refunds?",
    "top_k": 5
  }'
```

Expected response shape:

```json
{
  "results": [
    {
      "id": "chunk_001",
      "text": "Refunds are available within 30 days of purchase.",
      "metadata": {
        "doc_id": "policy_pdf",
        "filename": "refund-policy.pdf",
        "chunk_index": 0
      },
      "distance": 0.91
    }
  ],
  "latency_ms": 42,
  "retrieval_debug": {
    "project_id": "demo",
    "top_k": 5,
    "hit_count": 1,
    "trace_id": "abc123def456",
    "filters_applied": false
  },
  "ok": true
}
```

Response fields:
- `results`: list of retrieval hits returned by the retrieval service.
- `latency_ms`: total retrieval time in milliseconds.
- `retrieval_debug`: debug metadata including `project_id`, `top_k`, `hit_count`, `trace_id`, and whether filters were applied.
- `ok`: boolean success flag.

Trace endpoints:

```text
GET /projects/{project_id}/queries
GET /projects/{project_id}/queries/summary
```

These endpoints return stored retrieval traces and aggregate metrics for the project. New traces now include:

- raw query text
- filter payload
- top hit IDs
- top hit distances
- top hit chunk text
- top hit metadata

Error behavior:
- `401` if the bearer token is missing.
- `403` if the project API key is invalid.
- `404` if the project does not exist.
- `400` for invalid query parameters.
- `500` for unexpected retrieval failures.
