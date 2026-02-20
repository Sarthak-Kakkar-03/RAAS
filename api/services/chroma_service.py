from __future__ import annotations

import chromadb
from chromadb.api.models.Collection import Collection

from ..core.config import CHROMA_HOST, CHROMA_PORT


def get_client() -> chromadb.HttpClient:
    # V1: simple HttpClient to local docker chroma
    return chromadb.HttpClient(host=CHROMA_HOST, port=CHROMA_PORT)


def heartbeat() -> bool:
    try:
        get_client().heartbeat()
        return True
    except Exception:
        return False


def collection_name(project_id: str) -> str:
    # deterministic per-project namespace
    return f"raas_{project_id}"


def get_or_create_project_collection(project_id: str) -> Collection:
    client = get_client()
    return client.get_or_create_collection(name=collection_name(project_id))