from fastapi import APIRouter, Depends
from app.database import supabase_admin
from app.dependencies import get_current_user
from datetime import date, timedelta

router = APIRouter(prefix="/agenda", tags=["Agenda"])


@router.get("/hoje")
async def agenda_hoje(current_user: dict = Depends(get_current_user)):
    hoje = date.today()
    return await _get_agenda_data(current_user["id"], hoje)


@router.get("/data/{data_str}")
async def agenda_data(data_str: str, current_user: dict = Depends(get_current_user)):
    try:
        data = date.fromisoformat(data_str)
    except ValueError:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Data inválida. Use YYYY-MM-DD.")
    return await _get_agenda_data(current_user["id"], data)


@router.get("/alertas")
async def alertas_planejamento(current_user: dict = Depends(get_current_user)):
    hoje = date.today()
    limite = hoje + timedelta(days=3)

    # Buscar disciplinas ativas
    disciplinas_resp = supabase_admin.table("disciplinas").select("id,nome").eq(
        "professor_id", current_user["id"]
    ).eq("ativa", True).execute()

    disciplinas = disciplinas_resp.data or []
    alertas = []

    for disc in disciplinas:
        aulas_pendentes = supabase_admin.table("aulas").select("data").eq(
            "disciplina_id", disc["id"]
        ).eq("status", "pendente").gte("data", str(hoje)).lte("data", str(limite)).execute()

        if aulas_pendentes.data:
            alertas.append({
                "disciplina": disc["nome"],
                "disciplina_id": disc["id"],
                "aulas_sem_plano": len(aulas_pendentes.data),
                "datas": [a["data"] for a in aulas_pendentes.data],
            })

    return {"alertas": alertas, "tem_alertas": len(alertas) > 0}


async def _get_agenda_data(professor_id: str, data: date) -> dict:
    # Buscar disciplinas ativas do professor
    disciplinas_resp = supabase_admin.table("disciplinas").select("id,nome,metodologia,nivel").eq(
        "professor_id", professor_id
    ).eq("ativa", True).execute()

    disciplinas = {d["id"]: d for d in (disciplinas_resp.data or [])}

    # Buscar aulas do dia
    aulas_resp = supabase_admin.table("aulas").select("*").eq(
        "data", str(data)
    ).in_("disciplina_id", list(disciplinas.keys())).order("numero_aula").execute()

    aulas_hoje = []
    for aula in (aulas_resp.data or []):
        disc = disciplinas.get(aula["disciplina_id"], {})
        aulas_hoje.append({
            **aula,
            "disciplina_nome": disc.get("nome", ""),
            "metodologia_disciplina": disc.get("metodologia", ""),
        })

    # Se não há aulas hoje, buscar próximo dia com aulas
    proximo_dia = None
    if not aulas_hoje:
        for i in range(1, 8):
            proxima = data + timedelta(days=i)
            resp = supabase_admin.table("aulas").select("data").in_(
                "disciplina_id", list(disciplinas.keys())
            ).eq("data", str(proxima)).limit(1).execute()
            if resp.data:
                proximo_dia = str(proxima)
                break

    return {
        "data": str(data),
        "aulas": aulas_hoje,
        "total_aulas": len(aulas_hoje),
        "proximo_dia_com_aula": proximo_dia,
    }