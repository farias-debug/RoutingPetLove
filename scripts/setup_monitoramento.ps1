param(
    [switch]$SkipPython,
    [switch]$SkipNode
)

$ErrorActionPreference = "Stop"

$dashboardRoot = Join-Path (Split-Path $PSScriptRoot -Parent) "Dashboard"
$venvPython = Join-Path $dashboardRoot ".venv\Scripts\python.exe"
$googleAppsDir = Join-Path $dashboardRoot "google_apps"

Write-Host ""
Write-Host "=== SETUP MONITORAMENTO ===" -ForegroundColor Cyan
Write-Host ""

if (-not $SkipPython) {
    if (-not (Test-Path $venvPython)) {
        throw "Python da venv nao encontrado em $venvPython"
    }

    Write-Host "[1/3] Instalando dependencias Python..." -ForegroundColor Yellow
    & $venvPython -m pip install -r (Join-Path $dashboardRoot "requirements.txt")
    if ($LASTEXITCODE -ne 0) {
        throw "Falha ao instalar dependencias Python."
    }
    Write-Host "[1/3] Python OK" -ForegroundColor Green
}

if (-not $SkipNode) {
    Write-Host "[2/3] Instalando dependencias Node (Playwright)..." -ForegroundColor Yellow
    Push-Location $dashboardRoot
    try {
        & npm install
        if ($LASTEXITCODE -ne 0) {
            throw "Falha no npm install do pipeline."
        }
    }
    finally {
        Pop-Location
    }
    Write-Host "[2/3] Node (Playwright) OK" -ForegroundColor Green

    Write-Host "[3/3] Instalando dependencias Node do Apps Script..." -ForegroundColor Yellow
    Push-Location $googleAppsDir
    try {
        & npm install
        if ($LASTEXITCODE -ne 0) {
            throw "Falha no npm install do google_apps."
        }
    }
    finally {
        Pop-Location
    }
    Write-Host "[3/3] Apps Script OK" -ForegroundColor Green
}

Write-Host ""
Write-Host "Setup concluido." -ForegroundColor Green

