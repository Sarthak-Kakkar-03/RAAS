from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class ProjectCreate(BaseModel):
    name: str

class ProjectOut(BaseModel):
    id: str
    name: str
    api_key: str

class QueryIn(BaseModel):
    query: str
    top_k: int = 5
    filters: Optional[Dict[str, Any]] = None

class QueryOut(BaseModel):
    results: List[Dict[str, Any]]
    latency_ms: int
    retrieval_debug: Dict[str, Any]