"""
PharmaTimer F3-S1-bis Step 4 CP1-code
Pydantic Settings loader from .env.dev (auto via python-dotenv).
Single source of truth for runtime configuration.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env.dev",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Database (mysql-connector-python direct, no ORM)
    DB_HOST: str = "127.0.0.1"
    DB_PORT: int = 3306
    DB_USER: str = "pharmatimer"
    DB_PASSWORD: str
    DB_NAME: str = "pharmatimer_dev"
    DB_NAME_TEST: str = "pharmatimer_test"
    DB_POOL_SIZE: int = 5

    # API server
    API_HOST: str = "127.0.0.1"
    API_PORT: int = 8000

    # CORS dev permissive (prod restrictive deferred F3-S6)
    CORS_ORIGINS: str = "http://localhost:5173"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
