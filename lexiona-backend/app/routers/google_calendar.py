from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import RedirectResponse
from app.database import supabase_admin
from app.dependencies import get_current_user
from app.services import google_calendar_service as gcal
from app.models.schemas import GoogleCalendarSyncRequest
from app.config import settings

router = APIRouter(prefix="/google-calendar", tags=["Google Calendar"])


@router.get("/auth")
async def iniciar_oauth(current_user: dict = Depends(get_current_user)):
    """Retorna a URL de autorização do Google para o frontend redirecionar."""
    if not settings.google_client_id:
        raise HTTPException(
            status_code=503,
            detail="Integração com Google Calendar não está configurada neste servidor.",
        )
    url = gcal.gerar_url_autorizacao(current_user["id"])
    return {"auth_url": url}


@router.get("/callback")
async def oauth_callback(code: str, state: str, error: str = None):
    """
    Recebe o callback do Google após autorização.
    state = professor_id
    """
    if error:
        return RedirectResponse(
            url=f"{settings.frontend_url}/app/configuracoes?google=error&reason={error}"
        )

    professor_id = state
    tokens = await gcal.trocar_code_por_tokens(code)

    # Salvar tokens no Supabase
    existente = supabase_admin.table("google_calendar_tokens").select("id").eq(
        "professor_id", professor_id
    ).execute()

    token_data = {
        "professor_id": professor_id,
        "access_token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"],
        "token_expiry": tokens.get("token_expiry"),
        "sincronizacao_ativa": True,
    }

    if existente.data:
        supabase_admin.table("google_calendar_tokens").update(token_data).eq(
            "professor_id", professor_id
        ).execute()
    else:
        supabase_admin.table("google_calendar_tokens").insert(token_data).execute()

    return RedirectResponse(
        url=f"{settings.frontend_url}/app/configuracoes?google=success"
    )


@router.get("/status")
async def status_conexao(current_user: dict = Depends(get_current_user)):
    """Verifica se o professor tem Google Calendar conectado."""
    resp = supabase_admin.table("google_calendar_tokens").select(
        "sincronizacao_ativa,token_expiry,calendar_id"
    ).eq("professor_id", current_user["id"]).execute()

    if not resp.data:
        return {"conectado": False}

    token = resp.data[0]
    return {
        "conectado": True,
        "sincronizacao_ativa": token.get("sincronizacao_ativa", True),
        "calendar_id": token.get("calendar_id", "primary"),
    }


@router.post("/sync")
async def sincronizar(
    dados: GoogleCalendarSyncRequest,
    current_user: dict = Depends(get_current_user),
):
    """Sincroniza aulas planejadas com o Google Calendar."""
    professor_id = current_user["id"]

    # Buscar tokens
    token_resp = supabase_admin.table("google_calendar_tokens").select("*").eq(
        "professor_id", professor_id
    ).single().execute()

    if not token_resp.data:
        raise HTTPException(
            status_code=400,
            detail="Conta Google não conectada. Conecte sua conta Google primeiro nas configurações.",
        )

    token = token_resp.data

    # Buscar disciplinas
    disc_query = supabase_admin.table("disciplinas").select("*").eq(
        "professor_id", professor_id
    ).eq("ativa", True)

    if dados.disciplina_ids:
        disc_query = disc_query.in_("id", dados.disciplina_ids)

    disc_resp = disc_query.execute()
    disciplinas_map = {d["id"]: d for d in (disc_resp.data or [])}

    if not disciplinas_map:
        raise HTTPException(status_code=404, detail="Nenhuma disciplina ativa encontrada.")

    # Buscar aulas para sincronizar
    aulas_resp = supabase_admin.table("aulas").select("*").in_(
        "disciplina_id", list(disciplinas_map.keys())
    ).in_("status", ["planejada", "pendente"]).order("data").execute()

    aulas = aulas_resp.data or []

    resultado = await gcal.sincronizar_aulas(
        access_token=token["access_token"],
        refresh_token=token["refresh_token"],
        calendar_id=token.get("calendar_id", "primary"),
        aulas=aulas,
        disciplinas_map=disciplinas_map,
    )

    # Salvar google_event_ids novos
    for aula in aulas:
        if aula.get("_novo_google_event_id"):
            supabase_admin.table("aulas").update({
                "google_event_id": aula["_novo_google_event_id"]
            }).eq("id", aula["id"]).execute()

    return {
        **resultado,
        "mensagem": f"{resultado['total']} evento(s) sincronizados com o Google Calendar.",
    }


@router.post("/disconnect")
async def desconectar(current_user: dict = Depends(get_current_user)):
    """Remove a integração com o Google Calendar."""
    supabase_admin.table("google_calendar_tokens").delete().eq(
        "professor_id", current_user["id"]
    ).execute()
    return {"message": "Google Calendar desconectado com sucesso."}
