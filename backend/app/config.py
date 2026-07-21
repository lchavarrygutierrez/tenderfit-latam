from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "TenderFit LATAM API"
    environment: str = "development"
    frontend_origin: str = "http://localhost:3000"
    max_upload_mb: int = Field(default=20, ge=1, le=100)
    max_pages: int = Field(default=250, ge=1, le=1000)
    chunk_character_limit: int = Field(default=28_000, ge=5_000, le=80_000)
    max_chunks: int = Field(default=12, ge=1, le=50)
    use_mock_ai: bool = True
    openai_api_key: str | None = None
    openai_model: str = "gpt-5-mini"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def effective_mock_mode(self) -> bool:
        return self.use_mock_ai or not self.openai_api_key


@lru_cache
def get_settings() -> Settings:
    return Settings()
