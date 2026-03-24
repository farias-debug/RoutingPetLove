<#
.SYNOPSIS
  Pipeline diário BigQuery: extração TMS → consolidar → carga BQ → deploy v7 → Git sync.
.DESCRIPTION
  Executa o fluxo canônico de dados via BigQuery:
  [1/4] Extrair dados do TMS via Playwright (últimos 7 dias)
  [2/4] Consolidar CSVs incrementais
  [3/4] Carregar dados no BigQuery (load_raw_to_bq.py)
  [4/4] Git sync automático

  NOTA: Fluxo Google Sheets descontinuado. sync_bq_to_sheets.py em bigquery/_archive/.
#>
param(
    [switch]$SkipExtract,
    [switch]$SkipGit,
    [switch]$SkipConsolidar
)

$ErrorActionPreference = "Stop"
Set-Location -Path (Split-Path $PSScriptRoot -Parent)

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$dateTag = Get-Date -Format "yyyy-MM-dd"

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   PIPELINE DIARIO — BIGQUERY PATH (v7)           " -ForegroundColor Cyan
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

if (-not (Test-Path $loadScript)) {
    Write-Host "[ERRO] Script nao encontrado: $loadScript" -ForegroundColor Red
    exit 1
}

Write-Host "[0/5] Ambiente OK" -ForegroundColor Green
Write-Host "       Python: $pythonExe" -ForegroundColor DarkGray
Write-Host "       Dashboard: $dashboardDir" -ForegroundColor DarkGray
if ($env:TMS_GCS_BUCKET) {
    $gcsPrefix = if ($env:TMS_GCS_PREFIX) { $env:TMS_GCS_PREFIX } else { "tms-monitoramento" }
    Write-Host "       GCS: gs://$($env:TMS_GCS_BUCKET)/$gcsPrefix" -ForegroundColor DarkGray
}
Write-Host ""

# ── 1) Extrair dados do TMS ─────────────────────────────────
$extractScript = Join-Path $dashboardDir "extraction\extrair_relatorio_tms.mjs"
if (-not $SkipExtract) {
    if (Test-Path $extractScript) {
        Write-Host "[1/5] Extraindo dados do TMS (ultimos 7 dias)..." -ForegroundColor Yellow
        Push-Location $dashboardDir
        try {
            node $extractScript --days-back 7
            if ($LASTEXITCODE -ne 0) {
                Write-Host "[AVISO] Extracao TMS falhou (codigo $LASTEXITCODE). Continuando com dados existentes." -ForegroundColor DarkYellow
            }
            else {
                Write-Host "[1/5] Extracao TMS concluida." -ForegroundColor Green
            }
        }
        finally {
            Pop-Location
        }
    }
    else {
        Write-Host "[1/5] Script de extracao nao encontrado, pulando." -ForegroundColor DarkYellow
    }
}
else {
    Write-Host "[1/5] Extracao TMS ignorada (-SkipExtract)." -ForegroundColor DarkYellow
}
Write-Host ""

# ── 2) Consolidar CSVs incrementais ────────────────────────
if (-not $SkipConsolidar) {
    if (Test-Path $consolidarScript) {
        if ($env:TMS_GCS_BUCKET) {
            Write-Host "[2/5] Consolidando CSVs incrementais com persistencia no GCS..." -ForegroundColor Yellow
        }
        else {
            Write-Host "[2/5] Consolidando CSVs incrementais..." -ForegroundColor Yellow
        }
        Push-Location $dashboardDir
        try {
            & $pythonExe $consolidarScript
            if ($LASTEXITCODE -ne 0) {
                Write-Host "[ERRO] Consolidacao falhou com codigo $LASTEXITCODE" -ForegroundColor Red
                exit $LASTEXITCODE
            }
            Write-Host "[2/5] Consolidacao concluida." -ForegroundColor Green
        }
        finally {
            Pop-Location
        }
    }
    else {
        Write-Host "[2/5] Script de consolidacao nao encontrado, pulando." -ForegroundColor DarkYellow
    }
}
else {
    Write-Host "[2/5] Consolidacao ignorada (-SkipConsolidar)." -ForegroundColor DarkYellow
}
Write-Host ""

# ── 3) Carregar dados no BigQuery ───────────────────────────
Write-Host "[3/5] Carregando dados no BigQuery (all tables)..." -ForegroundColor Yellow

Push-Location $dashboardDir
try {
    & $pythonExe $loadScript --table all
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERRO] Carga BQ falhou com codigo $LASTEXITCODE" -ForegroundColor Red
        exit $LASTEXITCODE
    }
    Write-Host "[3/5] Carga BQ concluida (raw_monitoramento + raw_planejamento + raw_dim_filial)." -ForegroundColor Green
}
finally {
    Pop-Location
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
