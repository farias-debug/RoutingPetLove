<#
.SYNOPSIS
    Standup diário com Codex CLI — analisa issues, PRs e propõe próximas ações.
.DESCRIPTION
    Usa o Codex CLI em modo exec para gerar um relatório de standup inteligente,
    combinando dados do GitHub com análise contextual do projeto.
.EXAMPLE
    .\codex_standup.ps1
#>

$ErrorActionPreference = "Stop"
$WorkspaceRoot = Split-Path -Parent $PSScriptRoot
$Today = Get-Date -Format "yyyy-MM-dd"

foreach ($cmd in @("codex", "gh", "git")) {
  if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
    Write-Host "❌ $cmd não encontrado" -ForegroundColor Red; exit 1
  }
}

Write-Host "📊 Codex Standup — $Today" -ForegroundColor Cyan
Write-Host ""

# Coletar dados do GitHub
Write-Host "🔍 Coletando dados GitHub..." -ForegroundColor DarkGray
$closedIssues = gh issue list --state closed --limit 10 --json number, title, closedAt, labels 2>$null | ConvertFrom-Json
$openCritical = gh issue list --state open --label "priority:critical" --json number, title, labels 2>$null | ConvertFrom-Json
$openHigh = gh issue list --state open --label "priority:high" --json number, title, labels 2>$null | ConvertFrom-Json
$blocked = gh issue list --state open --label "status:blocked" --json number, title, labels 2>$null | ConvertFrom-Json
$gitStatus = git -C $WorkspaceRoot status --short 2>$null

# Feitas ontem
$fechadasHoje = $closedIssues | Where-Object {
  $_.closedAt -and ([datetime]$_.closedAt).Date -ge (Get-Date).AddDays(-1).Date
}

# Prompt para Codex
$contextData = @"
### Issues Fechadas (últimas 24h)
$($fechadasHoje | ForEach-Object { "- #$($_.number): $($_.title)" } | Out-String)

### Issues Críticas Abertas
$($openCritical | ForEach-Object { "- #$($_.number): $($_.title)" } | Out-String)

### Issues Alta Prioridade Abertas
$($openHigh | Select-Object -First 5 | ForEach-Object { "- #$($_.number): $($_.title)" } | Out-String)

### Issues Bloqueadas
$($blocked | ForEach-Object { "- #$($_.number): $($_.title)" } | Out-String)

### Git Status
$gitStatus
"@

$prompt = @"
Você é o Project Manager do projeto Monitoramento Logístico Petlove (última milha).
Data: $Today

Com base nos dados abaixo, gere um standup diário no formato:

✅ **O QUE FOI FEITO** (issues fechadas nas últimas 24h)
🔴 **O QUE FAZER HOJE** (crítico e alta prioridade — max 3 itens)
🚫 **BLOQUEIOS** (issues com status:blocked)
📊 **RECOMENDAÇÃO** (1 ação concreta prioritária para hoje)

Seja objetivo, use contexto do projeto (BigQuery v7, API Cloud Run, React Dashboard, GitHub Actions).

$contextData
"@

Write-Host "🤖 Gerando análise com Codex..." -ForegroundColor Cyan
codex exec -p petlove -C $WorkspaceRoot $prompt
