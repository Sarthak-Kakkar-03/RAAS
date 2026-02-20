from fastapi import FastAPI

from .routes.health import router as health_router
from .routes.projects import router as projects_router
from .routes.jobs import router as jobs_router
from .routes.legacy import router as legacy_router

def create_app() -> FastAPI:
    app = FastAPI(title="RaaS", version="0.1.0")
    app.include_router(health_router)
    app.include_router(projects_router)
    app.include_router(jobs_router)
    app.include_router(legacy_router)
    return app

app = create_app()