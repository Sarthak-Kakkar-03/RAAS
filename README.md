# Retrieval-as-a-Service (RaaS)

RaaS is a self-hosted retrieval service for RAG workflows that you can clone and turn into your own retrieval pipeline.

It lets you:
- create projects
- upload documents
- ingest and index them into Chroma
- query relevant chunks through an API

RaaS handles retrieval only. Use it as a base layer for your own document pipeline, internal search flow, or RAG stack.

## What It Includes

- Next.js frontend for project and document management
- FastAPI backend
- Chroma vector storage
- per-project API keys for document and query access
- admin password flow for project create/delete

## How To Use It

1. Open the app.
2. Sign in with the admin password.
3. Create a project.
4. Save the project API key shown at creation time.
5. Upload documents and run ingest.
6. Query the project from the UI or API.

You can keep this flow as-is, or clone the repo and customize the ingestion, storage, and retrieval steps for your own use case.

## Retrieval Example

Direct API query:

```bash
curl -X POST http://localhost:8000/projects/<PROJECT_ID>/query \
  -H "Authorization: Bearer <PROJECT_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"query":"What does this document say?","top_k":5}'
```

If you are going through the frontend app instead of the API directly:

```bash
curl -X POST http://localhost:8080/api/projects/<PROJECT_ID>/query \
  -H "Authorization: Bearer <PROJECT_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"query":"What does this document say?","top_k":5}'
```

## Developer Notes

For local setup, deployment, and API/developer details, see [DEV_README.md](/DEV_README.md).
