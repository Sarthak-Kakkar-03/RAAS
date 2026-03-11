from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

from api.core.db import get_conn
from api.models.schemas import ProjectOut, ProjectPublic


def init_projects_registry() -> None:
    with get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                api_key TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """)


def create_project(*, project_id: str, name: str, api_key: str) -> ProjectOut:
    init_projects_registry()
    created_at = datetime.now(timezone.utc).isoformat()
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO projects (id, name, api_key, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (project_id, name, api_key, created_at),
        )
    return ProjectOut(id=project_id, name=name, api_key=api_key)


def get_project(project_id: str) -> Optional[ProjectOut]:
    init_projects_registry()
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id, name, api_key FROM projects WHERE id=?",
            (project_id,),
        ).fetchone()
    if not row:
        return None
    return ProjectOut(id=row["id"], name=row["name"], api_key=row["api_key"])


def list_projects() -> List[ProjectPublic]:
    init_projects_registry()
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT id, name FROM projects ORDER BY created_at DESC"
        ).fetchall()
    return [ProjectPublic(id=row["id"], name=row["name"]) for row in rows]
