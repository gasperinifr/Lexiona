from fastapi import APIRouter, HTTPException, Depends
from app.models.schemas import AulaUpdate, AulaManualCreate
from app.database import supabase_admin
from app.dependencies import get_current_user
from app.services import cache_service

router = APIRouter(prefix="/aulas", tags=["Aulas"])


def verificar_acesso_aula(aula_id: str, professor_id: str):
    """Verifica se a aula pertence ao professor via disciplina."""
    response = supabase_admin.table("aulas").select(
        "*, disciplinas!inner(professor_id, id)"
    ).eq("id", aula_id).single().execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Aula não encontrada.")
    if response.data["disciplinas"]["professor_id"] != professor_id:
        raise HTTPException(status_code=403, detail="Acesso negado.")
    return response.data


@router.get("/disciplina/{disciplina_id}")
async def listar_aulas_disciplina(
    disciplina_id: str,
    current_user: dict = Depends(get_current_user)
):
    professor_id = current_user["id"]
    cache_key = f"lexiona:{professor_id}:aulas:{disciplina_id}"

    cached = await cache_service.get(cache_key)
    if cached is not None:
        return cached

    disc = supabase_admin.table("disciplinas").select("id").eq(
        "id", disciplina_id
    ).eq("professor_id", professor_id).execute()

    if not disc.data:
        raise HTTPException(status_code=404, detail="Disciplina não encontrada.")

    aulas = supabase_admin.table("aulas").select("*").eq(
        "disciplina_id", disciplina_id
    ).order("data").execute()

    data = aulas.data or []
    await cache_service.set(cache_key, data, ttl=600)
    return data


@router.get("/{aula_id}")
async def get_aula(aula_id: str, current_user: dict = Depends(get_current_user)):
    return verificar_acesso_aula(aula_id, current_user["id"])


@router.put("/{aula_id}")
async def atualizar_aula(
    aula_id: str,
    dados: AulaUpdate,
    current_user: dict = Depends(get_current_user),
):
    aula = verificar_acesso_aula(aula_id, current_user["id"])
    disciplina_id = aula["disciplinas"]["id"]

    update_data = {k: v for k, v in dados.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhum dado para atualizar.")

    # Se tem conteúdo, marcar como planejada
    if any(k in update_data for k in ["tema", "objetivos", "conteudos"]):
        update_data["status"] = "planejada"

    response = supabase_admin.table("aulas").update(update_data).eq("id", aula_id).execute()

    await cache_service.invalidar_disciplina(current_user["id"], disciplina_id)
    return response.data[0] if response.data else {}


@router.patch("/{aula_id}/status")
async def atualizar_status(
    aula_id: str,
    status: str,
    current_user: dict = Depends(get_current_user),
):
    status_validos = ["planejada", "pendente", "cancelada", "realizada"]
    if status not in status_validos:
        raise HTTPException(
            status_code=400,
            detail=f"Status inválido. Valores aceitos: {', '.join(status_validos)}",
        )

    aula = verificar_acesso_aula(aula_id, current_user["id"])
    disciplina_id = aula["disciplinas"]["id"]

    response = supabase_admin.table("aulas").update({"status": status}).eq("id", aula_id).execute()

    await cache_service.invalidar_disciplina(current_user["id"], disciplina_id)
    return response.data[0] if response.data else {}


@router.post("/manual", status_code=201)
async def criar_aula_manual(
    dados: AulaManualCreate,
    current_user: dict = Depends(get_current_user),
):
    """
    Cria uma aula manualmente para disciplinas no modo irregular.
    Também pode ser usado para adicionar aulas avulsas em disciplinas periódicas.
    """
    professor_id = current_user["id"]

    # Verificar que a disciplina pertence ao professor
    disc_resp = supabase_admin.table("disciplinas").select("id,modo_planejamento").eq(
        "id", dados.disciplina_id
    ).eq("professor_id", professor_id).single().execute()

    if not disc_resp.data:
        raise HTTPException(status_code=404, detail="Disciplina não encontrada.")

    # Verificar se já existe aula nesta data para esta disciplina
    existente = supabase_admin.table("aulas").select("id").eq(
        "disciplina_id", dados.disciplina_id
    ).eq("data", str(dados.data)).execute()

    if existente.data:
        raise HTTPException(
            status_code=409,
            detail="Já existe uma aula cadastrada nesta data para esta disciplina.",
        )

    # Calcular próximo número de aula
    ultima = supabase_admin.table("aulas").select("numero_aula").eq(
        "disciplina_id", dados.disciplina_id
    ).order("numero_aula", desc=True).limit(1).execute()
    proximo_numero = (ultima.data[0]["numero_aula"] or 0) + 1 if ultima.data else 1

    nova_aula = {
        "disciplina_id": dados.disciplina_id,
        "data": str(dados.data),
        "status": "pendente",
        "numero_aula": proximo_numero,
        "tema": dados.tema,
        "objetivos": dados.objetivos,
    }
    if dados.tema:
        nova_aula["status"] = "planejada"

    response = supabase_admin.table("aulas").insert(nova_aula).execute()
    await cache_service.invalidar_disciplina(professor_id, dados.disciplina_id)
    return response.data[0] if response.data else {}
