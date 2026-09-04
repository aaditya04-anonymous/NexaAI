from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    app_name: str = "Nexa Growth Agent"
    app_env: str = "development"
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_database: str = "nexa"
    jwt_secret_key: str = "development-only-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    reset_token_expire_minutes: int = 30
    frontend_url: str = "http://localhost:8501"
    allowed_origins: str = "http://localhost:8501"
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.0-flash"
    tavily_api_key: str | None = None
    max_upload_bytes: int = 10_485_760

    @property
    def origins(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
