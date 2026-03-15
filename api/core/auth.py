import base64
import hashlib
import hmac
import json
import time
import uuid
from typing import Optional

from fastapi import Cookie, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from api.core.config import settings
from api.core.db import get_conn
from api.services.project_registry import get_project, verify_project_api_key

bearer_scheme = HTTPBearer(auto_error=False)
ADMIN_SESSION_COOKIE_NAME = "raas_admin_session"
_ADMIN_PASSWORD_VERSION_LENGTH = 16


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


def is_admin_auth_configured() -> bool:
    return bool(
        settings.admin_password.get_secret_value().strip()
        and settings.admin_session_secret.get_secret_value().strip()
    )


def verify_admin_password(password: str) -> bool:
    configured_password = settings.admin_password.get_secret_value().strip()
    return bool(configured_password) and hmac.compare_digest(
        password,
        configured_password,
    )


def _sign_admin_session(payload_b64: str) -> str:
    return hmac.new(
        settings.admin_session_secret.get_secret_value().encode("utf-8"),
        payload_b64.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def _get_admin_password_version() -> str:
    password = settings.admin_password.get_secret_value().strip().encode("utf-8")
    secret = settings.admin_session_secret.get_secret_value().encode("utf-8")
    return hmac.new(secret, password, hashlib.sha256).hexdigest()[
        :_ADMIN_PASSWORD_VERSION_LENGTH
    ]


def _init_admin_auth_registry() -> None:
    with get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS admin_sessions (
                sid TEXT PRIMARY KEY,
                password_version TEXT NOT NULL,
                expires_at INTEGER NOT NULL,
                created_at INTEGER NOT NULL
            )
            """)
        conn.execute(
            """
            DELETE FROM admin_sessions
            WHERE expires_at <= ?
            """,
            (int(time.time()),),
        )


def create_admin_session_token() -> str:
    _init_admin_auth_registry()
    sid = uuid.uuid4().hex
    expires_at = int(time.time()) + settings.admin_session_max_age_seconds
    password_version = _get_admin_password_version()
    created_at = int(time.time())

    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO admin_sessions (sid, password_version, expires_at, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (sid, password_version, expires_at, created_at),
        )

    payload = {
        "sid": sid,
        "sub": "admin",
        "exp": expires_at,
        "ver": password_version,
    }
    payload_json = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    payload_b64 = base64.urlsafe_b64encode(payload_json).decode("utf-8")
    signature = _sign_admin_session(payload_b64)
    return f"{payload_b64}.{signature}"


def _decode_admin_session_token(token: str) -> dict:
    if not is_admin_auth_configured():
        raise HTTPException(status_code=503, detail="Admin auth is not configured")

    try:
        payload_b64, signature = token.split(".", maxsplit=1)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="Invalid admin session") from exc

    expected_signature = _sign_admin_session(payload_b64)
    if not hmac.compare_digest(signature, expected_signature):
        raise HTTPException(status_code=401, detail="Invalid admin session")

    try:
        payload = json.loads(
            base64.urlsafe_b64decode(payload_b64.encode("utf-8")).decode("utf-8")
        )
    except (ValueError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=401, detail="Invalid admin session") from exc

    sid = payload.get("sid")
    exp = int(payload.get("exp", 0))
    password_version = payload.get("ver")
    if payload.get("sub") != "admin" or not sid or exp < int(time.time()):
        raise HTTPException(status_code=401, detail="Admin session expired")

    _init_admin_auth_registry()
    with get_conn() as conn:
        row = conn.execute(
            """
            SELECT sid, password_version, expires_at
            FROM admin_sessions
            WHERE sid=?
            """,
            (sid,),
        ).fetchone()

    if not row or row["expires_at"] < int(time.time()):
        raise HTTPException(status_code=401, detail="Admin session expired")

    if (
        row["password_version"] != password_version
        or password_version != _get_admin_password_version()
    ):
        raise HTTPException(status_code=401, detail="Admin session expired")

    return payload


def revoke_admin_session(token: str) -> None:
    try:
        payload_b64, _signature = token.split(".", maxsplit=1)
        payload = json.loads(
            base64.urlsafe_b64decode(payload_b64.encode("utf-8")).decode("utf-8")
        )
    except (ValueError, json.JSONDecodeError):
        return

    sid = payload.get("sid")
    if not sid:
        return

    _init_admin_auth_registry()
    with get_conn() as conn:
        conn.execute("DELETE FROM admin_sessions WHERE sid=?", (sid,))


def get_admin_session_token(
    admin_session: Optional[str] = Cookie(
        default=None,
        alias=ADMIN_SESSION_COOKIE_NAME,
    ),
) -> str:
    if not admin_session:
        raise HTTPException(status_code=401, detail="Missing admin session")
    return admin_session


def require_admin_session(
    admin_session: str = Depends(get_admin_session_token),
) -> dict:
    return _decode_admin_session_token(admin_session)
