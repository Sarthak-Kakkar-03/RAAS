from pathlib import Path
import os
from pydantic import BaseModel, Field, SecretStr, field_validator

DATA_DIR = Path("data")
RAW_DIR = DATA_DIR / "raw"
RAW_DIR.mkdir(parents=True, exist_ok=True)


CHROMA_HOST = os.getenv("CHROMA_HOST", "localhost")
CHROMA_PORT = int(os.getenv("CHROMA_PORT", "8001"))


class Settings(BaseModel):
    """
    Application settings loaded from environment variables.
    """

    openai_api_key: SecretStr = Field(
        default_factory=lambda: SecretStr(os.getenv("OPENAI_API_KEY", "")),
        validate_default=True,
    )
    openai_embedding_model: str = Field(
        default_factory=lambda: os.getenv(
            "OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"
        )
    )

    @field_validator("openai_api_key")
    @classmethod
    def validate_openai_api_key(cls, value: SecretStr) -> SecretStr:
        if not value.get_secret_value().strip():
            raise ValueError("OPENAI_API_KEY must be set")
        return value


settings = Settings()
