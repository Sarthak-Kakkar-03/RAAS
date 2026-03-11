from fastapi import HTTPException
from typing import Optional
from api.services.project_registry import get_project


def require_project_key(project_id: str, authorization: Optional[str]):
    proj = get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Bearer token")

    token = authorization.split(" ", 1)[1].strip()
    if token != proj.api_key:
        raise HTTPException(status_code=403, detail="Invalid API key")

    return proj
