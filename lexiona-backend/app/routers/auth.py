import socket

import httpx
from fastapi import APIRouter, HTTPException, status, Depends
from supabase_auth.errors import AuthApiError, AuthInvalidCredentialsError, AuthRetryableError

from app.models.schemas import CadastroRequest, LoginRequest, LoginResponse, PerfilUpdate
from app.database import supabase, supabase_admin
from app.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Autenticação"])

FERIADOS_BR_2026 = [
    {"data": "2026-01-01", "descricao": "Confraternização Universal", "tipo": "nacional"},
    {"data": "2026-04-03", "descricao": "Sexta-feira Santa", "tipo": "nacional"},
    {"data": "2026-04-05", "descricao": "Páscoa", "tipo": "nacional"},
    {"data": "2026-04-21", "descricao": "Tiradentes", "tipo": "nacional"},
    {"data": "2026-05-01", "descricao": "Dia do Trabalho", "tipo": "nacional"},
    {"data": "2026-06-04", "descricao": "Corpus Christi", "tipo": "nacional"},
    {"data": "2026-09-07", "descricao": "Independência do Brasil", "tipo": "nacional"},
    {"data": "2026-10-12", "descricao": "Nossa Senhora Aparecida", "tipo": "nacional"},
    {"data": "2026-11-02", "descricao": "Finados", "tipo": "nacional"},
    {"data": "2026-11-15", "descricao": "Proclamação da República", "tipo": "nacional"},
    {"data": "2026-12-25", "descricao": "Natal", "tipo": "nacional"},
]


def _supabase_unavailable_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Nao foi possivel conectar ao Supabase. Verifique sua internet, DNS ou SUPABASE_URL.",
    )


@router.post("/cadastro", status_code=status.HTTP_201_CREATED)
async def cadastro(dados: CadastroRequest):
    try:
        # Criar usuário no Supabase Auth
        auth_response = supabase_admin.auth.admin.create_user({
            "email": dados.email,
            "password": dados.senha,
            "email_confirm": True,
        })

        if not auth_response.user:
            raise HTTPException(status_code=400, detail="Erro ao criar usuário")

        user_id = str(auth_response.user.id)

        # Criar perfil do professor
        supabase_admin.table("professores").insert({
            "id": user_id,
            "nome": dados.nome,
            "onboarding_concluido": False,
        }).execute()

        # Inserir feriados nacionais 2026
        feriados_data = [
            {**f, "professor_id": user_id}
            for f in FERIADOS_BR_2026
        ]
        supabase_admin.table("feriados").insert(feriados_data).execute()

        return {"message": "Cadastro realizado! Voce ja pode entrar."}

    except HTTPException:
        raise
    except (socket.gaierror, httpx.HTTPError, AuthRetryableError):
        raise _supabase_unavailable_error()
    except AuthApiError as e:
        if e.code in {"email_exists", "user_already_exists"}:
            raise HTTPException(status_code=409, detail="Este e-mail ja esta cadastrado")
        raise HTTPException(status_code=400, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login", response_model=LoginResponse)
async def login(dados: LoginRequest):
    try:
        response = supabase.auth.sign_in_with_password({
            "email": dados.email,
            "password": dados.senha,
        })

        if not response.user:
            raise HTTPException(status_code=401, detail="Credenciais inválidas")

        user_id = str(response.user.id)

        # Buscar perfil do professor
        professor = supabase_admin.table("professores").select("*").eq("id", user_id).single().execute()

        return LoginResponse(
            access_token=response.session.access_token,
            professor=professor.data or {"id": user_id, "nome": dados.email},
        )

    except HTTPException:
        raise
    except (socket.gaierror, httpx.HTTPError, AuthRetryableError):
        raise _supabase_unavailable_error()
    except AuthInvalidCredentialsError:
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos")
    except AuthApiError as e:
        if e.code == "email_not_confirmed":
            raise HTTPException(
                status_code=403,
                detail="E-mail ainda nao confirmado. Confirme o e-mail antes de entrar.",
            )
        if e.code in {"invalid_credentials", "user_not_found"}:
            raise HTTPException(status_code=401, detail="E-mail ou senha incorretos")
        if e.status >= 500:
            raise _supabase_unavailable_error()
        raise HTTPException(status_code=400, detail=e.message)
    except Exception:
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos")


@router.get("/perfil")
async def get_perfil(current_user: dict = Depends(get_current_user)):
    professor = supabase_admin.table("professores").select("*").eq("id", current_user["id"]).single().execute()
    if not professor.data:
        raise HTTPException(status_code=404, detail="Perfil não encontrado")
    return professor.data


@router.put("/perfil")
async def update_perfil(dados: PerfilUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in dados.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhum dado para atualizar")

    response = supabase_admin.table("professores").update(update_data).eq("id", current_user["id"]).execute()
    return response.data[0] if response.data else {}


@router.post("/onboarding/concluir")
async def concluir_onboarding(current_user: dict = Depends(get_current_user)):
    supabase_admin.table("professores").update(
        {"onboarding_concluido": True}
    ).eq("id", current_user["id"]).execute()
    return {"message": "Onboarding concluído!"}
