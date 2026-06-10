param()

# Relaunch como administrador se necessário
function Test-IsAdmin {
    $current = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    return $current.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-IsAdmin)) {
    Write-Host "Solicitando permissões de administrador..."
    Start-Process -FilePath pwsh -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

Set-Location -Path (Split-Path -Path $PSCommandPath -Parent)

Write-Host "Rodando setup em: $(Get-Location)"

# 1) Criar venv se não existir
if (-not (Test-Path -Path .venv)) {
    Write-Host "Criando ambiente virtual (.venv)..."
    py -3 -m venv .venv
}

$python = Join-Path -Path (Get-Location) -ChildPath ".venv\Scripts\python.exe"
if (-not (Test-Path -Path $python)) {
    Write-Error "Python no venv não encontrado em $python"
    exit 1
}

Write-Host "Atualizando pip e instalando dependências..."
& $python -m pip install --upgrade pip
if (Test-Path -Path requirements.txt) {
    & $python -m pip install -r requirements.txt
} else {
    Write-Warning "requirements.txt não encontrado. Pulei instalação de pacotes."
}

# 2) Criar .env interativo se não existir
$envFile = Join-Path (Get-Location) ".env"
if (-not (Test-Path -Path $envFile)) {
    Write-Host "Arquivo .env não encontrado — vou ajudar a criar um."
    $required = @(
        'supabase_url', 'supabase_anon_key', 'supabase_service_key', 'groq_api_key', 'secret_key'
    )
    $optional = @('redis_url','google_client_id','google_client_secret','google_redirect_uri')
    $lines = @()
    foreach ($k in $required) {
        $val = Read-Host "Digite o valor para $k"
        $lines += "$k=$val"
    }
    foreach ($k in $optional) {
        $val = Read-Host "(opcional) valor para $k (Enter para pular)"
        if ($val -ne '') { $lines += "$k=$val" }
    }
    $lines += "environment=development"
    $lines | Out-File -FilePath $envFile -Encoding UTF8
    Write-Host ".env criado. Revise se estiver correto."
} else {
    Write-Host ".env já existe — mantendo"
}

# 3) Abrir regra de firewall para a porta 8000 (permitir tráfego TCP na porta 8000)
try {
    Write-Host "Adicionando regra de firewall para a porta 8000..."
    New-NetFirewallRule -DisplayName "lexiona-uvicorn-8000" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8000 -Profile Any -ErrorAction Stop | Out-Null
    Write-Host "Regra de firewall adicionada."
} catch {
    Write-Warning "Não foi possível adicionar regra de firewall (já existe ou erro)."
}

# 4) Iniciar servidor
Write-Host "Iniciando servidor uvicorn em 127.0.0.1:8000..."
& $python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
