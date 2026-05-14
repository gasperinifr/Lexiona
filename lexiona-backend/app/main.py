from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import auth, disciplinas, aulas, agente, agenda

app = FastAPI(
    title="Lexiona API",
    description="Plataforma de planejamento pedagógico inteligente para docentes",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(disciplinas.router)
app.include_router(aulas.router)
app.include_router(agente.router)
app.include_router(agenda.router)


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0", "plataforma": "Lexiona"}


@app.get("/")
async def root():
    return {"message": "Lexiona API — Planejamento pedagógico inteligente"}