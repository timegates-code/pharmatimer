"""
PharmaTimer F3-S1-bis Step 4 CP1-code (refactored N+5.M-pivot-exec-beta-1)
Pydantic Settings loader from .env.dev (auto via python-dotenv).
Single source of truth for runtime configuration.

N+5.M-pivot-exec-beta-1 refactor (s.6.NN-Fase3 Q-I.1=(b)+Q-I.3=(b)):
- DB_USER/DB_PASSWORD now Optional (defaults-file mode supported, drift D-NEW#10 fix)
- NEW DB_DEFAULTS_FILE field for prod Mini deploy (~/.my-pharmatimer.cnf)
- NEW model_validator cross-field: either DB_DEFAULTS_FILE or (DB_USER+DB_PASSWORD)
- DB_HOST default localhost (was 127.0.0.1, drift D-NEW#7 fix)
- DB_NAME mandatory explicit (was pharmatimer_dev, drift D-NEW#9 fix)

SENTINEL_N5M_PIVOT_EXEC_BETA1_BACKEND_REFACTOR_APPLIED
"""

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env.dev",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Database (mysql-connector-python direct, no ORM)
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_USER: str | None = None
    DB_PASSWORD: str | None = None
    DB_NAME: str | None = None
    DB_NAME_TEST: str = "pharmatimer_test"
    DB_POOL_SIZE: int = 5
    DB_DEFAULTS_FILE: str | None = None

    # API server
    API_HOST: str = "127.0.0.1"
    API_PORT: int = 8000

    # CORS dev permissive (prod restrictive deferred F3-S6 beta-2)
    CORS_ORIGINS: str = "http://localhost:5173"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @model_validator(mode="after")
    def _validate_db_credentials(self) -> "Settings":
        """Cross-field validation: either defaults-file mode or direct user+password mode.

        DB_NAME always mandatory (no default to avoid silent prod misconfig, drift D-NEW#9).
        """
        if self.DB_NAME is None or self.DB_NAME == "":
            raise ValueError(
                "DB_NAME is required (no default to avoid silent prod misconfig)"
            )
        has_defaults_file = bool(self.DB_DEFAULTS_FILE)
        has_direct = bool(self.DB_USER) and bool(self.DB_PASSWORD)
        if not has_defaults_file and not has_direct:
            raise ValueError(
                "DB credentials required: set DB_DEFAULTS_FILE (defaults-file mode) "
                "or both DB_USER and DB_PASSWORD (direct mode)"
            )
        return self


settings = Settings()
