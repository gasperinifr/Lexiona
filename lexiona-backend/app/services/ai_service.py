import json
from groq import AsyncGroq
from app.config import settings

client = AsyncGroq(api_key=settings.groq_api_key)
MODEL = "llama-3.3-70b-versatile"
WHISPER_MODEL = "whisper-large-v3"


async def processar_texto_ementa(texto: str) -> dict:
    """Extrai estrutura pedagógica de texto livre."""
    prompt = f"""Você é um assistente pedagógico especializado em planejamento docente.
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

    response = await client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
        max_tokens=2000,
    )

    texto_resposta = response.choices[0].message.content.strip()

    # Limpar markdown se presente
    if "```json" in texto_resposta:
        texto_resposta = texto_resposta.split("```json")[1].split("```")[0].strip()
    elif "```" in texto_resposta:
        texto_resposta = texto_resposta.split("```")[1].split("```")[0].strip()

    return json.loads(texto_resposta)


async def gerar_plano_ensino(disciplina: dict, dados_confirmados: dict, aulas: list) -> list:
    """Gera plano de ensino completo, retornando lista de dicts para cada aula."""
    total_aulas = len(aulas)
    metodologia = disciplina.get("metodologia", "Tradicional")
    nivel = disciplina.get("nivel", "medio")

    unidades = dados_confirmados.get("unidades_tematicas", [])
    objetivos = dados_confirmados.get("objetivos_gerais", [])

    prompt = f"""Você é um especialista em planejamento pedagógico para docentes brasileiros.

DISCIPLINA: {disciplina['nome']}
NÍVEL: {nivel}
METODOLOGIA: {metodologia}
TOTAL DE AULAS: {total_aulas}
OBJETIVOS GERAIS: {json.dumps(objetivos, ensure_ascii=False)}
UNIDADES TEMÁTICAS: {json.dumps(unidades, ensure_ascii=False)}

Crie um plano de ensino completo distribuindo os conteúdos nas {total_aulas} aulas de forma progressiva e equilibrada.

Retorne APENAS um array JSON com exatamente {total_aulas} objetos, um por aula, com esta estrutura:
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

    response = await client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.4,
        max_tokens=4000,
    )

    texto_resposta = response.choices[0].message.content.strip()

    if "```json" in texto_resposta:
        texto_resposta = texto_resposta.split("```json")[1].split("```")[0].strip()
    elif "```" in texto_resposta:
        texto_resposta = texto_resposta.split("```")[1].split("```")[0].strip()

    plano = json.loads(texto_resposta)

    # Garantir que temos o número correto de aulas
    while len(plano) < total_aulas:
        plano.append({
            "tema": f"Aula {len(plano) + 1} — Revisão e Aprofundamento",
            "objetivos": "Consolidar os conteúdos estudados",
            "conteudos": "Revisão dos tópicos principais do período",
            "recursos": "Material de revisão",
            "metodologia_aula": "Discussão em grupo",
        })

    return plano[:total_aulas]


async def chat_ajuste(mensagem: str, historico: list, disciplina: dict, aulas: list) -> str:
    """Chat contextual para ajuste do plano de ensino."""
    aulas_resumo = "\n".join([
        f"Aula {a.get('numero_aula', i+1)} ({a['data']}): {a.get('tema', 'Pendente')} [{a['status']}]"
        for i, a in enumerate(aulas[:30])
    ])

    system_prompt = f"""Você é um assistente pedagógico do Lexiona, auxiliando o professor a ajustar seu plano de ensino.

CONTEXTO DA DISCIPLINA:
- Nome: {disciplina['nome']}
- Nível: {disciplina.get('nivel', '')}
- Metodologia: {disciplina.get('metodologia', '')}

PLANO ATUAL (resumo):
{aulas_resumo}

Responda de forma clara, direta e amigável. Quando sugerir mudanças específicas no plano, descreva exatamente o que deve ser alterado.
Sempre responda em português brasileiro."""

    messages = [{"role": "system", "content": system_prompt}]

    # Adicionar histórico
    for msg in historico[-10:]:  # máximo 10 mensagens de contexto
        messages.append({"role": msg["role"], "content": msg["content"]})

    messages.append({"role": "user", "content": mensagem})

    response = await client.chat.completions.create(
        model=MODEL,
        messages=messages,
        temperature=0.5,
        max_tokens=800,
    )

    return response.choices[0].message.content.strip()


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

    prompt = f"""Você é um especialista em didática e planejamento de aulas para professores brasileiros.

DISCIPLINA: {disciplina['nome']}
NÍVEL: {disciplina.get('nivel', 'medio')}
METODOLOGIA PRINCIPAL: {disciplina.get('metodologia', 'Tradicional')}
DATA DA AULA: {data}
SITUAÇÃO ATUAL DA AULA: {aula_atual_info}

AULAS ANTERIORES (contexto):
{contexto_antes}

AULAS POSTERIORES (contexto):
{contexto_depois}

Gere 4 ideias criativas e pedagogicamente sólidas para a aula desta data, considerando a progressão do conteúdo e a metodologia da disciplina.

Retorne APENAS um array JSON com 4 objetos:
[
  {{
    "titulo": "título criativo da ideia de aula",
    "descricao": "descrição da ideia em 2-3 frases, explicando como seria conduzida",
    "metodologia_sugerida": "metodologia específica para esta ideia",
    "recursos": "materiais e recursos necessários",
    "diferencial": "por que esta abordagem é eficaz para este momento da disciplina"
  }}
]

As ideias devem ser diversas entre si em abordagem e metodologia. Foque em atividades práticas e engajantes."""

    response = await client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
        max_tokens=1500,
    )

    texto_resposta = response.choices[0].message.content.strip()

    if "```json" in texto_resposta:
        texto_resposta = texto_resposta.split("```json")[1].split("```")[0].strip()
    elif "```" in texto_resposta:
        texto_resposta = texto_resposta.split("```")[1].split("```")[0].strip()

    return json.loads(texto_resposta)