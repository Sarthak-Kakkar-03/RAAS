import sys
from pathlib import Path
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Ensure `api.*` imports resolve even when launched from the `api` directory.
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from api.routes.health import router as health_router
from api.routes.projects import router as projects_router
from api.routes.jobs import router as jobs_router
from api.routes.legacy import router as legacy_router
from api.routes.docs import router as doc_router
from api.routes.query import router as query_router
from api.routes.ingest import router as ingest_router


def _cors_allowed_origins() -> list[str]:
    """Parse the configured comma-separated CORS origins list."""
    raw_origins = os.getenv(
        "CORS_ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    )
    return [origin.strip() for origin in raw_origins.split(",") if origin.strip()]


def create_app() -> FastAPI:
    """Build and configure the FastAPI application instance."""
    app = FastAPI(title="RaaS", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_cors_allowed_origins(),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(health_router)
    app.include_router(projects_router)
    app.include_router(jobs_router)
    app.include_router(legacy_router)
    app.include_router(doc_router)
    app.include_router(query_router)
    app.include_router(ingest_router)
    return app


app = create_app()
