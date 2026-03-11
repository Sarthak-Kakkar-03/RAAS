from typing import Optional

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from api.services.project_registry import get_project, verify_project_api_key

bearer_scheme = HTTPBearer(auto_error=False)


def get_bearer_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> str:
    if not credentials or not credentials.credentials.strip():
        raise HTTPException(status_code=401, detail="Missing Bearer token")
    return credentials.credentials.strip()


def require_project_key(project_id: str, token: str):
    proj = get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    if not verify_project_api_key(project_id, token):
        raise HTTPException(status_code=403, detail="Invalid API key")

    return proj
