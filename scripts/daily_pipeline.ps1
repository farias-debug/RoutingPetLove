<#
.SYNOPSIS
  Pipeline diário completo: transform → Power BI CSVs → Git sync.
.DESCRIPTION
  Executa o transform.py canônico do Dashboard (normaliza fontes,
  gera CSVs para Power BI) e faz commit/push automático no GitHub.
#>
param(
    [switch]$SkipGit
)

$ErrorActionPreference = "Stop"
Set-Location -Path (Split-Path $PSScriptRoot -Parent)

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$dateTag = Get-Date -Format "yyyy-MM-dd"

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   PIPELINE DIARIO — DASHBOARD TRANSPORTE         " -ForegroundColor Cyan
Write-Host "   $timestamp                          " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# ── 1) Verificar ambiente ───────────────────────────────────
$dashboardDir = Join-Path $PSScriptRoot "..\Dashboard"
$pythonExe = Join-Path $PSScriptRoot "..\Dashboard\.venv\Scripts\python.exe"

if (-not (Test-Path $pythonExe)) {
    Write-Host "[ERRO] Ambiente virtual nao encontrado. Execute setup_venv.ps1 primeiro." -ForegroundColor Red
    exit 1
}

# Verificar fontes
$monitorCSV = Join-Path $dashboardDir "data\Relatorio_Monitoramento_Carga_Completo.csv"
$planejadoXLSX = Join-Path $dashboardDir "data\Relorio_Planejamento_Carga_Completo.xlsx"

if (-not (Test-Path $monitorCSV)) {
    Write-Host "[ERRO] Fonte nao encontrada: $monitorCSV" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path $planejadoXLSX)) {
    Write-Host "[ERRO] Fonte nao encontrada: $planejadoXLSX" -ForegroundColor Red
    exit 1
}

Write-Host "[1/3] Ambiente OK" -ForegroundColor Green
Write-Host "       Python: $pythonExe" -ForegroundColor DarkGray
Write-Host "       Fontes: Dashboard/data/ (2 arquivos)" -ForegroundColor DarkGray

# ── 2) Executar transform.py ────────────────────────────────
Write-Host "[2/3] Executando transform.py..." -ForegroundColor Yellow

Push-Location $dashboardDir
try {
    & $pythonExe scripts/transform.py
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERRO] Transform falhou com codigo $LASTEXITCODE" -ForegroundColor Red
        exit $LASTEXITCODE
    }
    Write-Host "[2/3] Transform concluido com sucesso." -ForegroundColor Green
}
finally {
    Pop-Location
}

# ── 3) Git sync ─────────────────────────────────────────────
if (-not $SkipGit) {
    Write-Host "[3/3] Sincronizando com GitHub..." -ForegroundColor Yellow
    & powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "git_daily_sync.ps1") -AutoMessage "pipeline: atualizacao diaria $dateTag"
    Write-Host "[3/3] GitHub sincronizado." -ForegroundColor Green
}
else {
    Write-Host "[3/3] Git sync ignorado (-SkipGit)." -ForegroundColor DarkYellow
}

Write-Host ""
Write-Host "=== Pipeline concluido em $(Get-Date -Format 'HH:mm:ss') ===" -ForegroundColor Cyan
Write-Host ""
