from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any
from datetime import date, time
from enum import Enum


# ============================================================
# AUTH
# ============================================================

class CadastroRequest(BaseModel):
    nome: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    senha: str = Field(..., min_length=6)


class LoginRequest(BaseModel):
    email: EmailStr
    senha: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    professor: dict


class PerfilUpdate(BaseModel):
    nome: Optional[str] = None
    instituicao: Optional[str] = None
    modalidades: Optional[List[str]] = None


# ============================================================
# DISCIPLINAS
# ============================================================

class NivelEnum(str, Enum):
    fundamental = "fundamental"
    medio = "medio"
    superior = "superior"
    livre = "livre"
    tecnico = "tecnico"


class DisciplinaCreate(BaseModel):
    nome: str = Field(..., min_length=2, max_length=150)
    turma: Optional[str] = None
    nivel: NivelEnum = NivelEnum.medio
    carga_horaria_total: int = Field(..., gt=0, description="Carga horária em minutos")
    metodologia: str = "Tradicional"
    periodo_inicio: date
    periodo_fim: date
    dias_semana: List[int] = Field(..., description="0=Dom, 1=Seg ... 6=Sab")
    horario_inicio: Optional[time] = None
    horario_fim: Optional[time] = None
    ementa_texto: Optional[str] = None


class DisciplinaUpdate(BaseModel):
    nome: Optional[str] = None
    turma: Optional[str] = None
    metodologia: Optional[str] = None
    ementa_texto: Optional[str] = None
    ativa: Optional[bool] = None


class FeriadoCreate(BaseModel):
    data: date
    descricao: str
    tipo: str = "nacional"


# ============================================================
# AULAS
# ============================================================

class StatusAulaEnum(str, Enum):
    planejada = "planejada"
    pendente = "pendente"
    cancelada = "cancelada"
    realizada = "realizada"


class AulaUpdate(BaseModel):
    tema: Optional[str] = None
    objetivos: Optional[str] = None
    conteudos: Optional[str] = None
    recursos: Optional[str] = None
    metodologia_aula: Optional[str] = None
    status: Optional[StatusAulaEnum] = None


# ============================================================
# AGENTE DE IA
# ============================================================

class InsumoTextoRequest(BaseModel):
    disciplina_id: str
    texto: str = Field(..., min_length=10)


class GerarPlanoRequest(BaseModel):
    disciplina_id: str
    insumo_id: str
    dados_confirmados: dict  # dados da tela de conciliação


class ChatMensagem(BaseModel):
    disciplina_id: str
    mensagem: str
    historico: Optional[List[dict]] = []


class GerarIdeiasRequest(BaseModel):
    disciplina_id: str
    data: date


class ReplanejamentoRequest(BaseModel):
    disciplina_id: str
    motivo: Optional[str] = "Aula cancelada"


# ============================================================
# ONBOARDING
# ============================================================

class OnboardingStep1(BaseModel):
    nome: str
    instituicao: Optional[str] = None
    modalidades: List[str]


class OnboardingStep2(BaseModel):
    periodo_inicio: date
    periodo_fim: date
    feriados_customizados: Optional[List[FeriadoCreate]] = []


class OnboardingStep3(BaseModel):
    disciplina: DisciplinaCreate