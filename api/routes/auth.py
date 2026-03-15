import time

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response

from api.core.auth import (
    ADMIN_SESSION_COOKIE_NAME,
    create_admin_session_token,
    get_admin_session_token,
    is_admin_auth_configured,
    require_admin_session,
    revoke_admin_session,
    verify_admin_password,
)
from api.core.config import settings
from api.models.schemas import AdminLoginIn

router = APIRouter(prefix="/auth", tags=["auth"])
_LOGIN_ATTEMPT_WINDOW_SECONDS = 300
_MAX_LOGIN_ATTEMPTS = 5
_login_attempts: dict[str, dict[str, float | int]] = {}


def _get_client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for", "")
    if forwarded_for:
        return forwarded_for.split(",", maxsplit=1)[0].strip()
    return request.client.host if request.client else "unknown"


def _prune_login_attempts(now: float) -> None:
    expired_ips = [
        ip
        for ip, state in _login_attempts.items()
        if now - float(state["last_failed_at"]) > _LOGIN_ATTEMPT_WINDOW_SECONDS
    ]
    for ip in expired_ips:
        _login_attempts.pop(ip, None)


def _enforce_login_rate_limit(ip: str) -> None:
    now = time.time()
    _prune_login_attempts(now)
    state = _login_attempts.get(ip)
    if not state:
        return

    attempts = int(state["attempts"])
    if attempts < _MAX_LOGIN_ATTEMPTS:
        return

    backoff_seconds = min(60, 2 ** (attempts - _MAX_LOGIN_ATTEMPTS))
    retry_after = float(state["last_failed_at"]) + backoff_seconds - now
    if retry_after > 0:
        raise HTTPException(
            status_code=429,
            detail="Too many login attempts. Try again later.",
            headers={"Retry-After": str(max(1, int(retry_after)))},
        )


def _record_failed_login(ip: str) -> None:
    now = time.time()
    state = _login_attempts.get(ip)
    if (
        not state
        or now - float(state["last_failed_at"]) > _LOGIN_ATTEMPT_WINDOW_SECONDS
    ):
        _login_attempts[ip] = {"attempts": 1, "last_failed_at": now}
        return

    state["attempts"] = int(state["attempts"]) + 1
    state["last_failed_at"] = now


def _reset_failed_logins(ip: str) -> None:
    _login_attempts.pop(ip, None)


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
def login(body: AdminLoginIn, request: Request, response: Response):
    if not is_admin_auth_configured():
        response.status_code = 503
        return {"ok": False, "detail": "Admin auth is not configured"}

    client_ip = _get_client_ip(request)
    _enforce_login_rate_limit(client_ip)

    if not verify_admin_password(body.password):
        _record_failed_login(client_ip)
        response.status_code = 401
        return {"ok": False, "detail": "Invalid password"}

    _reset_failed_logins(client_ip)
    _set_admin_session_cookie(response, create_admin_session_token())
    return {"ok": True, "authenticated": True}


@router.get("/session")
def get_session_status(admin_session: str = Depends(get_admin_session_token)):
    require_admin_session(admin_session)
    return {"ok": True, "authenticated": True}


@router.post("/logout")
def logout(
    response: Response,
    admin_session: str | None = Cookie(default=None, alias=ADMIN_SESSION_COOKIE_NAME),
):
    if admin_session:
        revoke_admin_session(admin_session)
    response.delete_cookie(
        key=ADMIN_SESSION_COOKIE_NAME,
        httponly=True,
        samesite="lax",
        secure=settings.admin_session_cookie_secure,
        path="/",
    )
    return {"ok": True, "authenticated": False}
