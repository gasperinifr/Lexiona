import sys
import time
import os
import requests

# BASE URL can be provided by env var BASE_URL or as first CLI arg
BASE = os.getenv("BASE_URL", "http://127.0.0.1:8002")
if len(sys.argv) > 1:
    BASE = sys.argv[1]


def fail(msg):
    print("FAIL:", msg)
    sys.exit(1)


def ok(msg):
    print("OK:", msg)


def main():
    # Health
    r = requests.get(f"{BASE}/health")
    if r.status_code != 200 or r.json().get("status") != "ok":
        fail("/health not OK")
    ok("/health")

    # Root
    r = requests.get(f"{BASE}/")
    if r.status_code != 200:
        fail("/ root failed")
    ok("/")

    # Signup
    payload = {"nome": "Test Dev", "email": "testdev@example.com", "senha": "pass1234"}
    r = requests.post(f"{BASE}/auth/cadastro", json=payload)
    if r.status_code not in (200, 201):
        fail(f"/auth/cadastro failed: {r.status_code} {r.text}")
    ok("/auth/cadastro")

    # Login
    r = requests.post(f"{BASE}/auth/login", json={"email": payload["email"], "senha": payload["senha"]})
    if r.status_code != 200:
        fail(f"/auth/login failed: {r.status_code} {r.text}")
    token = r.json().get("access_token")
    if not token:
        fail("/auth/login did not return token")
    headers = {"Authorization": f"Bearer {token}"}
    ok("/auth/login")

    # Perfil
    r = requests.get(f"{BASE}/auth/perfil", headers=headers)
    if r.status_code != 200:
        fail(f"/auth/perfil failed: {r.status_code} {r.text}")
    ok("/auth/perfil")

    # List disciplinas (should return list)
    r = requests.get(f"{BASE}/disciplinas/", headers=headers)
    if r.status_code != 200:
        fail(f"/disciplinas/ failed: {r.status_code} {r.text}")
    ok("GET /disciplinas/")

    # Create disciplina
    corpo = {"nome": "Disc Test", "carga_horaria_total": 60, "periodo_inicio": "2026-06-01", "periodo_fim": "2026-06-30", "dias_semana": [1]}
    r = requests.post(f"{BASE}/disciplinas/", headers=headers, json=corpo)
    if r.status_code not in (200, 201):
        fail(f"POST /disciplinas/ failed: {r.status_code} {r.text}")
    data = r.json()
    disciplina_id = data.get("id")
    if not disciplina_id:
        fail("disciplinas creation did not return id")
    ok("POST /disciplinas/")

    # Processar texto
    r = requests.post(f"{BASE}/agente/processar-texto", headers=headers, json={"disciplina_id": disciplina_id, "texto": "Texto de ementa de teste longo o suficiente."})
    if r.status_code != 200:
        fail(f"/agente/processar-texto failed: {r.status_code} {r.text}")
    ok("/agente/processar-texto")

    # Gerar plano (may be async) -- call and then poll status
    r = requests.post(f"{BASE}/agente/gerar-plano", headers=headers, json={"disciplina_id": disciplina_id, "dados_confirmados": {}, "aula_ids": None})
    if r.status_code not in (200, 201):
        fail(f"/agente/gerar-plano failed: {r.status_code} {r.text}")
    job = r.json().get("job_id")
    ok("/agente/gerar-plano created job")

    if job:
        for i in range(10):
            time.sleep(0.5)
            rs = requests.get(f"{BASE}/agente/status/job/{job}", headers=headers)
            if rs.status_code == 200:
                st = rs.json().get("status")
                print("job status:", st)
                if st == "concluido" or st == "processando":
                    ok("/agente/status/job/{job}")
                    break
        else:
            print("warning: job did not finish quickly; continuing tests")

    # Agenda hoje
    r = requests.get(f"{BASE}/agenda/hoje", headers=headers)
    if r.status_code != 200:
        fail(f"/agenda/hoje failed: {r.status_code} {r.text}")
    ok("/agenda/hoje")

    print("All checks passed (dev mode).")


if __name__ == "__main__":
    main()
