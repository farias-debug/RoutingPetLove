<#
.SYNOPSIS
    Wrapper para invocar Codex CLI com profile Petlove no workspace correto.
.DESCRIPTION
    Executa o OpenAI Codex CLI com o profile petlove, apontando para o workspace
    do projeto Monitoramento Logístico. Suporta modos: interativo, full-auto, exec, review.
.PARAMETER Mode
    Modo de execução: interactive, full-auto, exec, review (default: interactive)
.PARAMETER Prompt
    Prompt para o Codex (obrigatório para full-auto e exec)
.PARAMETER Model
    Modelo a usar (default: config.toml)
.EXAMPLE
    .\codex_run.ps1
    .\codex_run.ps1 -Mode full-auto -Prompt "Corrigir o endpoint /api/metas"
    .\codex_run.ps1 -Mode exec -Prompt "Listar todos os endpoints da API"
    .\codex_run.ps1 -Mode review
#>
param(
  [ValidateSet("interactive", "full-auto", "exec", "review")]
  [string]$Mode = "interactive",
  [string]$Prompt = "",
  [string]$Model = ""
)

$ErrorActionPreference = "Stop"
$WorkspaceRoot = Split-Path -Parent $PSScriptRoot

# Validações
if (-not (Get-Command codex -ErrorAction SilentlyContinue)) {
  Write-Host "❌ Codex CLI não encontrado. Instale com: npm install -g @openai/codex" -ForegroundColor Red
  exit 1
}

if ($Mode -in @("full-auto", "exec") -and -not $Prompt) {
  Write-Host "❌ Prompt obrigatório para modo $Mode" -ForegroundColor Red
  exit 1
}

Write-Host "🤖 Codex CLI — Monitoramento Logístico Petlove" -ForegroundColor Cyan
Write-Host "   Modo: $Mode | Workspace: $WorkspaceRoot" -ForegroundColor DarkGray

$baseArgs = @("-p", "petlove", "-C", $WorkspaceRoot)

if ($Model) {
  $baseArgs += @("-m", $Model)
}

switch ($Mode) {
  "interactive" {
    if ($Prompt) {
      & codex @baseArgs $Prompt
    }
    else {
      & codex @baseArgs
    }
  }
  "full-auto" {
    & codex --full-auto @baseArgs $Prompt
  }
  "exec" {
    & codex exec @baseArgs $Prompt
  }
  "review" {
    & codex review -p review -C $WorkspaceRoot
  }
}

$exitCode = $LASTEXITCODE
if ($exitCode -ne 0) {
  Write-Host "⚠️  Codex saiu com código $exitCode" -ForegroundColor Yellow
}

exit $exitCode
