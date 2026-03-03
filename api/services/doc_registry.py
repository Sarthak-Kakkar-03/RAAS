from __future__ import annotations
from typing import List, Dict, Optional
from api.core.db import get_conn
from datetime import datetime
from dataclasses import dataclass


@dataclass(frozen=True)
class DocRecord:
    project_id: str
    doc_id: str
    filename: str
    status: str
    num_chunks: int
    created_at: str
    error: Optional[str] = None


def init_registry() -> None:
    with get_conn() as conn:
        conn.execute("""
    CREATE TABLE IF NOT EXISTS documents (
        project_id TEXT NOT NULL,
        doc_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        status TEXT NOT NULL,
        num_chunks INTEGER NOT NULL DEFAULT 0,
        error TEXT,
        created_at TEXT NOT NULL,
        PRIMARY KEY (project_id, doc_id)
    )
    """)


def upsert_doc(
    *,
    project_id: str,
    doc_id: str,
    filename: str,
    status: str,
    num_chunks: int = 0,
    error: Optional[str] = None,
) -> None:
    init_registry()
    created_at = datetime.now(timezone.utc).isoformat()

    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO documents (project_id, doc_id, filename, status, num_chunks, error, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(project_id, doc_id) DO UPDATE SET
                filename=excluded.filename,
                status=excluded.status,
                num_chunks=excluded.num_chunks,
                error=excluded.error
            """,
            (project_id, doc_id, filename, status, num_chunks, error, created_at),
        )


def list_docs(project_id: str) -> List[DocRecord]:
    init_registry()
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM documents WHERE project_id=? ORDER BY created_at DESC",
            (project_id,),
        ).fetchall()

    return [DocRecord(**dict(r)) for r in rows]


def get_doc(project_id: str, doc_id: str) -> Optional[DocRecord]:
    init_registry()
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM documents WHERE project_id=? AND doc_id=?",
            (project_id, doc_id),
        ).fetchone()

    return DocRecord(**dict(row)) if row else None


def delete_doc(project_id: str, doc_id: str) -> None:
    init_registry()
    with get_conn() as conn:
        conn.execute(
            "DELETE FROM documents WHERE project_id=? AND doc_id=?",
            (project_id, doc_id),
        )
