from __future__ import annotations
from chromadb.api.models.Collection import Collection
from dataclasses import dataclass
from typing import List, Optional

import chromadb

from api.core.config import CHROMA_HOST, CHROMA_PORT


@dataclass(frozen=True)
class ChunkRecord:
    """data class for chunks"""

    id: str
    text: str
    metadata: dict
    embedding: Optional[List[float]] = None


class ChromaRepo:

    def __init__(self, host: str = CHROMA_HOST, port: int = CHROMA_PORT):
        self._client = chromadb.HttpClient(host=host, port=port)

    def heartbeat(self) -> bool:
        try:
            self._client.heartbeat()
            return True
        except Exception:
            return False

    @staticmethod
    def collection_name(project_id: str):
        return f"raas_{project_id}"

    def collection(self, project_id: str) -> Collection:
        return self._client.get_or_create_collection(
            name=self.collection_name(project_id)
        )

    def upsert_chunks(self, project_id: str, chunks: List[ChunkRecord]) -> None:
        if not chunks:
            return
        col = self.collection(project_id=project_id)
        ids = [c.id for c in chunks]
        documents = [c.text for c in chunks]
        metadatas = [c.metadata for c in chunks]
        has_embeddings = [c.embedding is not None for c in chunks]

        if all(has_embeddings):
            embeddings = [c.embedding for c in chunks]
            col.upsert(
                ids=ids, documents=documents, metadatas=metadatas, embeddings=embeddings
            )
            return
        if any(has_embeddings):
            raise ValueError(
                "Mixed embeddings state: some chunks have embeddings and some do not."
            )

        col.upsert(ids=ids, documents=documents, metadatas=metadatas)

    def delete_by_doc_id(self, project_id: str, doc_id: str) -> None:
        col = self.collection(project_id)
        col.delete(where={"doc_id": doc_id})

    def replace_by_doc_id(
        self, project_id: str, doc_id: str, chunks: List[ChunkRecord]
    ) -> None:
        """
        Safely replace all chunks for a doc:
        1) upsert new chunks
        2) delete only stale previous chunk ids
        """
        if not chunks:
            self.delete_by_doc_id(project_id=project_id, doc_id=doc_id)
            return

        col = self.collection(project_id)
        previous = col.get(where={"doc_id": doc_id})
        previous_ids = set(previous.get("ids") or [])

        self.upsert_chunks(project_id=project_id, chunks=chunks)

        new_ids = {c.id for c in chunks}
        stale_ids = sorted(previous_ids - new_ids)
        if stale_ids:
            col.delete(ids=stale_ids)

    def count_chunks(self, project_id: str) -> int:
        col = self.collection(project_id)
        return col.count()

    def delete_collection(self, project_id: str) -> None:
        self._client.delete_collection(name=self.collection_name(project_id))


def heartbeat() -> bool:
    return ChromaRepo().heartbeat()


def get_or_create_project_collection(project_id: str) -> Collection:
    return ChromaRepo().collection(project_id)


def delete_project_collection(project_id: str) -> None:
    ChromaRepo().delete_collection(project_id)
