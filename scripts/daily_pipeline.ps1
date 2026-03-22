<#
.SYNOPSIS
  Pipeline diário BigQuery: consolidar → carga BQ → sync Sheets → Git sync.
.DESCRIPTION
  Executa o fluxo canônico de dados via BigQuery:
  [1/4] Consolidar CSVs incrementais
  [2/4] Carregar dados no BigQuery (load_raw_to_bq.py)
  [3/4] Sincronizar views BQ → Google Sheets (sync_bq_to_sheets.py)
  [4/4] Git sync automático

  Para extração TMS (Playwright), use também:
  Dashboard\extraction\extrair_monitoramento_rotas.ps1
#>
param(
    [switch]$SkipGit,
    [switch]$SkipSync,
    [switch]$SkipConsolidar
)

$ErrorActionPreference = "Stop"
Set-Location -Path (Split-Path $PSScriptRoot -Parent)

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$dateTag = Get-Date -Format "yyyy-MM-dd"

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   PIPELINE DIARIO — BIGQUERY PATH                " -ForegroundColor Cyan
Write-Host "   $timestamp                          " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# ── 0) Verificar ambiente ───────────────────────────────────
$dashboardDir = Join-Path $PSScriptRoot "..\Dashboard"
$pythonExe = Join-Path $dashboardDir ".venv\Scripts\python.exe"
$sheetsId = "1Z-Jhaf9g4dbnti_ry7IO2J6BuZhCsqhoUREKtWMd3k4"

if (-not (Test-Path $pythonExe)) {
    Write-Host "[ERRO] Ambiente virtual nao encontrado: $pythonExe" -ForegroundColor Red
    Write-Host "       Execute: python -m venv Dashboard\.venv" -ForegroundColor Yellow
    exit 1
}

$consolidarScript = Join-Path $dashboardDir "extraction\consolidar_monitoramento.py"
$loadScript = Join-Path $dashboardDir "bigquery\load_raw_to_bq.py"
$syncScript = Join-Path $dashboardDir "bigquery\sync_bq_to_sheets.py"

foreach ($script in @($loadScript, $syncScript)) {
    if (-not (Test-Path $script)) {
        Write-Host "[ERRO] Script nao encontrado: $script" -ForegroundColor Red
        exit 1
    }
}

Write-Host "[0/4] Ambiente OK" -ForegroundColor Green
Write-Host "       Python: $pythonExe" -ForegroundColor DarkGray
Write-Host "       Dashboard: $dashboardDir" -ForegroundColor DarkGray
Write-Host ""

# ── 1) Consolidar CSVs incrementais ────────────────────────
if (-not $SkipConsolidar) {
    if (Test-Path $consolidarScript) {
        Write-Host "[1/4] Consolidando CSVs incrementais..." -ForegroundColor Yellow
        Push-Location $dashboardDir
        try {
            & $pythonExe $consolidarScript
            if ($LASTEXITCODE -ne 0) {
                Write-Host "[ERRO] Consolidacao falhou com codigo $LASTEXITCODE" -ForegroundColor Red
                exit $LASTEXITCODE
            }
            Write-Host "[1/4] Consolidacao concluida." -ForegroundColor Green
        }
        finally {
            Pop-Location
        }
    }
    else {
        Write-Host "[1/4] Script de consolidacao nao encontrado, pulando." -ForegroundColor DarkYellow
    }
}
else {
    Write-Host "[1/4] Consolidacao ignorada (-SkipConsolidar)." -ForegroundColor DarkYellow
}
Write-Host ""

# ── 2) Carregar dados no BigQuery ───────────────────────────
Write-Host "[2/4] Carregando dados no BigQuery..." -ForegroundColor Yellow

Push-Location $dashboardDir
try {
    & $pythonExe $loadScript
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERRO] Carga BQ falhou com codigo $LASTEXITCODE" -ForegroundColor Red
        exit $LASTEXITCODE
    }
    Write-Host "[2/4] Carga BQ concluida." -ForegroundColor Green
}
finally {
    Pop-Location
}
Write-Host ""

# ── 3) Sincronizar BQ → Google Sheets ──────────────────────
if (-not $SkipSync) {
    Write-Host "[3/4] Sincronizando BigQuery → Google Sheets..." -ForegroundColor Yellow
    Push-Location $dashboardDir
    try {
        & $pythonExe $syncScript $sheetsId
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[ERRO] Sync Sheets falhou com codigo $LASTEXITCODE" -ForegroundColor Red
            exit $LASTEXITCODE
        }
        Write-Host "[3/4] Sync Sheets concluido (13 abas)." -ForegroundColor Green
    }
    finally {
        Pop-Location
    }
}
else {
    Write-Host "[3/4] Sync Sheets ignorado (-SkipSync)." -ForegroundColor DarkYellow
}
Write-Host ""

# ── 4) Git sync ─────────────────────────────────────────────
if (-not $SkipGit) {
    Write-Host "[4/4] Sincronizando com GitHub..." -ForegroundColor Yellow
    & powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "git_daily_sync.ps1") -AutoMessage "pipeline: atualizacao diaria $dateTag"
    Write-Host "[4/4] GitHub sincronizado." -ForegroundColor Green
}
else {
    Write-Host "[4/4] Git sync ignorado (-SkipGit)." -ForegroundColor DarkYellow
}

Write-Host ""
Write-Host "=== Pipeline BQ concluido em $(Get-Date -Format 'HH:mm:ss') ===" -ForegroundColor Cyan
Write-Host ""
