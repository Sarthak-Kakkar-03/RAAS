# RaaS Frontend

This app is the web interface for RaaS. It handles admin authentication, project creation, document uploads, ingestion triggers, and retrieval queries against the backend API.

## Responsibilities

- admin login/logout flow
- create and delete projects
- upload project documents
- trigger ingest runs
- query indexed content from the browser

## Local Development

Install dependencies and start the app:

```bash
npm install
npm run dev
```

The frontend expects the backend and local services to be running from the repo root:

```bash
docker compose up -d
```

Default local app URL:

```text
http://localhost:3000
```

## Notes

- The frontend is part of the main RaaS repo and is not intended to be deployed as a standalone product.
- Project and API behavior are documented in the root [README.md](/Users/sarthakkakkar/Desktop/Projects/RAAS/RAAS/README.md) and [DEV_README.md](/Users/sarthakkakkar/Desktop/Projects/RAAS/RAAS/DEV_README.md).
