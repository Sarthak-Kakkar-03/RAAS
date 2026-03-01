from __future__ import annotations
from typing import List, Sequence
from langchain_openai import OpenAIEmbeddings
from api.core.config import settings


def _sanitize(text: str) -> str:
    """Light cleanup so we don't embed garbage / null bytes."""
    return text.replace("\x00", "").strip()


def build_embedder(model: str | None = None) -> OpenAIEmbeddings:
    api_key = settings.openai_api_key.get_secret_value().strip()
    if not api_key:
        raise ValueError("OPENAI_API_KEY is not set")

    return OpenAIEmbeddings(
        model=model or settings.openai_embedding_model,
        openai_api_key=api_key,
    )


def embed_chunks(chunks: Sequence[str], model: str | None = None) -> List[List[float]]:
    embedder = build_embedder(model=model)
    cleaned = [_sanitize(c) for c in chunks]
    if not cleaned:
        raise ValueError("non empty chunks are needed to embed")
    vectors = embedder.embed_documents(list(cleaned))
    return vectors


def embed_query(query: str, model: str | None = None) -> List[float]:
    embedder = build_embedder(model=model)
    q = _sanitize(query)
    if not q:
        raise ValueError("cant embed empty query")
    return embedder.embed_query(q)
