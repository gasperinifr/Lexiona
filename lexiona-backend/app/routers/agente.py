from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, BackgroundTasks
from app.models.schemas import (
    InsumoTextoRequest, GerarPlanoRequest, ChatMensagem,
    GerarIdeiasRequest, ReplanejamentoRequest,
)
from app.database import supabase_admin
from app.dependencies import get_current_user
from app.services.ai_service import (
    processar_texto_ementa,
    gerar_plano_ensino,
    chat_ajuste,
    gerar_ideias_aula,
)
from app.services.file_service import extrair_texto_pdf, extrair_texto_docx, transcrever_audio

router = APIRouter(prefix="/agente", tags=["Agente de IA"])


def verificar_disciplina(disciplina_id: str, professor_id: str):
    resp = supabase_admin.table("disciplinas").select("*").eq(
        "id", disciplina_id
    ).eq("professor_id", professor_id).single().execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Disciplina não encontrada")
    return resp.data


# ============================================================
# PROCESSAR INSUMO POR TEXTO
# ============================================================

@router.post("/processar-texto")
async def processar_texto(
    dados: InsumoTextoRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    verificar_disciplina(dados.disciplina_id, current_user["id"])

    # Criar registro de insumo
    insumo = supabase_admin.table("insumos_ia").insert({
        "disciplina_id": dados.disciplina_id,
        "tipo": "texto",
        "conteudo_bruto": dados.texto,
        "status": "processando",
    }).execute()

    insumo_id = insumo.data[0]["id"]

    # Processar em background
    background_tasks.add_task(
        _processar_insumo_bg,
        insumo_id=insumo_id,
        texto=dados.texto,
        disciplina_id=dados.disciplina_id,
    )

    return {"insumo_id": insumo_id, "status": "processando"}


# ============================================================
# PROCESSAR INSUMO POR UPLOAD (PDF/DOCX)
# ============================================================

@router.post("/processar-arquivo")
async def processar_arquivo(
    disciplina_id: str = Form(...),
    arquivo: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
    current_user: dict = Depends(get_current_user),
):
    verificar_disciplina(disciplina_id, current_user["id"])

    conteudo = await arquivo.read()
    filename = arquivo.filename.lower()

    # Extrair texto conforme tipo
    if filename.endswith(".pdf"):
        tipo = "pdf"
        texto = extrair_texto_pdf(conteudo)
    elif filename.endswith(".docx"):
        tipo = "docx"
        texto = extrair_texto_docx(conteudo)
    else:
        raise HTTPException(status_code=400, detail="Formato não suportado. Use PDF ou DOCX.")

    if not texto.strip():
        raise HTTPException(status_code=422, detail="Não foi possível extrair texto do arquivo.")

    insumo = supabase_admin.table("insumos_ia").insert({
        "disciplina_id": disciplina_id,
        "tipo": tipo,
        "conteudo_bruto": texto[:50000],  # limite de segurança
        "status": "processando",
    }).execute()

    insumo_id = insumo.data[0]["id"]

    background_tasks.add_task(
        _processar_insumo_bg,
        insumo_id=insumo_id,
        texto=texto,
        disciplina_id=disciplina_id,
    )

    return {"insumo_id": insumo_id, "status": "processando", "tipo": tipo}


# ============================================================
# PROCESSAR INSUMO POR ÁUDIO
# ============================================================

@router.post("/processar-audio")
async def processar_audio(
    disciplina_id: str = Form(...),
    audio: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
    current_user: dict = Depends(get_current_user),
):
    verificar_disciplina(disciplina_id, current_user["id"])

    conteudo = await audio.read()

    # Transcrever com Groq Whisper
    texto = await transcrever_audio(conteudo, audio.filename)

    if not texto.strip():
        raise HTTPException(status_code=422, detail="Não foi possível transcrever o áudio.")

    insumo = supabase_admin.table("insumos_ia").insert({
        "disciplina_id": disciplina_id,
        "tipo": "audio",
        "conteudo_bruto": texto,
        "status": "processando",
    }).execute()

    insumo_id = insumo.data[0]["id"]

    background_tasks.add_task(
        _processar_insumo_bg,
        insumo_id=insumo_id,
        texto=texto,
        disciplina_id=disciplina_id,
    )

    return {"insumo_id": insumo_id, "status": "processando", "transcricao": texto}


# ============================================================
# STATUS DO INSUMO (polling)
# ============================================================

@router.get("/status/insumo/{insumo_id}")
async def status_insumo(insumo_id: str, current_user: dict = Depends(get_current_user)):
    resp = supabase_admin.table("insumos_ia").select("*").eq("id", insumo_id).single().execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Insumo não encontrado")
    return resp.data


@router.get("/status/job/{job_id}")
async def status_job(job_id: str, current_user: dict = Depends(get_current_user)):
    resp = supabase_admin.table("jobs_geracao").select("*").eq("id", job_id).single().execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Job não encontrado")
    return resp.data


# ============================================================
# GERAR PLANO DE ENSINO
# ============================================================

@router.post("/gerar-plano")
async def gerar_plano(
    dados: GerarPlanoRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    disciplina = verificar_disciplina(dados.disciplina_id, current_user["id"])

    # Criar job de geração
    job = supabase_admin.table("jobs_geracao").insert({
        "disciplina_id": dados.disciplina_id,
        "status": "aguardando",
        "progresso": 0,
    }).execute()

    job_id = job.data[0]["id"]

    background_tasks.add_task(
        _gerar_plano_bg,
        job_id=job_id,
        disciplina=disciplina,
        dados_confirmados=dados.dados_confirmados,
    )

    return {"job_id": job_id, "status": "aguardando"}


# ============================================================
# CHAT DE AJUSTE
# ============================================================

@router.post("/chat")
async def chat(dados: ChatMensagem, current_user: dict = Depends(get_current_user)):
    disciplina = verificar_disciplina(dados.disciplina_id, current_user["id"])

    # Buscar aulas atuais para contexto
    aulas_resp = supabase_admin.table("aulas").select("data,tema,status,numero_aula").eq(
        "disciplina_id", dados.disciplina_id
    ).order("data").execute()

    resposta = await chat_ajuste(
        mensagem=dados.mensagem,
        historico=dados.historico,
        disciplina=disciplina,
        aulas=aulas_resp.data or [],
    )

    return {"resposta": resposta}


# ============================================================
# GERADOR DE IDEIAS — RF23
# ============================================================

@router.post("/gerar-ideias")
async def gerar_ideias(dados: GerarIdeiasRequest, current_user: dict = Depends(get_current_user)):
    disciplina = verificar_disciplina(dados.disciplina_id, current_user["id"])

    # Buscar contexto: aulas anteriores e posteriores à data
    aulas_resp = supabase_admin.table("aulas").select(
        "data,tema,conteudos,status,numero_aula"
    ).eq("disciplina_id", dados.disciplina_id).order("data").execute()

    aulas = aulas_resp.data or []
    data_str = str(dados.data)

    aulas_antes = [a for a in aulas if a["data"] < data_str and a.get("tema")][-3:]
    aulas_depois = [a for a in aulas if a["data"] > data_str and a.get("tema")][:3]
    aula_atual = next((a for a in aulas if a["data"] == data_str), None)

    ideias = await gerar_ideias_aula(
        disciplina=disciplina,
        data=data_str,
        aulas_antes=aulas_antes,
        aulas_depois=aulas_depois,
        aula_atual=aula_atual,
    )

    return {"ideias": ideias, "data": data_str}


# ============================================================
# BACKGROUND TASKS (funções internas)
# ============================================================

async def _processar_insumo_bg(insumo_id: str, texto: str, disciplina_id: str):
    try:
        estruturado = await processar_texto_ementa(texto)
        supabase_admin.table("insumos_ia").update({
            "conteudo_estruturado": estruturado,
            "status": "concluido",
        }).eq("id", insumo_id).execute()
    except Exception as e:
        supabase_admin.table("insumos_ia").update({
            "status": "erro",
            "erro_mensagem": str(e),
        }).eq("id", insumo_id).execute()


async def _gerar_plano_bg(job_id: str, disciplina: dict, dados_confirmados: dict):
    try:
        supabase_admin.table("jobs_geracao").update({
            "status": "processando",
            "progresso": 10,
        }).eq("id", job_id).execute()

        # Buscar aulas pendentes
        aulas_resp = supabase_admin.table("aulas").select("id,data,numero_aula").eq(
            "disciplina_id", disciplina["id"]
        ).eq("status", "pendente").order("data").execute()

        aulas_pendentes = aulas_resp.data or []
        total = len(aulas_pendentes)

        if total == 0:
            supabase_admin.table("jobs_geracao").update({
                "status": "concluido", "progresso": 100
            }).eq("id", job_id).execute()
            return

        supabase_admin.table("jobs_geracao").update({"total_aulas": total}).eq("id", job_id).execute()

        # Gerar plano completo via IA
        plano = await gerar_plano_ensino(
            disciplina=disciplina,
            dados_confirmados=dados_confirmados,
            aulas=aulas_pendentes,
        )

        # Salvar cada aula gerada
        for i, (aula, plano_aula) in enumerate(zip(aulas_pendentes, plano)):
            supabase_admin.table("aulas").update({
                **plano_aula,
                "status": "planejada",
                "gerado_por_ia": True,
            }).eq("id", aula["id"]).execute()

            progresso = 10 + int((i + 1) / total * 85)
            supabase_admin.table("jobs_geracao").update({
                "progresso": progresso,
                "aulas_geradas": i + 1,
            }).eq("id", job_id).execute()

        supabase_admin.table("jobs_geracao").update({
            "status": "concluido",
            "progresso": 100,
        }).eq("id", job_id).execute()

    except Exception as e:
        supabase_admin.table("jobs_geracao").update({
            "status": "erro",
            "erro_mensagem": str(e),
        }).eq("id", job_id).execute()