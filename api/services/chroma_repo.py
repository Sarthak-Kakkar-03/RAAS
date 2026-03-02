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

    def count_chunks(self, project_id: str) -> int:
        col = self.collection(project_id)
        return col.count()


def heartbeat() -> bool:
    return ChromaRepo().heartbeat()


def get_or_create_project_collection(project_id: str) -> Collection:
    return ChromaRepo().collection(project_id)
