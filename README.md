# Lexiona

Plataforma web de planejamento pedagógico inteligente para docentes. Organiza disciplinas, gera cronogramas de aulas, processa ementas em texto, PDF, DOCX ou áudio com IA e ajuda o professor a planejar, acompanhar e replanejar conteúdos durante o período letivo.

---

## Demo

Acesse: https://lexionabr.vercel.app/

---

## Stack

### Frontend

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-38B2AC?logo=tailwindcss)
![Recharts](https://img.shields.io/badge/Recharts-2-22B5BF)
![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8)

### Backend / Serviços

![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase)
![Groq](https://img.shields.io/badge/Groq-AI-000000)
![Redis](https://img.shields.io/badge/Redis-Cache-DC382D?logo=redis)
![Google Calendar](https://img.shields.io/badge/Google%20Calendar-Sync-4285F4?logo=googlecalendar)

---

## Features

* Cadastro e autenticação de professores via Supabase Auth
* Onboarding e perfil docente com instituição, modalidades e preferências
* Gestão de disciplinas por turma, nível, turno, metodologia, componente BNCC e carga horária
* Geração automática de datas de aula a partir do período letivo, dias da semana e feriados
* Suporte a disciplinas com aulas periódicas ou horários irregulares
* Processamento de ementas por texto livre, upload de PDF/DOCX ou gravação de áudio
* Transcrição de áudio com Groq Whisper (`whisper-large-v3`)
* Extração e estruturação semântica de conteúdos com Groq (`llama-3.3-70b-versatile`)
* Geração automática de planos de aula para aulas pendentes
* Chat de ajuste para refinar planejamento com contexto da disciplina
* Gerador de ideias de aula considerando aulas anteriores, aula atual e próximas aulas
* Replanejamento automático ao cancelar aulas com conteúdo planejado
* Agenda do dia, alertas de planejamento e visualização de próximas aulas
* Relatórios por disciplina e visão geral com gráficos de progresso
* Integração opcional com Google Calendar para sincronizar aulas como eventos
* Cache com Redis para agenda, disciplinas, progresso e relatórios
* PWA instalável com cache de assets e atalhos para dashboard e calendário

---

## Como rodar localmente

### Clone o projeto

```bash
git clone <repo-url>
cd lexiona
```

### Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz a partir do exemplo:

```bash
cp .env.example .env
```

Preencha as chaves do Supabase, Groq e, se for usar a integração, Google Calendar.

### Configure o banco de dados

No SQL Editor do Supabase, execute:

```text
supabase/schema.sql
supabase/schema_v2.sql
```

O primeiro arquivo cria as tabelas principais, políticas de RLS e triggers. O segundo aplica as colunas e tabelas adicionais usadas na versão atual, incluindo Google Calendar.

### Opção 1: Docker Compose

```bash
docker compose up --build
```

Acesse:

* Frontend: [http://localhost:5173](http://localhost:5173)
* Backend: [http://localhost:8000](http://localhost:8000)
* Healthcheck: [http://localhost:8000/health](http://localhost:8000/health)

### Opção 2: Rodar frontend e backend manualmente

Backend:

```bash
cd lexiona-backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Frontend:

```bash
cd lexiona-frontend
npm install
echo "VITE_API_URL=http://localhost:8000" > .env.local
npm run dev
```

Acesse [http://localhost:5173](http://localhost:5173).

---

## Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `SUPABASE_URL` | URL do projeto no Supabase |
| `SUPABASE_ANON_KEY` | Chave pública do Supabase |
| `SUPABASE_SERVICE_KEY` | Chave `service_role` do Supabase usada pelo backend |
| `GROQ_API_KEY` | Chave da API do Groq para IA e transcrição |
| `SECRET_KEY` | Segredo usado pela aplicação backend |
| `FRONTEND_URL` | URL base do frontend para CORS e callbacks |
| `REDIS_URL` | URL do Redis para cache, opcional em desenvolvimento |
| `GOOGLE_CLIENT_ID` | Client ID OAuth2 do Google Calendar, opcional |
| `GOOGLE_CLIENT_SECRET` | Client Secret OAuth2 do Google Calendar, opcional |
| `GOOGLE_REDIRECT_URI` | Callback OAuth2 do Google Calendar |
| `VITE_API_URL` | URL da API consumida pelo frontend |

---

## Deploy

* Frontend: Vercel ou qualquer hosting estático compatível com Vite
* Backend: FastAPI em container Docker, Render, Railway, Fly.io ou serviço equivalente
* Banco de dados + Auth: Supabase (PostgreSQL com Row Level Security)
* Cache: Redis local em desenvolvimento ou Upstash/Redis gerenciado em produção
* IA: Groq para geração de planejamento e transcrição de áudio

---

## Licença

MIT
