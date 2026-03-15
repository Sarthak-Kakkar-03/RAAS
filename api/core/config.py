import os
from pathlib import Path

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

DATA_DIR = Path("data")
RAW_DIR = DATA_DIR / "raw"
RAW_DIR.mkdir(parents=True, exist_ok=True)


CHROMA_HOST = os.getenv("CHROMA_HOST", "localhost")
CHROMA_PORT = int(os.getenv("CHROMA_PORT", "8001"))


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    """

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[2] / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    openai_api_key: SecretStr = Field(default_factory=lambda: SecretStr(""))
    openai_embedding_model: str = Field(default="text-embedding-3-small")
    admin_password: SecretStr = Field(default_factory=lambda: SecretStr(""))
    admin_session_secret: SecretStr = Field(default_factory=lambda: SecretStr(""))
    admin_session_max_age_seconds: int = Field(default=86400, ge=300)
    admin_session_cookie_secure: bool = Field(default=False)


settings = Settings()
