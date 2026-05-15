from pydantic import BaseModel, EmailStr, Field, model_validator
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


class TurnoEnum(str, Enum):
    matutino = "matutino"
    vespertino = "vespertino"
    noturno = "noturno"
    integral = "integral"
    particular = "particular"  # aulas particulares / irregulares


class ModoPlanejamentoEnum(str, Enum):
    periodico = "periodico"    # tem periodo definido e dias fixos
    irregular = "irregular"    # sem horário fixo, aulas adicionadas manualmente


class DisciplinaCreate(BaseModel):
    nome: str = Field(..., min_length=2, max_length=150)
    turma: Optional[str] = None                          # ex: "9°A", "Turma B"
    turno: Optional[TurnoEnum] = None                    # matutino, vespertino, noturno...
    nivel: NivelEnum = NivelEnum.medio
    carga_horaria_total: int = Field(..., gt=0, description="Carga horária em minutos")
    metodologia: str = "Tradicional"
    modo_planejamento: ModoPlanejamentoEnum = ModoPlanejamentoEnum.periodico

    # Obrigatórios apenas no modo periódico
    periodo_inicio: Optional[date] = None
    periodo_fim: Optional[date] = None
    dias_semana: Optional[List[int]] = Field(default_factory=list, description="0=Dom, 1=Seg ... 6=Sab")

    horario_inicio: Optional[time] = None
    horario_fim: Optional[time] = None
    ementa_texto: Optional[str] = None
    bncc_componente: Optional[str] = None    # ex: "Matemática", "Língua Portuguesa"

    @model_validator(mode="after")
    def validar_modo_periodico(self):
        if self.modo_planejamento == ModoPlanejamentoEnum.periodico:
            if not self.periodo_inicio:
                raise ValueError("Período de início é obrigatório para disciplinas com horário fixo.")
            if not self.periodo_fim:
                raise ValueError("Período de fim é obrigatório para disciplinas com horário fixo.")
            if not self.dias_semana:
                raise ValueError("Selecione pelo menos um dia de aula para disciplinas com horário fixo.")
            if self.periodo_inicio >= self.periodo_fim:
                raise ValueError("A data de início deve ser anterior à data de fim.")
        return self


class DisciplinaUpdate(BaseModel):
    nome: Optional[str] = None
    turma: Optional[str] = None
    turno: Optional[TurnoEnum] = None
    metodologia: Optional[str] = None
    ementa_texto: Optional[str] = None
    bncc_componente: Optional[str] = None
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


class AulaManualCreate(BaseModel):
    """Para adicionar aula manualmente em disciplinas no modo irregular."""
    disciplina_id: str
    data: date
    horario_inicio: Optional[time] = None
    horario_fim: Optional[time] = None
    tema: Optional[str] = None
    objetivos: Optional[str] = None


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
    aula_cancelada_id: str
    motivo: Optional[str] = "Aula cancelada"


# ============================================================
# ONBOARDING
# ============================================================

class OnboardingStep1(BaseModel):
    nome: str
    instituicao: Optional[str] = None
    modalidades: List[str]


class OnboardingStep2(BaseModel):
    periodo_inicio: Optional[date] = None
    periodo_fim: Optional[date] = None
    sem_periodo_fixo: bool = False
    feriados_customizados: Optional[List[FeriadoCreate]] = []


class OnboardingStep3(BaseModel):
    disciplina: DisciplinaCreate


# ============================================================
# GOOGLE CALENDAR
# ============================================================

class GoogleCalendarSyncRequest(BaseModel):
    disciplina_ids: Optional[List[str]] = None  # None = todas as disciplinas


# ============================================================
# RELATÓRIOS
# ============================================================

class RelatorioFiltro(BaseModel):
    disciplina_id: Optional[str] = None
    periodo_inicio: Optional[date] = None
    periodo_fim: Optional[date] = None
