from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
import os


class ChromaSettings(BaseSettings):
    """Chroma Application settings for loading env

    Args:
        BaseSettings (_type_): _description_
    """

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[2] / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )
    persist_dir: str = Field(default="data/chroma")
    collection_name: str = Field(default="raas_docs")


chroma_settings = ChromaSettings()
