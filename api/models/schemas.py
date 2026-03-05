from pydantic import AliasChoices, BaseModel, Field
from typing import Optional, List, Dict, Any


class ProjectCreate(BaseModel):
    name: str


class ProjectOut(BaseModel):
    id: str
    name: str
    api_key: str


class ProjectPublic(BaseModel):
    id: str
    name: str


class QueryIn(BaseModel):
    query: str = Field(..., min_length=1)
    top_k: int = Field(5, ge=1, le=50)
    where: Optional[Dict[str, Any]] = Field(
        default=None,
        validation_alias=AliasChoices("where", "filters"),
    )


class QueryOut(BaseModel):
    results: List[Dict[str, Any]]
    latency_ms: int
    retrieval_debug: Dict[str, Any]
    ok: bool = True


class DocumentOut(BaseModel):
    doc_id: str
    filename: str
    path: str
    bytes: int
    uploaded_at: float
    indexed: bool = False
