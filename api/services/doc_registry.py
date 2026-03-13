from __future__ import annotations
import sqlite3
from typing import List, Optional
from api.core.db import get_conn
from datetime import datetime, timezone
from dataclasses import dataclass


@dataclass(frozen=True)
class DocRecord:
    project_id: str
    doc_id: str
    filename: str
    status: str
    ingested: bool
    num_chunks: int
    created_at: str
    error: Optional[str] = None


def _row_to_doc_record(row) -> DocRecord:
    return DocRecord(
        project_id=row["project_id"],
        doc_id=row["doc_id"],
        filename=row["filename"],
        status=row["status"],
        ingested=bool(row["ingested"]),
        num_chunks=row["num_chunks"],
        created_at=row["created_at"],
        error=row["error"],
    )


def init_registry() -> None:
    with get_conn() as conn:
        conn.execute("""
    CREATE TABLE IF NOT EXISTS documents (
        project_id TEXT NOT NULL,
        doc_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        status TEXT NOT NULL,
        ingested INTEGER NOT NULL DEFAULT 0 CHECK (ingested IN (0, 1)),
        num_chunks INTEGER NOT NULL DEFAULT 0 CHECK (num_chunks >= 0),
        error TEXT,
        created_at TEXT NOT NULL,
        PRIMARY KEY (project_id, doc_id)
    )
    """)

        columns = {
            row["name"]
            for row in conn.execute("PRAGMA table_info(documents)").fetchall()
        }
        if "ingested" not in columns:
            try:
                conn.execute(
                    "ALTER TABLE documents ADD COLUMN ingested INTEGER NOT NULL DEFAULT 0 CHECK (ingested IN (0, 1))"
                )
            except sqlite3.OperationalError as exc:
                if "duplicate column name: ingested" not in str(exc).lower():
                    raise


def upsert_doc(
    *,
    project_id: str,
    doc_id: str,
    filename: str,
    status: str,
    ingested: bool = False,
    num_chunks: int = 0,
    error: Optional[str] = None,
) -> None:
    init_registry()
    created_at = datetime.now(timezone.utc).isoformat()

    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO documents (project_id, doc_id, filename, status, ingested, num_chunks, error, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(project_id, doc_id) DO UPDATE SET
                filename=excluded.filename,
                status=excluded.status,
                ingested=excluded.ingested,
                num_chunks=excluded.num_chunks,
                error=excluded.error
            """,
            (
                project_id,
                doc_id,
                filename,
                status,
                int(ingested),
                num_chunks,
                error,
                created_at,
            ),
        )


def list_docs(project_id: str) -> List[DocRecord]:
    init_registry()
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM documents WHERE project_id=? ORDER BY created_at DESC",
            (project_id,),
        ).fetchall()

    return [_row_to_doc_record(r) for r in rows]


def get_doc(project_id: str, doc_id: str) -> Optional[DocRecord]:
    init_registry()
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM documents WHERE project_id=? AND doc_id=?",
            (project_id, doc_id),
        ).fetchone()

    return _row_to_doc_record(row) if row else None


def delete_doc(project_id: str, doc_id: str) -> None:
    init_registry()
    with get_conn() as conn:
        conn.execute(
            "DELETE FROM documents WHERE project_id=? AND doc_id=?",
            (project_id, doc_id),
        )


def delete_docs_for_project(project_id: str) -> None:
    init_registry()
    with get_conn() as conn:
        conn.execute(
            "DELETE FROM documents WHERE project_id=?",
            (project_id,),
        )
