from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    cors_allow_origins: str = "http://localhost:3000"

    supabase_jwt_secret: str = ""

    ace_api_base_url: str = ""
    ace_api_key: str = ""
    ace_model: str = "acestep-v15-turbo"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_allow_origins.split(",") if origin.strip()]

    @property
    def ace_headers(self) -> dict[str, str]:
        if not self.ace_api_key:
            return {}
        return {"Authorization": f"Bearer {self.ace_api_key}"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
