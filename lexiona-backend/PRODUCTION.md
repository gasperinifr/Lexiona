# Alternar entre `development` e `production`

Este arquivo descreve os passos mínimos para rodar o backend em produção  e como reverter ao modo de desenvolvimento local.

1) Configurar variáveis de ambiente

- Crie/atualize o arquivo `.env` dentro de `lexiona-backend` com as credenciais reais. Mude `environment` para `production`:

  - `environment=production`
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`
  - `GROQ_API_KEY`
  - `SECRET_KEY`
  - `FRONTEND_URL` (ex: https://app.seu-dominio)
  - `REDIS_URL` (opcional, se usar cache)
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` (se usar Google Calendar)

2) Preparar serviços externos

- No Supabase, aplique os arquivos SQL em `supabase/` (`schema.sql` e `schema_v2.sql`) no editor SQL do projeto.
- Garanta que o Redis (se usado) esteja acessível na URL indicada por `REDIS_URL`.
- Verifique que as chaves da API (Groq, Google) estão válidas.

3) Executar a aplicação

- Recomendações locais (Windows):

```powershell
cd lexiona-backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

- Produção (recomendado usar Docker / process manager):

```bash
docker compose up --build
# ou com Gunicorn / Uvicorn em um host gerenciado
```

4) Comportamento do código

- Quando `environment` for diferente de `development`, o backend usará os clientes reais definidos em `app/database.py` e as chamadas a Groq/Redis serão reais. As alterações de desenvolvimento aplicadas (cliente fake, stubs de IA and auth dev) são ativadas apenas quando `environment == "development"`.
- Não é preciso remover arquivos `app/dev_client.py` — o código só o usa em `development`.

5) Testes básicos pós-deploy

- Healthcheck: `GET /health`
- OpenAPI: `GET /openapi.json`
- Se quiser rodar o script local de verificação automática (`tools/check_endpoints.py`), atualize a variável `BASE` dentro do script para `http://127.0.0.1:8000` e execute:

```bash
python tools/check_endpoints.py
```

6) Segurança e boas práticas

- Nunca comite `.env` para o repositório. Use secret manager no deploy.
- Proteja a `SUPABASE_SERVICE_KEY` (bypass RLS) — use apenas em backend seguro.
- Monitore logs e healthchecks; use ferramentas para restart automático (systemd, container orchestrator).

7) Reverter para dev

- Para voltar ao modo local com stubs, defina `environment=development` no `.env` e reinicie o servidor. Os mocks e stubs serão ativados automaticamente.

Se quiser, posso criar um exemplo de `.env.production.example` contendo as chaves esperadas (sem valores sensíveis) e/ou ajustar `tools/check_endpoints.py` para suportar teste automático em ambos os ambientes.
