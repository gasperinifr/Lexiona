from fastapi import APIRouter, HTTPException, Depends, status
from app.models.schemas import DisciplinaCreate, DisciplinaUpdate, FeriadoCreate
from app.database import supabase_admin
from app.dependencies import get_current_user
from app.services.calendar_service import gerar_datas_aula

router = APIRouter(prefix="/disciplinas", tags=["Disciplinas"])


@router.get("/")
async def listar_disciplinas(current_user: dict = Depends(get_current_user)):
    response = supabase_admin.table("disciplinas").select("*").eq(
        "professor_id", current_user["id"]
    ).eq("ativa", True).order("created_at", desc=True).execute()
    return response.data or []


@router.post("/", status_code=status.HTTP_201_CREATED)
async def criar_disciplina(dados: DisciplinaCreate, current_user: dict = Depends(get_current_user)):
    # Criar a disciplina
    disciplina_data = {
        **dados.model_dump(),
        "professor_id": current_user["id"],
        "periodo_inicio": str(dados.periodo_inicio),
        "periodo_fim": str(dados.periodo_fim),
        "horario_inicio": str(dados.horario_inicio) if dados.horario_inicio else None,
        "horario_fim": str(dados.horario_fim) if dados.horario_fim else None,
    }

    response = supabase_admin.table("disciplinas").insert(disciplina_data).execute()

    if not response.data:
        raise HTTPException(status_code=400, detail="Erro ao criar disciplina")

    disciplina = response.data[0]
    disciplina_id = disciplina["id"]

    # Buscar feriados do professor para calcular datas
    feriados_resp = supabase_admin.table("feriados").select("data").eq(
        "professor_id", current_user["id"]
    ).execute()
    feriados = [f["data"] for f in (feriados_resp.data or [])]

    # Gerar estrutura de aulas (todas como "pendente")
    datas = gerar_datas_aula(
        periodo_inicio=dados.periodo_inicio,
        periodo_fim=dados.periodo_fim,
        dias_semana=dados.dias_semana,
        feriados=feriados,
    )

    if datas:
        aulas_data = [
            {
                "disciplina_id": disciplina_id,
                "data": str(d),
                "status": "pendente",
                "numero_aula": i + 1,
            }
            for i, d in enumerate(datas)
        ]
        supabase_admin.table("aulas").insert(aulas_data).execute()

    return {**disciplina, "total_aulas_geradas": len(datas)}


@router.get("/{disciplina_id}")
async def get_disciplina(disciplina_id: str, current_user: dict = Depends(get_current_user)):
    response = supabase_admin.table("disciplinas").select("*").eq(
        "id", disciplina_id
    ).eq("professor_id", current_user["id"]).single().execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Disciplina não encontrada")
    return response.data


@router.put("/{disciplina_id}")
async def atualizar_disciplina(
    disciplina_id: str,
    dados: DisciplinaUpdate,
    current_user: dict = Depends(get_current_user),
):
    update_data = {k: v for k, v in dados.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhum dado para atualizar")

    response = supabase_admin.table("disciplinas").update(update_data).eq(
        "id", disciplina_id
    ).eq("professor_id", current_user["id"]).execute()

    return response.data[0] if response.data else {}


@router.delete("/{disciplina_id}")
async def desativar_disciplina(disciplina_id: str, current_user: dict = Depends(get_current_user)):
    supabase_admin.table("disciplinas").update({"ativa": False}).eq(
        "id", disciplina_id
    ).eq("professor_id", current_user["id"]).execute()
    return {"message": "Disciplina removida com sucesso"}


@router.get("/{disciplina_id}/progresso")
async def get_progresso(disciplina_id: str, current_user: dict = Depends(get_current_user)):
    aulas_resp = supabase_admin.table("aulas").select("status").eq(
        "disciplina_id", disciplina_id
    ).execute()

    aulas = aulas_resp.data or []
    total = len(aulas)
    planejadas = sum(1 for a in aulas if a["status"] == "planejada")
    realizadas = sum(1 for a in aulas if a["status"] == "realizada")

    return {
        "total": total,
        "planejadas": planejadas,
        "realizadas": realizadas,
        "pendentes": total - planejadas - realizadas,
        "percentual_planejado": round((planejadas / total * 100) if total > 0 else 0, 1),
    }


# ============================================================
# FERIADOS
# ============================================================

@router.get("/feriados/lista")
async def listar_feriados(current_user: dict = Depends(get_current_user)):
    response = supabase_admin.table("feriados").select("*").eq(
        "professor_id", current_user["id"]
    ).order("data").execute()
    return response.data or []


@router.post("/feriados/")
async def adicionar_feriado(dados: FeriadoCreate, current_user: dict = Depends(get_current_user)):
    response = supabase_admin.table("feriados").insert({
        **dados.model_dump(),
        "professor_id": current_user["id"],
        "data": str(dados.data),
    }).execute()
    return response.data[0] if response.data else {}


@router.delete("/feriados/{feriado_id}")
async def remover_feriado(feriado_id: str, current_user: dict = Depends(get_current_user)):
    supabase_admin.table("feriados").delete().eq("id", feriado_id).eq(
        "professor_id", current_user["id"]
    ).execute()
    return {"message": "Feriado removido"}