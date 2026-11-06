"""
app/core/config.py
------------------
Application settings loaded from environment variables (or a .env file).
Uses Pydantic v2 BaseSettings for type-safe configuration.

Do NOT import this module at the top-level of model/router files to avoid
circular imports — import `get_settings()` inside functions if needed, or
import the `settings` singleton defined at the bottom of this file.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- Database ---
    db_name: str = "logicat_rh"
    db_user: str = "logicat"
    db_password: str = "changeme"
    database_url: str = "postgresql://logicat:changeme@localhost:5432/logicat_rh"

    # --- Security ---
    secret_key: str = "CHANGE_ME_IN_PRODUCTION"

    # --- JWT ---
    jwt_expires_min: int = 30

    # --- CORS ---
    # Stored as a raw comma-separated string in env; exposed as list[str].
    cors_origins: str = "http://localhost:5173"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _parse_cors(cls, v: str | list) -> str:
        """Accept either a comma-separated string or a JSON list from the env."""
        if isinstance(v, list):
            return ",".join(v)
        return v

    @property
    def cors_origins_list(self) -> list[str]:
        """Return CORS_ORIGINS as a list of stripped origin strings."""
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    # --- Seed ---
    seed_demo_data: bool = True


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the cached Settings singleton."""
    return Settings()


# Module-level singleton — import this in most places.
settings = get_settings()
