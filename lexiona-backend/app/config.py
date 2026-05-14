from pydantic_settings import BaseSettings
from pydantic import field_validator


class Settings(BaseSettings):
    supabase_url: str
    supabase_anon_key: str
    supabase_service_key: str
    groq_api_key: str
    secret_key: str
    frontend_url: str = "http://localhost:5173"
    environment: str = "development"

    @field_validator("supabase_url")
    @classmethod
    def normalize_supabase_url(cls, value: str) -> str:
        return value.rstrip("/")

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
