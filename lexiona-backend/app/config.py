from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import Optional


class Settings(BaseSettings):
    supabase_url: str
    supabase_anon_key: str
    supabase_service_key: str
    groq_api_key: str
    secret_key: str
    frontend_url: str = "http://localhost:5173"
    environment: str = "development"

    # Redis (opcional — sistema funciona sem ele)
    redis_url: Optional[str] = None

    # Google Calendar OAuth2 (opcional)
    google_client_id: Optional[str] = None
    google_client_secret: Optional[str] = None
    google_redirect_uri: str = "http://localhost:8000/google-calendar/callback"

    @field_validator("supabase_url")
    @classmethod
    def normalize_supabase_url(cls, value: str) -> str:
        return value.rstrip("/")

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
