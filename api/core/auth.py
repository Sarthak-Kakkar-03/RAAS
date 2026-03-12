from typing import Optional

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from api.services.project_registry import get_project, verify_project_api_key

bearer_scheme = HTTPBearer(auto_error=False)


def get_bearer_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> str:
    """
    Extracts the bearer token string from HTTP Authorization credentials.
    
    Raises:
        HTTPException: 401 if the Authorization header is missing or contains an empty token.
    
    Returns:
        str: The bearer token with surrounding whitespace removed.
    """
    if not credentials or not credentials.credentials.strip():
        raise HTTPException(status_code=401, detail="Missing Bearer token")
    return credentials.credentials.strip()


def require_project_key(project_id: str, token: str):
    """
    Ensure the project exists and that the provided token is the project's valid API key.
    
    Parameters:
        project_id (str): Identifier of the project to validate.
        token (str): API key token to verify for the project.
    
    Returns:
        The project object corresponding to `project_id`.
    
    Raises:
        HTTPException: with status 404 if the project does not exist.
        HTTPException: with status 403 if the provided token is not a valid API key for the project.
    """
    proj = get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    if not verify_project_api_key(project_id, token):
        raise HTTPException(status_code=403, detail="Invalid API key")

    return proj
