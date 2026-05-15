import asyncio
import uuid
from datetime import date

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from app.models.schemas import (
    InsumoTextoRequest, GerarPlanoRequest, ChatMensagem,
    GerarIdeiasRequest, ReplanejamentoRequest,
)
from app.database import supabase_admin
from app.dependencies import get_current_user
from app.services import ai_service, file_service, cache_service

router = APIRouter(prefix="/agente", tags=["Agente IA"])

# Jobs em memória (produção: mover para Redis)
_jobs: dict = {}


# ============================================================
# INSUMOS DE TEXTO
# ============================================================

@router.post("/processar-texto")
async def processar_texto(dados: InsumoTextoRequest, current_user: dict = Depends(get_current_user)):
    conteudo = await ai_service.processar_texto_ementa(dados.texto)

    insumo = supabase_admin.table("insumos").insert({
        "disciplina_id": dados.disciplina_id,
        "tipo": "texto",
        "texto_original": dados.texto,
        "conteudo_estruturado": conteudo,
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
            detail="Formato não suportado. Envie um arquivo PDF ou DOCX.",
        )

    if not texto or len(texto.strip()) < 20:
        raise HTTPException(
            status_code=422,
            detail=(
                "Não foi possível extrair texto do arquivo. "
                "Verifique se o PDF não é uma imagem escaneada. "
                "Tente exportar como PDF de texto ou use a opção de texto digitado."
            ),
        )

    conteudo = await ai_service.processar_texto_ementa(texto)
    insumo = supabase_admin.table("insumos").insert({
        "disciplina_id": disciplina_id,
        "tipo": "arquivo",
        "texto_original": texto[:5000],
        "conteudo_estruturado": conteudo,
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
    conteudo_bytes = await audio.read()
    filename = audio.filename or "gravacao.ogg"

    # Transcrever (inclui tratamento de erros específicos)
    texto = await file_service.transcrever_audio(conteudo_bytes, filename)

    if not texto or len(texto.strip()) < 5:
        raise HTTPException(
            status_code=422,
            detail=(
                "A transcrição ficou muito curta ou vazia. "
                "Tente gravar novamente em um local mais silencioso, "
                "ou use a opção de texto digitado."
            ),
        )

    conteudo = await ai_service.processar_texto_ementa(texto)
    insumo = supabase_admin.table("insumos").insert({
        "disciplina_id": disciplina_id,
        "tipo": "audio",
        "texto_original": texto,
        "conteudo_estruturado": conteudo,
    }).execute()

    return {
        "insumo_id": insumo.data[0]["id"] if insumo.data else None,
        "texto_transcrito": texto,
        "conteudo_estruturado": conteudo,
    }


# ============================================================
# GERAÇÃO DO PLANO
# ============================================================

@router.post("/gerar-plano")
async def iniciar_geracao_plano(
    dados: GerarPlanoRequest,
    current_user: dict = Depends(get_current_user),
):
    # Validar disciplina
    disc_resp = supabase_admin.table("disciplinas").select("*").eq(
        "id", dados.disciplina_id
    ).eq("professor_id", current_user["id"]).single().execute()

    if not disc_resp.data:
        raise HTTPException(status_code=404, detail="Disciplina não encontrada.")

    # Buscar aulas pendentes
    aulas_resp = supabase_admin.table("aulas").select("*").eq(
        "disciplina_id", dados.disciplina_id
    ).eq("status", "pendente").order("data").execute()

    aulas = aulas_resp.data or []
    if not aulas:
        raise HTTPException(
            status_code=400,
            detail=(
                "Não há aulas pendentes para planejar nesta disciplina. "
                "Todas as aulas já foram planejadas, ou adicione novas datas primeiro."
            ),
        )

    job_id = str(uuid.uuid4())
    _jobs[job_id] = {"status": "processando", "progresso": 0, "aulas_geradas": 0}

    asyncio.create_task(
        _executar_geracao(
            job_id=job_id,
            disciplina=disc_resp.data,
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
        _jobs[job_id]["progresso"] = 10

        plano = await ai_service.gerar_plano_ensino(disciplina, dados_confirmados, aulas)
        _jobs[job_id]["progresso"] = 60

        updates = []
        for i, aula in enumerate(aulas):
            if i < len(plano):
                p = plano[i]
                updates.append({
                    "id": aula["id"],
                    "tema": p.get("tema", ""),
                    "objetivos": p.get("objetivos", ""),
                    "conteudos": p.get("conteudos", ""),
                    "recursos": p.get("recursos", ""),
                    "metodologia_aula": p.get("metodologia_aula", ""),
                    "status": "planejada",
                })

        # Atualizar em lotes de 20
        for i in range(0, len(updates), 20):
            lote = updates[i:i + 20]
            for u in lote:
                aula_id = u.pop("id")
                supabase_admin.table("aulas").update(u).eq("id", aula_id).execute()
            progresso = 60 + int((i / len(updates)) * 35)
            _jobs[job_id]["progresso"] = progresso

        await cache_service.invalidar_disciplina(professor_id, disciplina["id"])

        _jobs[job_id].update({
            "status": "concluido",
            "progresso": 100,
            "aulas_geradas": len(updates),
        })

    except HTTPException as e:
        _jobs[job_id] = {
            "status": "erro",
            "progresso": 0,
            "mensagem": e.detail,
            "codigo": getattr(e, "headers", {}).get("X-Error-Code", "AI_ERROR"),
        }
    except Exception as e:
        _jobs[job_id] = {
            "status": "erro",
            "progresso": 0,
            "mensagem": "Ocorreu um erro inesperado ao gerar o plano. Tente novamente.",
        }


@router.get("/status/job/{job_id}")
async def status_job(job_id: str, current_user: dict = Depends(get_current_user)):
    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job não encontrado.")
    return job


# ============================================================
# CHAT DE AJUSTE
# ============================================================

@router.post("/chat")
async def chat(dados: ChatMensagem, current_user: dict = Depends(get_current_user)):
    disc_resp = supabase_admin.table("disciplinas").select("*").eq(
        "id", dados.disciplina_id
    ).eq("professor_id", current_user["id"]).single().execute()

    if not disc_resp.data:
        raise HTTPException(status_code=404, detail="Disciplina não encontrada.")

    aulas_resp = supabase_admin.table("aulas").select("*").eq(
        "disciplina_id", dados.disciplina_id
    ).order("data").execute()

    resposta = await ai_service.chat_ajuste(
        mensagem=dados.mensagem,
        historico=dados.historico or [],
        disciplina=disc_resp.data,
        aulas=aulas_resp.data or [],
    )

    return {"resposta": resposta}


# ============================================================
# GERADOR DE IDEIAS (RF23)
# ============================================================

@router.post("/gerar-ideias")
async def gerar_ideias(dados: GerarIdeiasRequest, current_user: dict = Depends(get_current_user)):
    disc_resp = supabase_admin.table("disciplinas").select("*").eq(
        "id", dados.disciplina_id
    ).eq("professor_id", current_user["id"]).single().execute()

    if not disc_resp.data:
        raise HTTPException(status_code=404, detail="Disciplina não encontrada.")

    # Buscar aula atual e contexto
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
        disciplina=disc_resp.data,
        data=str(dados.data),
        aulas_antes=list(reversed(aulas_antes.data or [])),
        aulas_depois=aulas_depois.data or [],
        aula_atual=aula_atual,
    )

    return {"ideias": ideias}


# ============================================================
# REPLANEJAMENTO AUTOMÁTICO (RF19)
# ============================================================

@router.post("/replanejamento")
async def replanejamento(
    dados: ReplanejamentoRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Redistributi o conteúdo de uma aula cancelada nas próximas aulas pendentes.
    Chamado automaticamente quando o professor cancela uma aula.
    """
    professor_id = current_user["id"]

    # Verificar acesso
    disc_resp = supabase_admin.table("disciplinas").select("*").eq(
        "id", dados.disciplina_id
    ).eq("professor_id", professor_id).single().execute()

    if not disc_resp.data:
        raise HTTPException(status_code=404, detail="Disciplina não encontrada.")

    # Buscar aula cancelada
    aula_resp = supabase_admin.table("aulas").select("*").eq(
        "id", dados.aula_cancelada_id
    ).eq("disciplina_id", dados.disciplina_id).single().execute()

    if not aula_resp.data:
        raise HTTPException(status_code=404, detail="Aula não encontrada.")

    aula_cancelada = aula_resp.data

    # Verificar se a aula tem conteúdo para redistribuir
    if not aula_cancelada.get("tema") and not aula_cancelada.get("conteudos"):
        return {
            "redistribuido": False,
            "mensagem": "A aula cancelada não tinha conteúdo planejado para redistribuir.",
        }

    # Buscar próximas aulas pendentes
    proximas = supabase_admin.table("aulas").select("*").eq(
        "disciplina_id", dados.disciplina_id
    ).eq("status", "pendente").gt("data", aula_cancelada["data"]).order("data").limit(5).execute()

    if not proximas.data:
        return {
            "redistribuido": False,
            "mensagem": "Não há aulas pendentes após esta para redistribuir o conteúdo.",
        }

    # Gerar redistribuição com IA
    updates = await ai_service.replanejamento_automatico(
        disciplina=disc_resp.data,
        aula_cancelada=aula_cancelada,
        proximas_aulas=proximas.data,
        motivo=dados.motivo,
    )

    # Aplicar updates
    aulas_atualizadas = 0
    for upd in updates:
        aula_id = upd.pop("aula_id", None)
        if not aula_id:
            continue
        supabase_admin.table("aulas").update({**upd, "status": "planejada"}).eq(
            "id", aula_id
        ).execute()
        aulas_atualizadas += 1

    await cache_service.invalidar_disciplina(professor_id, dados.disciplina_id)

    return {
        "redistribuido": True,
        "aulas_atualizadas": aulas_atualizadas,
        "mensagem": f"Conteúdo redistribuído em {aulas_atualizadas} aula(s). Revise os ajustes no calendário.",
    }
