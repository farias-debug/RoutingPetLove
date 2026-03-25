<#
.SYNOPSIS
  Health check completo do ambiente de trabalho.
.DESCRIPTION
  Verifica ferramentas, ambiente Python, estado do Git, e
  integridade dos dados do Dashboard.
#>
$ErrorActionPreference = "Continue"
Set-Location -Path (Split-Path $PSScriptRoot -Parent)
$dashboardRoot = "Dashboard"

$ok = 0; $warn = 0; $fail = 0

function Check-OK($msg) { $script:ok++; Write-Host "  [OK]   $msg" -ForegroundColor Green }
function Check-WARN($msg) { $script:warn++; Write-Host "  [WARN] $msg" -ForegroundColor Yellow }
function Check-FAIL($msg) { $script:fail++; Write-Host "  [FAIL] $msg" -ForegroundColor Red }

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "         HEALTH CHECK - PROJETOS                  " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# -- 1. Ferramentas CLI ------------------------------------
Write-Host "`n-- Ferramentas --" -ForegroundColor White

if (Get-Command git -ErrorAction SilentlyContinue) { Check-OK "Git $(git --version)" }
else { Check-FAIL "Git nao encontrado" }

if (Get-Command node -ErrorAction SilentlyContinue) { Check-OK "Node.js $(node --version)" }
else { Check-WARN "Node.js nao encontrado" }

if (Get-Command pnpm -ErrorAction SilentlyContinue) { Check-OK "pnpm $(pnpm --version)" }
else { Check-WARN "pnpm nao encontrado" }

if (Get-Command gh -ErrorAction SilentlyContinue) { Check-OK "GitHub CLI $(gh --version 2>&1 | Select-Object -First 1)" }
else { Check-FAIL "GitHub CLI nao encontrado" }

# -- 2. GitHub Auth ----------------------------------------
Write-Host "`n-- GitHub --" -ForegroundColor White

$ghAuth = gh auth status 2>&1
if ($LASTEXITCODE -eq 0) { Check-OK "GitHub autenticado" }
else { Check-FAIL 'GitHub nao autenticado - rode: gh auth login' }

$remote = git remote get-url origin 2>&1
if ($remote -match "github.com") { Check-OK "Remote: $remote" }
else { Check-WARN "Remote nao configurado para GitHub" }

# -- 3. Ambiente Python ------------------------------------
Write-Host "`n-- Ambiente Python --" -ForegroundColor White

$pythonExe = Join-Path "Dashboard" ".venv\Scripts\python.exe"
if (Test-Path $pythonExe) {
    $pyVer = & $pythonExe --version 2>&1
    Check-OK "Python venv: $pyVer"

    $pandas = & $pythonExe -c 'import pandas; print(pandas.__version__)' 2>&1
    if ($LASTEXITCODE -eq 0) { Check-OK "pandas $pandas" }
    else { Check-FAIL 'pandas nao instalado no venv' }

    $openpyxl = & $pythonExe -c 'import openpyxl; print(openpyxl.__version__)' 2>&1
    if ($LASTEXITCODE -eq 0) { Check-OK "openpyxl $openpyxl" }
    else { Check-FAIL 'openpyxl nao instalado - necessario para Excel' }

    $pyarrow = & $pythonExe -c 'import pyarrow; print(pyarrow.__version__)' 2>&1
    if ($LASTEXITCODE -eq 0) { Check-OK "pyarrow $pyarrow" }
    else { Check-WARN 'pyarrow nao instalado (opcional, melhora performance)' }
}
else {
    Check-FAIL 'Ambiente virtual nao encontrado - rode setup_venv.ps1'
}

# -- 4. Dashboard - Fontes --------------------------------
Write-Host "`n-- Dashboard: Fontes --" -ForegroundColor White

$monitorCSV = "Dashboard\data\Relatorio_Monitoramento_Carga_Completo.csv"
if (Test-Path $monitorCSV) {
    $size = [math]::Round((Get-Item $monitorCSV).Length / 1MB, 2)
    Check-OK "Monitoramento CSV: $size MB"
}
else { Check-FAIL "Monitoramento CSV nao encontrado em Dashboard/data/" }

$planejadoXLSX = "Dashboard\data\Relorio_Planejamento_Carga_Completo.xlsx"
if (Test-Path $planejadoXLSX) {
    $size = [math]::Round((Get-Item $planejadoXLSX).Length / 1MB, 2)
    Check-OK "Planejamento XLSX: $size MB"
}
else { Check-FAIL "Planejamento XLSX nao encontrado em Dashboard/data/" }

# -- 5. Dashboard - Config --------------------------------
Write-Host "`n-- Dashboard: Config --" -ForegroundColor White

$requiredConfigs = @(
    "config\google_sheets_visual_config.json"
)

foreach ($cfg in $requiredConfigs) {
    $cfgPath = Join-Path "Dashboard" $cfg
    if (Test-Path $cfgPath) { Check-OK $cfg }
    else { Check-FAIL "$cfg nao encontrado" }
}

$credentialsPath = Join-Path "Dashboard" "config\credentials"
if (Test-Path $credentialsPath) { Check-OK "config\credentials/" }
else { Check-WARN "config\credentials/ nao encontrado" }

# Tabelas auxiliares (fonte local)
foreach ($aux in @("data\tab_auxiliar\dim_filial.xlsx", "data\tab_auxiliar\dim_placas_veiculos.xlsx")) {
    $auxPath = Join-Path "Dashboard" $aux
    if (Test-Path $auxPath) { Check-OK $aux }
    else { Check-WARN "$aux nao encontrado (tabela auxiliar local)" }
}

# -- 6. Dashboard - Output Power BI -----------------------
Write-Host "`n-- Dashboard: Output Power BI --" -ForegroundColor White

$pbiDir = "Dashboard\output\powerbi"
$expectedCSVs = @("fato_rotas.csv", "fato_planejado.csv", "dim_tipo_veiculo.csv")

foreach ($csv in $expectedCSVs) {
    $csvPath = Join-Path $pbiDir $csv
    if (Test-Path $csvPath) {
        $size = [math]::Round((Get-Item $csvPath).Length / 1MB, 2)
        Check-OK "$csv ($size MB)"
    }
    else { Check-WARN "$csv nao encontrado (rode transform.py)" }
}

# -- 6.1 Dashboard - Projeto Power BI ---------------------
Write-Host "`n-- Dashboard: Projeto Power BI --" -ForegroundColor White

$pbipCanonical = "Dashboard\Painel Monitoramento - Petlove.pbip"
$reportCanonical = "Dashboard\Painel Monitoramento - Petlove.Report"
$semanticCanonical = "Dashboard\Painel Monitoramento - Petlove.SemanticModel"

if (Test-Path $pbipCanonical) { Check-OK "PBIP canônico: $pbipCanonical" }
else { Check-WARN "PBIP canônico nao encontrado neste workspace: $pbipCanonical" }

if (Test-Path $reportCanonical) { Check-OK "Report canônico: $reportCanonical" }
else { Check-WARN "Report canônico nao encontrado neste workspace: $reportCanonical" }

if (Test-Path $semanticCanonical) { Check-OK "SemanticModel canônico: $semanticCanonical" }
else { Check-WARN "SemanticModel canônico nao encontrado neste workspace: $semanticCanonical" }

if ((Test-Path $pbipCanonical) -and (Test-Path $reportCanonical) -and (Test-Path $semanticCanonical)) {
    try {
        $pbip = Get-Content $pbipCanonical -Raw | ConvertFrom-Json
        $reportPath = $pbip.artifacts[0].report.path
        if ($reportPath -eq "Painel Monitoramento - Petlove.Report") {
            Check-OK "PBIP aponta para report canônico"
        }
        else {
            Check-WARN "PBIP aponta para '$reportPath' (esperado: Painel Monitoramento - Petlove.Report)"
        }
    }
    catch {
        Check-WARN "Nao foi possivel validar JSON do PBIP canônico"
    }
}
else {
    Check-WARN "Artefatos PBIP não são obrigatórios no workspace atual; validação estrutural pulada"
}

# -- 7. Git status -----------------------------------------
Write-Host "`n-- Git Status --" -ForegroundColor White

$dirty = (git status --porcelain 2>&1 | Measure-Object).Count
if ($dirty -eq 0) { Check-OK "Working tree limpo" }
elseif ($dirty -lt 20) { Check-WARN "$dirty arquivo(s) nao commitado(s)" }
else { Check-WARN "$dirty arquivo(s) nao commitado(s) - considere rodar git_daily_sync" }

$lastCommit = git log -1 --format="%h %s (%cr)" 2>&1
Check-OK "Ultimo commit: $lastCommit"

# == BigQuery Data Freshness ====================================
Write-Host "`n-- BigQuery Data Freshness --" -ForegroundColor Cyan
$venvPython = Join-Path $dashboardRoot ".venv\Scripts\python.exe"
if (Test-Path $venvPython) {
    $bqCheckScript = @"
import sys
try:
    from google.cloud import bigquery
    client = bigquery.Client(project='data-aileron-482822-d0')
    q = '''
        SELECT
            MAX(data_referencia) AS max_data,
            COUNT(*) AS total_rows,
            DATE_DIFF(CURRENT_DATE(), MAX(data_referencia), DAY) AS dias_atraso
        FROM `data-aileron-482822-d0.monitoramento_carga.base_execucao_canonica`
    '''
    rows = list(client.query(q).result())
    r = rows[0]
    print(f'max_data={r.max_data}|total_rows={r.total_rows}|dias_atraso={r.dias_atraso}')
except Exception as e:
    print(f'ERROR|{e}', file=sys.stderr)
    sys.exit(1)
"@
    $bqResult = & $venvPython -c $bqCheckScript 2>&1
    if ($LASTEXITCODE -eq 0) {
        $parts = ($bqResult -split '\|')
        $maxData = ($parts[0] -split '=')[1]
        $totalRows = ($parts[1] -split '=')[1]
        $diasAtraso = [int]($parts[2] -split '=')[1]
        Check-OK "base_execucao_canonica: $totalRows linhas, ultima data=$maxData"
        if ($diasAtraso -le 2) {
            Check-OK "Dados frescos (atraso: ${diasAtraso}d)"
        }
        elseif ($diasAtraso -le 5) {
            Check-WARN "Dados com ${diasAtraso} dias de atraso"
        }
        else {
            Check-FAIL "Dados desatualizados: ${diasAtraso} dias de atraso"
        }
    }
    else {
        Check-WARN "Nao foi possivel consultar BigQuery: $bqResult"
    }
}
else {
    Check-WARN "Python venv nao encontrado - pulando check de BigQuery"
}

# == BigQuery Contract Validation ===============================
Write-Host "`n-- BigQuery Data Contract --" -ForegroundColor Cyan
$contractScript = Join-Path $dashboardRoot "bigquery\validate_data_contract.py"
if ((Test-Path $venvPython) -and (Test-Path $contractScript)) {
    $contractOutput = & $venvPython $contractScript 2>&1
    if ($LASTEXITCODE -eq 0) {
        Check-OK "Validacao do contrato canonico da API BigQuery aprovada"
    }
    else {
        Check-WARN "Falha na validacao do contrato canonico: $contractOutput"
    }
}
else {
    Check-WARN "Contrato canonico nao validado (venv ou script ausente)"
}

# == API Smoke ==================================================
Write-Host "`n-- API Smoke --" -ForegroundColor Cyan
$smokeScript = Join-Path "scripts" "smoke_dashboard_api.ps1"
if (Test-Path $smokeScript) {
    $smokeOutput = & powershell -ExecutionPolicy Bypass -File $smokeScript 2>&1
    if ($LASTEXITCODE -eq 0) {
        Check-OK "Smoke test da API publicada aprovado"
    }
    else {
        Check-WARN "Smoke test da API publicada falhou: $smokeOutput"
    }
}
else {
    Check-WARN "Script de smoke da API nao encontrado"
}

# -- Resumo ------------------------------------------------
Write-Host "`n==================================================" -ForegroundColor Cyan
$color = if ($fail -gt 0) { "Red" } elseif ($warn -gt 0) { "Yellow" } else { "Green" }
Write-Host "  Resultado: $ok OK, $warn WARN, $fail FAIL" -ForegroundColor $color
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
