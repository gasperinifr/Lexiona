"""
Serviço de integração com o Google Calendar.
Requer: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
"""

import logging
from typing import Optional, List
from datetime import datetime, timezone
from fastapi import HTTPException
from app.config import settings

logger = logging.getLogger("lexiona.gcal")

# Escopo necessário para criar/editar eventos
SCOPES = ["https://www.googleapis.com/auth/calendar.events"]

# Cores do Google Calendar por turno
TURNO_COLOR_ID = {
    "matutino": "1",    # azul (Tomato → vamos usar Peacock)
    "vespertino": "2",  # verde (Sage)
    "noturno": "3",     # roxo (Grape)
    "integral": "5",    # amarelo (Banana)
    "particular": "6",  # turquesa (Sage)
}


def _google_disponivel() -> bool:
    return bool(settings.google_client_id and settings.google_client_secret)


def gerar_url_autorizacao(professor_id: str) -> str:
    """Gera URL de autorização OAuth2 do Google."""
    if not _google_disponivel():
        raise HTTPException(
            status_code=503,
            detail="Integração com Google Calendar não configurada neste servidor.",
        )
    try:
        from google_auth_oauthlib.flow import Flow

        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [settings.google_redirect_uri],
                }
            },
            scopes=SCOPES,
        )
        flow.redirect_uri = settings.google_redirect_uri

        auth_url, _ = flow.authorization_url(
            access_type="offline",
            include_granted_scopes="true",
            state=professor_id,
            prompt="consent",
        )
        return auth_url
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="Biblioteca google-auth não instalada no servidor.",
        )


async def trocar_code_por_tokens(code: str) -> dict:
    """Troca o authorization code pelos tokens de acesso."""
    try:
        from google_auth_oauthlib.flow import Flow

        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [settings.google_redirect_uri],
                }
            },
            scopes=SCOPES,
        )
        flow.redirect_uri = settings.google_redirect_uri
        flow.fetch_token(code=code)

        credentials = flow.credentials
        return {
            "access_token": credentials.token,
            "refresh_token": credentials.refresh_token,
            "token_expiry": credentials.expiry.isoformat() if credentials.expiry else None,
        }
    except Exception as e:
        logger.error(f"Erro ao trocar code por tokens: {e}")
        raise HTTPException(
            status_code=400,
            detail="Falha ao autorizar com o Google. Tente novamente.",
        )


def _get_calendar_service(access_token: str, refresh_token: str):
    """Cria cliente autenticado da Google Calendar API."""
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build

    creds = Credentials(
        token=access_token,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret,
        scopes=SCOPES,
    )
    return build("calendar", "v3", credentials=creds, cache_discovery=False)


def _formatar_evento(aula: dict, disciplina: dict) -> dict:
    """Formata uma aula como evento do Google Calendar."""
    data = aula["data"]
    turno = disciplina.get("turno", "")
    color_id = TURNO_COLOR_ID.get(turno, "1")

    # Montar título
    titulo = f"{disciplina['nome']}"
    if aula.get("tema"):
        titulo += f" · {aula['tema']}"
    if disciplina.get("turma"):
        titulo += f" [{disciplina['turma']}]"

    # Montar descrição
    partes = []
    if aula.get("objetivos"):
        partes.append(f"🎯 Objetivos: {aula['objetivos']}")
    if aula.get("conteudos"):
        partes.append(f"📚 Conteúdos: {aula['conteudos']}")
    if aula.get("recursos"):
        partes.append(f"📦 Recursos: {aula['recursos']}")
    if aula.get("metodologia_aula"):
        partes.append(f"💡 Metodologia: {aula['metodologia_aula']}")
    partes.append(f"\n— Lexiona (Aula #{aula.get('numero_aula', '?')})")
    descricao = "\n".join(partes)

    # Horário
    horario_inicio = disciplina.get("horario_inicio")
    horario_fim = disciplina.get("horario_fim")

    if horario_inicio and horario_fim:
        evento = {
            "summary": titulo,
            "description": descricao,
            "colorId": color_id,
            "start": {"dateTime": f"{data}T{horario_inicio}", "timeZone": "America/Sao_Paulo"},
            "end": {"dateTime": f"{data}T{horario_fim}", "timeZone": "America/Sao_Paulo"},
            "extendedProperties": {
                "private": {"lexiona_aula_id": aula["id"]}
            },
        }
    else:
        evento = {
            "summary": titulo,
            "description": descricao,
            "colorId": color_id,
            "start": {"date": data},
            "end": {"date": data},
            "extendedProperties": {
                "private": {"lexiona_aula_id": aula["id"]}
            },
        }

    return evento


async def sincronizar_aulas(
    access_token: str,
    refresh_token: str,
    calendar_id: str,
    aulas: List[dict],
    disciplinas_map: dict,
) -> dict:
    """
    Sincroniza aulas planejadas com o Google Calendar.
    Evita duplicatas verificando extendedProperties.lexiona_aula_id.
    """
    if not _google_disponivel():
        raise HTTPException(status_code=503, detail="Google Calendar não configurado.")

    try:
        service = _get_calendar_service(access_token, refresh_token)
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail="Credenciais do Google inválidas ou expiradas. Reconecte sua conta Google.",
        )

    criados = 0
    atualizados = 0
    erros = 0

    for aula in aulas:
        if aula.get("status") not in ("planejada", "pendente"):
            continue

        disciplina = disciplinas_map.get(aula["disciplina_id"], {})
        if not disciplina:
            continue

        try:
            evento = _formatar_evento(aula, disciplina)

            # Verificar se já existe evento para esta aula
            if aula.get("google_event_id"):
                # Atualizar evento existente
                service.events().update(
                    calendarId=calendar_id,
                    eventId=aula["google_event_id"],
                    body=evento,
                ).execute()
                atualizados += 1
            else:
                # Criar novo evento
                result = service.events().insert(
                    calendarId=calendar_id, body=evento
                ).execute()
                aula["_novo_google_event_id"] = result.get("id")
                criados += 1

        except Exception as e:
            logger.warning(f"Erro ao sincronizar aula {aula['id']}: {e}")
            erros += 1

    return {
        "criados": criados,
        "atualizados": atualizados,
        "erros": erros,
        "total": criados + atualizados,
    }
