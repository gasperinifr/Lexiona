from supabase import create_client, Client
from app.config import settings

# Cliente com chave anon (respeita RLS) para operacoes de usuario
supabase: Client = create_client(settings.supabase_url, settings.supabase_anon_key)

# Cliente com service_role (bypass RLS) apenas para operacoes administrativas
supabase_admin: Client = create_client(settings.supabase_url, settings.supabase_service_key)


def get_supabase() -> Client:
    return supabase


def get_supabase_admin() -> Client:
    return supabase_admin
