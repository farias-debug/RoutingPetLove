<#
.SYNOPSIS
  Commit + push automático com mensagem padronizada.
.DESCRIPTION
  Detecta alterações, faz commit categorizado e push para o GitHub.
  Pode ser chamado diretamente ou pelo daily_pipeline.ps1.
.PARAMETER AutoMessage
  Mensagem de commit automática. Se omitida, gera com base nos arquivos.
#>
param(
  [string]$AutoMessage = ""
)

$ErrorActionPreference = "Stop"
Set-Location -Path (Split-Path $PSScriptRoot -Parent)

# ── Verificar se há alterações ──────────────────────────────
$status = git status --porcelain 2>&1
if (-not $status -or $status.Count -eq 0) {
  Write-Host "[Git] Nenhuma alteracao pendente." -ForegroundColor DarkYellow
  exit 0
}

$changedCount = ($status | Measure-Object).Count
Write-Host "[Git] $changedCount arquivo(s) alterado(s)." -ForegroundColor Yellow

# ── Categorizar alterações ──────────────────────────────────
$dataChanges = $status | Where-Object { $_ -match "Dashboard/data/" -or $_ -match "Dashboard/output/" }
$codeChanges = $status | Where-Object { $_ -match "\.(py|ps1|mjs|json|md)$" -and $_ -notmatch "/data/" -and $_ -notmatch "/output/" }
$configChanges = $status | Where-Object { $_ -match "\.vscode/" -or $_ -match "scripts/" -or $_ -match "Dashboard/config/" -or $_ -match "\.gitignore" }

# ── Gerar mensagem de commit ────────────────────────────────
$dateTag = Get-Date -Format "yyyy-MM-dd"

if ($AutoMessage) {
  $commitMsg = $AutoMessage
}
else {
  $parts = @()
  if ($dataChanges) { $parts += "data" }
  if ($codeChanges) { $parts += "code" }
  if ($configChanges) { $parts += "config" }
  $scope = if ($parts.Count -gt 0) { $parts -join "+" } else { "update" }
  $commitMsg = "${scope}: atualizacao $dateTag"
}

# ── Stage, commit, push ────────────────────────────────────
Write-Host "[Git] Staging all changes..." -ForegroundColor Cyan
git add -A

Write-Host "[Git] Commit: $commitMsg" -ForegroundColor Cyan
git commit -m $commitMsg

Write-Host "[Git] Pulling latest (rebase)..." -ForegroundColor Cyan
git pull --rebase --no-edit 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host "[Git] ERRO: pull --rebase falhou com codigo $LASTEXITCODE" -ForegroundColor Red
  exit $LASTEXITCODE
}

Write-Host "[Git] Pushing to origin..." -ForegroundColor Cyan
git push
if ($LASTEXITCODE -ne 0) {
  Write-Host "[Git] ERRO: push falhou com codigo $LASTEXITCODE" -ForegroundColor Red
  exit $LASTEXITCODE
}

Write-Host "[Git] Sync completo." -ForegroundColor Green
