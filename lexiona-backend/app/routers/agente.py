import asyncio
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.database import supabase_admin
from app.dependencies import get_current_user
from app.models.schemas import (
    ChatMensagem,
    GerarIdeiasRequest,
    GerarPlanoRequest,
    InsumoTextoRequest,
    ReplanejamentoRequest,
)
from app.services import ai_service, cache_service, file_service

router = APIRouter(prefix="/agente", tags=["Agente IA"])


def _validar_disciplina_professor(disciplina_id: str, professor_id: str) -> dict:
    disc_resp = supabase_admin.table("disciplinas").select("*").eq(
        "id", disciplina_id
    ).eq("professor_id", professor_id).single().execute()

    if not disc_resp.data:
        raise HTTPException(status_code=404, detail="Disciplina nao encontrada.")
    return disc_resp.data


def _atualizar_job(job_id: str, **dados):
    supabase_admin.table("jobs_geracao").update(dados).eq("id", job_id).execute()


@router.post("/processar-texto")
async def processar_texto(
    dados: InsumoTextoRequest,
    current_user: dict = Depends(get_current_user),
):
    _validar_disciplina_professor(dados.disciplina_id, current_user["id"])
    conteudo = await ai_service.processar_texto_ementa(dados.texto)

    insumo = supabase_admin.table("insumos_ia").insert({
        "disciplina_id": dados.disciplina_id,
        "tipo": "texto",
        "conteudo_bruto": dados.texto,
        "conteudo_estruturado": conteudo,
        "status": "concluido",
    }).execute()

    return {
        "insumo_id": insumo.data[0]["id"] if insumo.data else None,
        "conteudo_estruturado": conteudo,
    }


@router.post("/processar-arquivo")
async def processar_arquivo(
    disciplina_id: str = Form(...),
    arquivo: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    _validar_disciplina_professor(disciplina_id, current_user["id"])
    conteudo_bytes = await arquivo.read()
    nome = arquivo.filename or "arquivo"
    ext = nome.rsplit(".", 1)[-1].lower() if "." in nome else ""

    if ext == "pdf":
        texto = file_service.extrair_texto_pdf(conteudo_bytes)
    elif ext in ("docx", "doc"):
        texto = file_service.extrair_texto_docx(conteudo_bytes)
    else:
        raise HTTPException(
            status_code=422,
            detail="Formato nao suportado. Envie um arquivo PDF ou DOCX.",
        )

    if not texto or len(texto.strip()) < 20:
        raise HTTPException(
            status_code=422,
            detail=(
                "Nao foi possivel extrair texto do arquivo. "
                "Verifique se o PDF nao e uma imagem escaneada, ou use texto digitado."
            ),
        )

    conteudo = await ai_service.processar_texto_ementa(texto)
    insumo = supabase_admin.table("insumos_ia").insert({
        "disciplina_id": disciplina_id,
        "tipo": "pdf" if ext == "pdf" else "docx",
        "conteudo_bruto": texto[:5000],
        "conteudo_estruturado": conteudo,
        "status": "concluido",
    }).execute()

    return {
        "insumo_id": insumo.data[0]["id"] if insumo.data else None,
        "conteudo_estruturado": conteudo,
    }


@router.post("/processar-audio")
async def processar_audio(
    disciplina_id: str = Form(...),
    audio: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    _validar_disciplina_professor(disciplina_id, current_user["id"])
    conteudo_bytes = await audio.read()
    filename = audio.filename or "gravacao.ogg"

    texto = await file_service.transcrever_audio(conteudo_bytes, filename)
    if not texto or len(texto.strip()) < 5:
        raise HTTPException(
            status_code=422,
            detail="A transcricao ficou muito curta ou vazia. Grave novamente ou use texto digitado.",
        )

    conteudo = await ai_service.processar_texto_ementa(texto)
    insumo = supabase_admin.table("insumos_ia").insert({
        "disciplina_id": disciplina_id,
        "tipo": "audio",
        "conteudo_bruto": texto,
        "conteudo_estruturado": conteudo,
        "status": "concluido",
    }).execute()

    return {
        "insumo_id": insumo.data[0]["id"] if insumo.data else None,
        "texto_transcrito": texto,
        "conteudo_estruturado": conteudo,
    }


@router.post("/gerar-plano")
async def iniciar_geracao_plano(
    dados: GerarPlanoRequest,
    current_user: dict = Depends(get_current_user),
):
    disciplina = _validar_disciplina_professor(dados.disciplina_id, current_user["id"])

    aulas_query = supabase_admin.table("aulas").select("*").eq(
        "disciplina_id", dados.disciplina_id
    ).eq("status", "pendente")

    if dados.aula_ids:
        aulas_query = aulas_query.in_("id", dados.aula_ids)

    aulas_resp = aulas_query.order("data").execute()
    aulas = aulas_resp.data or []

    if not aulas:
        raise HTTPException(
            status_code=400,
            detail=(
                "Nao ha aulas pendentes para planejar nesta disciplina. "
                "Adicione novas datas antes de gerar o plano."
            ),
        )

    job_id = str(uuid.uuid4())
    supabase_admin.table("jobs_geracao").insert({
        "id": job_id,
        "disciplina_id": dados.disciplina_id,
        "status": "processando",
        "progresso": 0,
        "total_aulas": len(aulas),
        "aulas_geradas": 0,
    }).execute()

    asyncio.create_task(
        _executar_geracao(
            job_id=job_id,
            disciplina=disciplina,
            aulas=aulas,
            dados_confirmados=dados.dados_confirmados,
            professor_id=current_user["id"],
        )
    )

    return {"job_id": job_id, "total_aulas": len(aulas)}


async def _executar_geracao(
    job_id: str,
    disciplina: dict,
    aulas: list,
    dados_confirmados: dict,
    professor_id: str,
):
    try:
        _atualizar_job(job_id, status="processando", progresso=10)

        plano = await ai_service.gerar_plano_ensino(disciplina, dados_confirmados, aulas)
        _atualizar_job(job_id, progresso=60)

        updates = []
        for i, aula in enumerate(aulas):
            if i >= len(plano):
                continue
            p = plano[i]
            updates.append({
                "id": aula["id"],
                "tema": p.get("tema", ""),
                "objetivos": p.get("objetivos", ""),
                "conteudos": p.get("conteudos", ""),
                "recursos": p.get("recursos", ""),
                "metodologia_aula": p.get("metodologia_aula", ""),
                "status": "planejada",
                "gerado_por_ia": True,
            })

        for i in range(0, len(updates), 20):
            lote = updates[i:i + 20]
            for update_data in lote:
                aula_id = update_data.pop("id")
                supabase_admin.table("aulas").update(update_data).eq("id", aula_id).execute()
            progresso = 60 + int(((i + len(lote)) / max(len(updates), 1)) * 35)
            _atualizar_job(
                job_id,
                progresso=progresso,
                aulas_geradas=min(i + len(lote), len(updates)),
            )

        await cache_service.invalidar_disciplina(professor_id, disciplina["id"])
        _atualizar_job(
            job_id,
            status="concluido",
            progresso=100,
            aulas_geradas=len(updates),
            erro_mensagem=None,
        )
    except HTTPException as exc:
        _atualizar_job(job_id, status="erro", progresso=0, erro_mensagem=exc.detail)
    except Exception:
        _atualizar_job(
            job_id,
            status="erro",
            progresso=0,
            erro_mensagem="Ocorreu um erro inesperado ao gerar o plano. Tente novamente.",
        )


@router.get("/status/job/{job_id}")
async def status_job(job_id: str, current_user: dict = Depends(get_current_user)):
    job_resp = supabase_admin.table("jobs_geracao").select(
        "*, disciplinas!inner(professor_id)"
    ).eq("id", job_id).eq("disciplinas.professor_id", current_user["id"]).single().execute()

    if not job_resp.data:
        raise HTTPException(status_code=404, detail="Job nao encontrado.")

    job = job_resp.data
    return {
        "status": job["status"],
        "progresso": job.get("progresso", 0),
        "total_aulas": job.get("total_aulas", 0),
        "aulas_geradas": job.get("aulas_geradas", 0),
        "mensagem": job.get("erro_mensagem"),
    }


@router.post("/chat")
async def chat(dados: ChatMensagem, current_user: dict = Depends(get_current_user)):
    disciplina = _validar_disciplina_professor(dados.disciplina_id, current_user["id"])

    aulas_resp = supabase_admin.table("aulas").select("*").eq(
        "disciplina_id", dados.disciplina_id
    ).order("data").execute()

    resposta = await ai_service.chat_ajuste(
        mensagem=dados.mensagem,
        historico=dados.historico or [],
        disciplina=disciplina,
        aulas=aulas_resp.data or [],
    )

    return {"resposta": resposta}


@router.post("/gerar-ideias")
async def gerar_ideias(dados: GerarIdeiasRequest, current_user: dict = Depends(get_current_user)):
    disciplina = _validar_disciplina_professor(dados.disciplina_id, current_user["id"])

    aula_atual_resp = supabase_admin.table("aulas").select("*").eq(
        "disciplina_id", dados.disciplina_id
    ).eq("data", str(dados.data)).execute()
    aula_atual = aula_atual_resp.data[0] if aula_atual_resp.data else None

    aulas_antes = supabase_admin.table("aulas").select("*").eq(
        "disciplina_id", dados.disciplina_id
    ).lt("data", str(dados.data)).order("data", desc=True).limit(3).execute()

    aulas_depois = supabase_admin.table("aulas").select("*").eq(
        "disciplina_id", dados.disciplina_id
    ).gt("data", str(dados.data)).order("data").limit(3).execute()

    ideias = await ai_service.gerar_ideias_aula(
        disciplina=disciplina,
        data=str(dados.data),
        aulas_antes=list(reversed(aulas_antes.data or [])),
        aulas_depois=aulas_depois.data or [],
        aula_atual=aula_atual,
    )

    return {"ideias": ideias}


@router.post("/replanejamento")
async def replanejamento(
    dados: ReplanejamentoRequest,
    current_user: dict = Depends(get_current_user),
):
    professor_id = current_user["id"]
    disciplina = _validar_disciplina_professor(dados.disciplina_id, professor_id)

    aula_resp = supabase_admin.table("aulas").select("*").eq(
        "id", dados.aula_cancelada_id
    ).eq("disciplina_id", dados.disciplina_id).single().execute()

    if not aula_resp.data:
        raise HTTPException(status_code=404, detail="Aula nao encontrada.")

    aula_cancelada = aula_resp.data
    if not aula_cancelada.get("tema") and not aula_cancelada.get("conteudos"):
        return {
            "redistribuido": False,
            "mensagem": "A aula cancelada nao tinha conteudo planejado para redistribuir.",
        }

    proximas = supabase_admin.table("aulas").select("*").eq(
        "disciplina_id", dados.disciplina_id
    ).eq("status", "pendente").gt("data", aula_cancelada["data"]).order("data").limit(5).execute()

    if not proximas.data:
        return {
            "redistribuido": False,
            "mensagem": "Nao ha aulas pendentes apos esta para redistribuir o conteudo.",
        }

    updates = await ai_service.replanejamento_automatico(
        disciplina=disciplina,
        aula_cancelada=aula_cancelada,
        proximas_aulas=proximas.data,
        motivo=dados.motivo,
    )

    aulas_atualizadas = 0
    for upd in updates:
        aula_id = upd.pop("aula_id", None)
        if not aula_id:
            continue
        supabase_admin.table("aulas").update({
            **upd,
            "status": "planejada",
            "gerado_por_ia": True,
        }).eq("id", aula_id).execute()
        aulas_atualizadas += 1

    await cache_service.invalidar_disciplina(professor_id, dados.disciplina_id)

    return {
        "redistribuido": True,
        "aulas_atualizadas": aulas_atualizadas,
        "mensagem": f"Conteudo redistribuido em {aulas_atualizadas} aula(s). Revise os ajustes no calendario.",
    }
