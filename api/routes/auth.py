from fastapi import APIRouter, Depends, Response

from api.core.auth import (
    ADMIN_SESSION_COOKIE_NAME,
    create_admin_session_token,
    get_admin_session_token,
    is_admin_auth_configured,
    require_admin_session,
    verify_admin_password,
)
from api.core.config import settings
from api.models.schemas import AdminLoginIn

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_admin_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=ADMIN_SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        secure=settings.admin_session_cookie_secure,
        max_age=settings.admin_session_max_age_seconds,
        path="/",
    )


@router.post("/login")
def login(body: AdminLoginIn, response: Response):
    if not is_admin_auth_configured():
        response.status_code = 503
        return {"ok": False, "detail": "Admin auth is not configured"}

    if not verify_admin_password(body.password):
        response.status_code = 401
        return {"ok": False, "detail": "Invalid password"}

    _set_admin_session_cookie(response, create_admin_session_token())
    return {"ok": True, "authenticated": True}


@router.get("/session")
def get_session_status(admin_session: str = Depends(get_admin_session_token)):
    require_admin_session(admin_session)
    return {"ok": True, "authenticated": True}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(
        key=ADMIN_SESSION_COOKIE_NAME,
        httponly=True,
        samesite="lax",
        secure=settings.admin_session_cookie_secure,
        path="/",
    )
    return {"ok": True, "authenticated": False}
