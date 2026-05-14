from fastapi import APIRouter, HTTPException, Depends
from app.models.schemas import AulaUpdate
from app.database import supabase_admin
from app.dependencies import get_current_user

router = APIRouter(prefix="/aulas", tags=["Aulas"])


def verificar_acesso_aula(aula_id: str, professor_id: str):
    """Verifica se a aula pertence ao professor via disciplina."""
    response = supabase_admin.table("aulas").select(
        "*, disciplinas!inner(professor_id)"
    ).eq("id", aula_id).single().execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Aula não encontrada")
    if response.data["disciplinas"]["professor_id"] != professor_id:
        raise HTTPException(status_code=403, detail="Acesso negado")
    return response.data


@router.get("/disciplina/{disciplina_id}")
async def listar_aulas_disciplina(
    disciplina_id: str,
    current_user: dict = Depends(get_current_user)
):
    # Verificar que a disciplina pertence ao professor
    disc = supabase_admin.table("disciplinas").select("id").eq(
        "id", disciplina_id
    ).eq("professor_id", current_user["id"]).execute()

    if not disc.data:
        raise HTTPException(status_code=404, detail="Disciplina não encontrada")

    aulas = supabase_admin.table("aulas").select("*").eq(
        "disciplina_id", disciplina_id
    ).order("data").execute()

    return aulas.data or []


@router.get("/{aula_id}")
async def get_aula(aula_id: str, current_user: dict = Depends(get_current_user)):
    aula = verificar_acesso_aula(aula_id, current_user["id"])
    return aula


@router.put("/{aula_id}")
async def atualizar_aula(
    aula_id: str,
    dados: AulaUpdate,
    current_user: dict = Depends(get_current_user),
):
    verificar_acesso_aula(aula_id, current_user["id"])

    update_data = {k: v for k, v in dados.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhum dado para atualizar")

    # Se tem conteúdo, marcar como planejada
    if any(k in update_data for k in ["tema", "objetivos", "conteudos"]):
        update_data["status"] = "planejada"

    response = supabase_admin.table("aulas").update(update_data).eq("id", aula_id).execute()
    return response.data[0] if response.data else {}


@router.patch("/{aula_id}/status")
async def atualizar_status(
    aula_id: str,
    status: str,
    current_user: dict = Depends(get_current_user),
):
    status_validos = ["planejada", "pendente", "cancelada", "realizada"]
    if status not in status_validos:
        raise HTTPException(status_code=400, detail=f"Status inválido. Use: {status_validos}")

    verificar_acesso_aula(aula_id, current_user["id"])
    response = supabase_admin.table("aulas").update({"status": status}).eq("id", aula_id).execute()
    return response.data[0] if response.data else {}