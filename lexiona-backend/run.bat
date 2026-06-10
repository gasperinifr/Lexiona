@echo off
cd /d "%~dp0"
call .venv\Scripts\activate.bat
python -m uvicorn app.main:app --port 8000 --host 127.0.0.1
