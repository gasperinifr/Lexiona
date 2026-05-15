from fastapi import APIRouter, Depends
from app.database import supabase_admin
from app.dependencies import get_current_user
from app.services import cache_service
from datetime import date
from collections import defaultdict

router = APIRouter(prefix="/relatorios", tags=["Relatórios"])


@router.get("/disciplina/{disciplina_id}")
async def relatorio_disciplina(
    disciplina_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Relatório detalhado de uma disciplina:
    - Aulas por status
    - Progresso mensal
    - Percentual de cumprimento por unidade temática (quando disponível)
    """
    professor_id = current_user["id"]
    cache_key = f"lexiona:{professor_id}:relatorio:{disciplina_id}"

    cached = await cache_service.get(cache_key)
    if cached is not None:
        return cached

    # Buscar disciplina
    disc_resp = supabase_admin.table("disciplinas").select("*").eq(
        "id", disciplina_id
    ).eq("professor_id", professor_id).single().execute()

    if not disc_resp.data:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Disciplina não encontrada.")

    disciplina = disc_resp.data

    # Buscar todas as aulas
    aulas_resp = supabase_admin.table("aulas").select("*").eq(
        "disciplina_id", disciplina_id
    ).order("data").execute()

    aulas = aulas_resp.data or []

    # Totais por status
    por_status = defaultdict(int)
    for a in aulas:
        por_status[a["status"]] += 1

    total = len(aulas)
    planejadas = por_status["planejada"]
    realizadas = por_status["realizada"]
    pendentes = por_status["pendente"]
    canceladas = por_status["cancelada"]

    # Progresso por mês
    por_mes = defaultdict(lambda: {"total": 0, "planejadas": 0, "realizadas": 0, "canceladas": 0})
    for a in aulas:
        mes = a["data"][:7]  # YYYY-MM
        por_mes[mes]["total"] += 1
        if a["status"] in ("planejada", "realizada"):
            por_mes[mes]["planejadas"] += 1
        if a["status"] == "realizada":
            por_mes[mes]["realizadas"] += 1
        if a["status"] == "cancelada":
            por_mes[mes]["canceladas"] += 1

    progresso_mensal = [
        {
            "mes": mes,
            "mes_label": _formatar_mes(mes),
            **dados,
            "percentual": round((dados["planejadas"] / dados["total"] * 100) if dados["total"] > 0 else 0, 1),
        }
        for mes, dados in sorted(por_mes.items())
    ]

    # Taxa de cumprimento (realizadas / total com data passada)
    hoje = str(date.today())
    aulas_passadas = [a for a in aulas if a["data"] <= hoje]
    realizadas_passadas = sum(1 for a in aulas_passadas if a["status"] == "realizada")
    taxa_cumprimento = round(
        (realizadas_passadas / len(aulas_passadas) * 100) if aulas_passadas else 0, 1
    )

    result = {
        "disciplina": {
            "id": disciplina["id"],
            "nome": disciplina["nome"],
            "turma": disciplina.get("turma"),
            "turno": disciplina.get("turno"),
            "nivel": disciplina.get("nivel"),
            "bncc_componente": disciplina.get("bncc_componente"),
        },
        "resumo": {
            "total": total,
            "planejadas": planejadas,
            "realizadas": realizadas,
            "pendentes": pendentes,
            "canceladas": canceladas,
            "percentual_planejado": round((planejadas / total * 100) if total > 0 else 0, 1),
            "percentual_realizado": round((realizadas / total * 100) if total > 0 else 0, 1),
            "taxa_cumprimento": taxa_cumprimento,
        },
        "progresso_mensal": progresso_mensal,
    }

    await cache_service.set(cache_key, result, ttl=600)
    return result


@router.get("/geral")
async def relatorio_geral(current_user: dict = Depends(get_current_user)):
    """Visão geral de todas as disciplinas ativas."""
    professor_id = current_user["id"]
    cache_key = f"lexiona:{professor_id}:relatorio_geral"

    cached = await cache_service.get(cache_key)
    if cached is not None:
        return cached

    disc_resp = supabase_admin.table("disciplinas").select("*").eq(
        "professor_id", professor_id
    ).eq("ativa", True).execute()

    disciplinas = disc_resp.data or []
    resumos = []

    for disc in disciplinas:
        aulas_resp = supabase_admin.table("aulas").select("status,data").eq(
            "disciplina_id", disc["id"]
        ).execute()
        aulas = aulas_resp.data or []
        total = len(aulas)
        planejadas = sum(1 for a in aulas if a["status"] in ("planejada", "realizada"))
        realizadas = sum(1 for a in aulas if a["status"] == "realizada")

        resumos.append({
            "id": disc["id"],
            "nome": disc["nome"],
            "turma": disc.get("turma"),
            "turno": disc.get("turno"),
            "total_aulas": total,
            "planejadas": planejadas,
            "realizadas": realizadas,
            "percentual_planejado": round((planejadas / total * 100) if total > 0 else 0, 1),
            "percentual_realizado": round((realizadas / total * 100) if total > 0 else 0, 1),
        })

    result = {
        "disciplinas": resumos,
        "total_disciplinas": len(resumos),
        "total_aulas": sum(d["total_aulas"] for d in resumos),
        "total_planejadas": sum(d["planejadas"] for d in resumos),
        "total_realizadas": sum(d["realizadas"] for d in resumos),
    }

    await cache_service.set(cache_key, result, ttl=600)
    return result


def _formatar_mes(mes_str: str) -> str:
    """Converte YYYY-MM para 'Jan/2026'."""
    meses = {
        "01": "Jan", "02": "Fev", "03": "Mar", "04": "Abr",
        "05": "Mai", "06": "Jun", "07": "Jul", "08": "Ago",
        "09": "Set", "10": "Out", "11": "Nov", "12": "Dez",
    }
    ano, mes = mes_str.split("-")
    return f"{meses.get(mes, mes)}/{ano}"
