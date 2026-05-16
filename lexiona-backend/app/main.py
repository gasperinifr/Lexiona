from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.routers import auth, disciplinas, aulas, agente, agenda
from app.routers import google_calendar, relatorios
from app.services import cache_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("lexiona")


# ============================================================
# LIFESPAN — inicialização e encerramento
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Iniciando Lexiona API...")
    await cache_service.connect()
    yield
    logger.info("🛑 Encerrando Lexiona API...")
    await cache_service.disconnect()


# ============================================================
# APLICAÇÃO
# ============================================================

app = FastAPI(
    title="Lexiona API",
    description="Plataforma de planejamento pedagógico inteligente para docentes",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# HANDLERS DE ERRO GLOBAL
# ============================================================

@app.exception_handler(Exception)
async def generic_error_handler(request: Request, exc: Exception):
    logger.error(f"Erro não tratado: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Ocorreu um erro inesperado no servidor. Nossa equipe foi notificada.",
            "codigo": "SERVER_ERROR",
            "acao_sugerida": "Tente novamente em alguns instantes. Se o problema persistir, entre em contato com o suporte.",
        },
    )


# ============================================================
# ROUTERS
# ============================================================

app.include_router(auth.router)
app.include_router(disciplinas.router)
app.include_router(aulas.router)
app.include_router(agente.router)
app.include_router(agenda.router)
app.include_router(google_calendar.router)
app.include_router(relatorios.router)


# ============================================================
# ENDPOINTS DE SISTEMA
# ============================================================

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "version": "2.0.0",
        "plataforma": "Lexiona",
        "cache": "online" if cache_service.is_available() else "offline",
    }


@app.get("/")
async def root():
    return {"message": "Lexiona API v2.0 — Planejamento pedagógico inteligente"}