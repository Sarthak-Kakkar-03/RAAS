import sys
from pathlib import Path

from fastapi import FastAPI

# Ensure `api.*` imports resolve even when launched from the `api` directory.
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from api.routes.health import router as health_router
from api.routes.projects import router as projects_router
from api.routes.jobs import router as jobs_router
from api.routes.legacy import router as legacy_router

def create_app() -> FastAPI:
    app = FastAPI(title="RaaS", version="0.1.0")
    app.include_router(health_router)
    app.include_router(projects_router)
    app.include_router(jobs_router)
    app.include_router(legacy_router)
    return app

app = create_app()
