from app.config import settings

if settings.environment == "development":
    # Use an in-memory fake client in development to avoid requiring real Supabase/Groq
    from app.dev_client import create_fake_client

    supabase = create_fake_client()
    supabase_admin = supabase
else:
    from supabase import create_client, Client

    # Cliente com chave anon (respeita RLS) para operacoes de usuario
    supabase: Client = create_client(settings.supabase_url, settings.supabase_anon_key)

    # Cliente com service_role (bypass RLS) apenas para operacoes administrativas
    supabase_admin: Client = create_client(settings.supabase_url, settings.supabase_service_key)


def get_supabase():
    return supabase


def get_supabase_admin():
    return supabase_admin
