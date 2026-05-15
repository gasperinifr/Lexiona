import json
import logging
from groq import AsyncGroq, RateLimitError
from fastapi import HTTPException
from app.config import settings

logger = logging.getLogger("lexiona.ai")

client = AsyncGroq(api_key=settings.groq_api_key)
MODEL = "llama-3.3-70b-versatile"
WHISPER_MODEL = "whisper-large-v3"


def _handle_groq_error(e: Exception, contexto: str = "") -> None:
    """Converte erros do Groq em HTTPExceptions amigáveis."""
    err_str = str(e).lower()
    logger.error(f"Groq erro [{contexto}]: {e}")

    if isinstance(e, RateLimitError) or "rate" in err_str or "429" in err_str:
        raise HTTPException(
            status_code=429,
            detail="O Lexiona está processando muitas requisições agora. Aguarde alguns minutos e tente novamente.",
        )
    if "context_length" in err_str or "token" in err_str and "limit" in err_str:
        raise HTTPException(
            status_code=422,
            detail=(
                "O conteúdo fornecido é extenso demais para processar de uma vez. "
                "Tente dividir o texto em partes menores (ex: por unidade temática) e envie separadamente."
            ),
        )
    if "503" in err_str or "unavailable" in err_str or "connection" in err_str:
        raise HTTPException(
            status_code=503,
            detail="O serviço de IA está temporariamente indisponível. Tente novamente em alguns minutos.",
        )
    if "authentication" in err_str or "401" in err_str or "api_key" in err_str:
        raise HTTPException(
            status_code=503,
            detail="Serviço de IA com problema de configuração. Entre em contato com o suporte.",
        )

    raise HTTPException(
        status_code=500,
        detail=(
            f"Falha no serviço de IA{' ao ' + contexto if contexto else ''}. "
            "Tente novamente. Se o problema persistir, use a opção de texto digitado."
        ),
    )


def _limpar_json(texto: str) -> str:
    """Remove markdown code fences do JSON retornado pelo modelo."""
    if "```json" in texto:
        texto = texto.split("```json")[1].split("```")[0]
    elif "```" in texto:
        texto = texto.split("```")[1].split("```")[0]
    return texto.strip()


async def processar_texto_ementa(texto: str) -> dict:
    """Extrai estrutura pedagógica de texto livre."""
    prompt = f"""Você é um assistente pedagógico especializado em planejamento docente brasileiro.
Analise o texto abaixo e extraia as informações pedagógicas estruturadas.

TEXTO:
{texto[:8000]}

Retorne APENAS um JSON válido com esta estrutura exata:
{{
  "disciplina_nome": "nome da disciplina identificada ou null",
  "nivel": "fundamental|medio|superior|livre|tecnico ou null",
  "carga_horaria_horas": número ou null,
  "metodologia_sugerida": "metodologia identificada ou Tradicional",
  "objetivos_gerais": ["objetivo 1", "objetivo 2"],
  "unidades_tematicas": [
    {{
      "titulo": "nome da unidade",
      "temas": ["tema 1", "tema 2"],
      "carga_estimada_aulas": número
    }}
  ],
  "avaliacoes_previstas": ["avaliação 1"],
  "recursos_mencionados": ["recurso 1"],
  "observacoes": "outras informações relevantes ou null"
}}"""

    try:
        response = await client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=2000,
        )
        return json.loads(_limpar_json(response.choices[0].message.content))
    except HTTPException:
        raise
    except Exception as e:
        _handle_groq_error(e, "processar ementa")


async def gerar_plano_ensino(disciplina: dict, dados_confirmados: dict, aulas: list) -> list:
    """Gera plano de ensino completo, retornando lista de dicts para cada aula."""
    total_aulas = len(aulas)
    metodologia = disciplina.get("metodologia", "Tradicional")
    nivel = disciplina.get("nivel", "medio")
    bncc = disciplina.get("bncc_componente", "")

    unidades = dados_confirmados.get("unidades_tematicas", [])
    objetivos = dados_confirmados.get("objetivos_gerais", [])

    bncc_contexto = (
        f"\nCOMPONENTE CURRICULAR BNCC: {bncc}\n"
        "Quando relevante, faça referência às competências e habilidades da BNCC para este componente."
        if bncc else ""
    )

    prompt = f"""Você é um especialista em planejamento pedagógico para docentes brasileiros.

DISCIPLINA: {disciplina['nome']}
NÍVEL: {nivel}
METODOLOGIA: {metodologia}
TOTAL DE AULAS: {total_aulas}
OBJETIVOS GERAIS: {json.dumps(objetivos, ensure_ascii=False)}
UNIDADES TEMÁTICAS: {json.dumps(unidades, ensure_ascii=False)}{bncc_contexto}

Crie um plano de ensino completo distribuindo os conteúdos nas {total_aulas} aulas de forma progressiva e equilibrada.

Retorne APENAS um array JSON com exatamente {total_aulas} objetos, um por aula:
[
  {{
    "tema": "título conciso da aula",
    "objetivos": "o que o aluno será capaz de fazer ao final desta aula",
    "conteudos": "conteúdos específicos desta aula",
    "recursos": "materiais e recursos necessários",
    "metodologia_aula": "estratégia específica para esta aula considerando {metodologia}"
  }}
]

Respeite a progressão lógica do conhecimento. Use linguagem clara e prática para o professor."""

    try:
        response = await client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
            max_tokens=4000,
        )
        plano = json.loads(_limpar_json(response.choices[0].message.content))

        while len(plano) < total_aulas:
            plano.append({
                "tema": f"Aula {len(plano) + 1} — Revisão e Aprofundamento",
                "objetivos": "Consolidar os conteúdos estudados",
                "conteudos": "Revisão dos tópicos principais do período",
                "recursos": "Material de revisão",
                "metodologia_aula": "Discussão em grupo",
            })
        return plano[:total_aulas]

    except HTTPException:
        raise
    except Exception as e:
        _handle_groq_error(e, "gerar plano de ensino")


async def chat_ajuste(mensagem: str, historico: list, disciplina: dict, aulas: list) -> str:
    """Chat contextual para ajuste do plano de ensino."""
    aulas_resumo = "\n".join([
        f"Aula {a.get('numero_aula', i+1)} ({a['data']}): {a.get('tema', 'Pendente')} [{a['status']}]"
        for i, a in enumerate(aulas[:30])
    ])

    bncc_info = f"\nComponente BNCC: {disciplina.get('bncc_componente')}" if disciplina.get("bncc_componente") else ""
    turno_info = f"\nTurno: {disciplina.get('turno', '')}" if disciplina.get("turno") else ""

    system_prompt = f"""Você é um assistente pedagógico do Lexiona, auxiliando o professor a ajustar seu plano de ensino.

CONTEXTO DA DISCIPLINA:
- Nome: {disciplina['nome']}
- Nível: {disciplina.get('nivel', '')}
- Turma: {disciplina.get('turma', '')}{turno_info}
- Metodologia: {disciplina.get('metodologia', '')}{bncc_info}

PLANO ATUAL (resumo):
{aulas_resumo}

Responda de forma clara, direta e amigável. Quando sugerir mudanças específicas, descreva exatamente o que alterar.
Sempre responda em português brasileiro."""

    messages = [{"role": "system", "content": system_prompt}]
    for msg in historico[-10:]:
        messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": mensagem})

    try:
        response = await client.chat.completions.create(
            model=MODEL,
            messages=messages,
            temperature=0.5,
            max_tokens=800,
        )
        return response.choices[0].message.content.strip()
    except HTTPException:
        raise
    except Exception as e:
        _handle_groq_error(e, "chat de ajuste")


async def gerar_ideias_aula(
    disciplina: dict,
    data: str,
    aulas_antes: list,
    aulas_depois: list,
    aula_atual: dict | None,
) -> list:
    """RF23 — Gera 4 ideias contextuais de aula para uma data específica."""
    contexto_antes = "\n".join([
        f"- Aula {a.get('numero_aula', '?')} ({a['data']}): {a.get('tema', '')} | {a.get('conteudos', '')}"
        for a in aulas_antes
    ]) or "Nenhuma aula anterior registrada"

    contexto_depois = "\n".join([
        f"- Aula {a.get('numero_aula', '?')} ({a['data']}): {a.get('tema', '')}"
        for a in aulas_depois
    ]) or "Nenhuma aula posterior planejada"

    aula_atual_info = (
        f"Tema atual: {aula_atual.get('tema', 'Pendente')}"
        if aula_atual else "Aula ainda sem plano definido"
    )

    bncc_contexto = (
        f"\nComponente BNCC: {disciplina['bncc_componente']} — inclua referências às habilidades BNCC quando relevante."
        if disciplina.get("bncc_componente") else ""
    )

    prompt = f"""Você é um especialista em didática e planejamento de aulas para professores brasileiros.

DISCIPLINA: {disciplina['nome']}
NÍVEL: {disciplina.get('nivel', 'medio')}
TURNO: {disciplina.get('turno', 'não informado')}
METODOLOGIA PRINCIPAL: {disciplina.get('metodologia', 'Tradicional')}{bncc_contexto}
DATA DA AULA: {data}
SITUAÇÃO ATUAL: {aula_atual_info}

AULAS ANTERIORES:
{contexto_antes}

AULAS POSTERIORES:
{contexto_depois}

Gere 4 ideias criativas e pedagogicamente sólidas para esta aula, considerando a progressão do conteúdo.

Retorne APENAS um array JSON com 4 objetos:
[
  {{
    "titulo": "título criativo da ideia de aula",
    "descricao": "descrição em 2-3 frases de como seria conduzida",
    "metodologia_sugerida": "metodologia específica",
    "recursos": "materiais necessários",
    "diferencial": "por que esta abordagem é eficaz para este momento"
  }}
]

As ideias devem ser diversas entre si. Foque em atividades práticas e engajantes."""

    try:
        response = await client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=1500,
        )
        return json.loads(_limpar_json(response.choices[0].message.content))
    except HTTPException:
        raise
    except Exception as e:
        _handle_groq_error(e, "gerar ideias de aula")


async def replanejamento_automatico(
    disciplina: dict,
    aula_cancelada: dict,
    proximas_aulas: list,
    motivo: str = "Aula cancelada",
) -> list:
    """
    RF19 — Redistribui o conteúdo de uma aula cancelada nas próximas aulas pendentes.
    Retorna lista de updates {aula_id, tema, objetivos, conteudos, recursos, metodologia_aula}.
    """
    if not proximas_aulas:
        return []

    conteudo_cancelado = {
        "tema": aula_cancelada.get("tema", "Sem tema"),
        "objetivos": aula_cancelada.get("objetivos", ""),
        "conteudos": aula_cancelada.get("conteudos", ""),
    }

    proximas_resumo = json.dumps([
        {
            "id": a["id"],
            "data": a["data"],
            "tema": a.get("tema", "Pendente"),
            "conteudos": a.get("conteudos", ""),
            "numero_aula": a.get("numero_aula", 0),
        }
        for a in proximas_aulas[:5]
    ], ensure_ascii=False)

    prompt = f"""Você é um especialista em planejamento pedagógico.

Uma aula foi cancelada e o conteúdo precisa ser redistribuído.

DISCIPLINA: {disciplina['nome']}
MOTIVO DO CANCELAMENTO: {motivo}

CONTEÚDO CANCELADO:
- Tema: {conteudo_cancelado['tema']}
- Objetivos: {conteudo_cancelado['objetivos']}
- Conteúdos: {conteudo_cancelado['conteudos']}

PRÓXIMAS AULAS DISPONÍVEIS:
{proximas_resumo}

Redistribua o conteúdo cancelado de forma inteligente nas próximas aulas, integrando com o que já está planejado.
Não force tudo na próxima aula — distribua de forma equilibrada.

Retorne APENAS um array JSON com os updates necessários (apenas as aulas que precisam mudar):
[
  {{
    "aula_id": "uuid da aula",
    "tema": "novo tema ou tema atual atualizado",
    "objetivos": "objetivos atualizados",
    "conteudos": "conteúdos atualizados incluindo o conteúdo redistribuído",
    "recursos": "recursos necessários",
    "metodologia_aula": "estratégia para a aula"
  }}
]"""

    try:
        response = await client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=2000,
        )
        return json.loads(_limpar_json(response.choices[0].message.content))
    except HTTPException:
        raise
    except Exception as e:
        _handle_groq_error(e, "replanejamento automático")
