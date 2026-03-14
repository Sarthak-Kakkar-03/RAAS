from __future__ import annotations

import hashlib
import hmac
import logging
import os
from datetime import datetime, timezone
from typing import List, Optional

from api.core.db import get_conn
from api.models.schemas import ProjectOut, ProjectPublic

_API_KEY_DIGEST_PREFIX = "hmac-sha256:"
_DEFAULT_API_KEY_SECRET = "dev-only-change-me"
_API_KEY_SECRET = os.getenv("PROJECT_API_KEY_SECRET", _DEFAULT_API_KEY_SECRET)
_logger = logging.getLogger(__name__)
_secret_warning_logged = False


def _digest_api_key(api_key: str) -> str:
    """Hash a raw project API key using the configured HMAC secret."""
    digest = hmac.new(
        _API_KEY_SECRET.encode("utf-8"),
        api_key.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return f"{_API_KEY_DIGEST_PREFIX}{digest}"


def init_projects_registry() -> None:
    """Create the projects table and migrate any plain-text API keys."""
    global _secret_warning_logged
    if _API_KEY_SECRET == _DEFAULT_API_KEY_SECRET and not _secret_warning_logged:
        _logger.warning(
            "PROJECT_API_KEY_SECRET is not set; using development fallback secret. "
            "Set PROJECT_API_KEY_SECRET for shared or production deployments."
        )
        _secret_warning_logged = True

    with get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                api_key TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """)
        rows = conn.execute(
            "SELECT id, api_key FROM projects WHERE api_key NOT LIKE ?",
            (f"{_API_KEY_DIGEST_PREFIX}%",),
        ).fetchall()
        for row in rows:
            conn.execute(
                "UPDATE projects SET api_key=? WHERE id=?",
                (_digest_api_key(row["api_key"]), row["id"]),
            )


def create_project(*, project_id: str, name: str, api_key: str) -> ProjectOut:
    """Persist a new project and return its one-time plain API key."""
    init_projects_registry()
    created_at = datetime.now(timezone.utc).isoformat()
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO projects (id, name, api_key, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (project_id, name, _digest_api_key(api_key), created_at),
        )
    return ProjectOut(id=project_id, name=name, api_key=api_key)


def get_project(project_id: str) -> Optional[ProjectPublic]:
    """Return the public project record for a project id, if present."""
    init_projects_registry()
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id, name FROM projects WHERE id=?",
            (project_id,),
        ).fetchone()
    if not row:
        return None
    return ProjectPublic(id=row["id"], name=row["name"])


def list_projects() -> List[ProjectPublic]:
    """List public projects ordered by most recent creation time."""
    init_projects_registry()
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT id, name FROM projects ORDER BY created_at DESC"
        ).fetchall()
    return [ProjectPublic(id=row["id"], name=row["name"]) for row in rows]


def verify_project_api_key(project_id: str, api_key: str) -> bool:
    """Check whether a raw API key matches the stored digest for a project."""
    init_projects_registry()
    with get_conn() as conn:
        row = conn.execute(
            "SELECT api_key FROM projects WHERE id=?",
            (project_id,),
        ).fetchone()
    if not row:
        return False
    expected = row["api_key"]
    actual = _digest_api_key(api_key)
    return hmac.compare_digest(expected, actual)


def delete_project(project_id: str) -> None:
    """Delete a project record from the registry."""
    init_projects_registry()
    with get_conn() as conn:
        conn.execute("DELETE FROM projects WHERE id=?", (project_id,))
