cat << 'EOF' > README.md
# Retrieval-as-a-Service (RaaS)

Self-hosted Retrieval infrastructure for LLM applications.

Upload documents → build an index → call one retrieval API.

RaaS provides the retrieval layer of a Retrieval-Augmented Generation (RAG) stack so developers can quickly add document context to their models without building ingestion pipelines or vector database infrastructure.

---

## What This Project Is

RaaS is a lightweight service that handles the retrieval side of Retrieval-Augmented Generation (RAG).

It provides:

- Document storage
- Token-aware chunking
- Embedding generation
- Vector indexing (Chroma)
- Retrieval APIs for LLM applications

This project does not include chatbot logic or LLM orchestration.
It only returns relevant document context for your model.

You can plug it into:

- OpenAI
- Anthropic
- Local LLMs
- Any custom inference pipeline

---

## Example Use Case

A developer wants to build a documentation assistant.

Instead of building the entire retrieval system themselves they can:

1. Deploy RaaS
2. Upload documentation files
3. Run indexing
4. Query the retrieval API from their application

Their LLM then uses the returned context to generate answers.

---

## Architecture

Browser (React UI)
        ↓
FastAPI (RaaS API)
        ↓
Chunking + Embedding Worker
        ↓
Chroma Vector Database
        ↓
Document Storage

At inference time the flow becomes:

User question
      ↓
Application server
      ↓
RaaS Retrieval API
      ↓
Top-K document chunks
      ↓
LLM prompt context

RaaS acts as the retrieval microservice in a RAG system.

---

## Features (MVP)

- Document upload via UI or API
- Token-aware chunking (LangChain splitters)
- OpenAI embedding support (configurable)
- Vector indexing with Chroma
- Project-scoped retrieval
- Retrieval endpoint for model integration
- Dockerized services
- Model-agnostic design

---

## Tech Stack

Backend
- FastAPI
- Python

Frontend
- React
- TypeScript
- Vite

Retrieval Infrastructure
- Chroma vector database
- OpenAI embeddings

Deployment
- Docker
- Docker Compose
- AWS EC2 (recommended for self-hosting)

---

## Project Structure

raas/
  api/
    routes/
    services/
    models/
    core/

frontend/
  src/

docker/
docker-compose.yml

Key components:

- routes → API endpoints
- services → chunking, indexing, embedding logic
- models → request/response schemas
- core → config + storage utilities

---

## Quick Start (Docker)

### 1. Clone the repository

git clone https://github.com/Sarthak-Kakkar-03/RAAS.git
cd RAAS

### 2. Start services

docker compose up -d

This launches:

- FastAPI service
- Chroma vector database
- Frontend UI

---

### 3. Verify Chroma is running

curl http://localhost:8001/api/v1/heartbeat

Expected response:

{
  "nanosecond heartbeat": ...
}

---

### 4. Stop services

docker compose down

---

## Using the Retrieval API

Your application queries RaaS during inference.

Example request:

POST /projects/{project_id}/query

Example curl request:

curl -X POST http://localhost:8000/projects/<PROJECT_ID>/query \
  -H "Authorization: Bearer <API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is the return policy?",
    "top_k": 5
  }'

Example response:

{
  "results": [
    {
      "text": "...document chunk...",
      "metadata": {
        "filename": "policy.pdf",
        "chunk_index": 12
      }
    }
  ],
  "latency_ms": 45
}

Your application then inserts those results into the LLM prompt.

---

## Example Integration (Python)

import requests

res = requests.post(
    "http://localhost:8000/projects/my_project/query",
    headers={"Authorization": "Bearer API_KEY"},
    json={
        "query": "What is the return policy?",
        "top_k": 5
    }
)

chunks = res.json()["results"]

Those chunks can then be inserted into your LLM prompt.

---

## Deployment

RaaS is designed to run on your own infrastructure.

Typical deployment:

AWS EC2
 ├─ FastAPI container
 ├─ Chroma container
 └─ React UI

Users interact with:

http://<EC2_IP>/

Developers can then call the retrieval API from their application servers.

---

## Template Philosophy

This project is intentionally designed as a template starter.

You can easily customize:

- embedding models
- chunking strategy
- retrieval ranking
- document storage
- authentication

---

## Future Improvements

Possible extensions:

- async indexing workers
- hybrid search (BM25 + vectors)
- metadata filtering
- streaming ingestion
- S3 document storage
- hosted SaaS version

---

## License

MIT License

EOF
