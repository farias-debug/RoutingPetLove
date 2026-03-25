<#
.SYNOPSIS
    Delegar issue do GitHub para o Codex CLI resolver automaticamente.
.DESCRIPTION
    Lê uma issue do GitHub, extrai contexto, e invoca o Codex CLI em modo full-auto
    para resolver a tarefa. Cria branch, aplica mudanças, e pode abrir PR.
.PARAMETER IssueNumber
    Número da issue no GitHub
.PARAMETER AutoPR
    Se $true, cria PR automaticamente após resolver (default: $false)
.PARAMETER DryRun
    Se $true, apenas mostra o prompt sem executar (default: $false)
.EXAMPLE
    .\codex_resolve_issue.ps1 -IssueNumber 42
    .\codex_resolve_issue.ps1 -IssueNumber 42 -AutoPR
    .\codex_resolve_issue.ps1 -IssueNumber 42 -DryRun
#>
param(
  [Parameter(Mandatory = $true)]
  [int]$IssueNumber,
  [switch]$AutoPR,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$WorkspaceRoot = Split-Path -Parent $PSScriptRoot

# Validar ferramentas
foreach ($cmd in @("codex", "gh", "git")) {
  if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
    Write-Host "❌ $cmd não encontrado" -ForegroundColor Red
    exit 1
  }
}

# Ler issue do GitHub
Write-Host "📋 Lendo issue #$IssueNumber..." -ForegroundColor Cyan
$issueJson = gh issue view $IssueNumber --json title, body, labels, milestone, assignees 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host "❌ Falha ao ler issue #$IssueNumber" -ForegroundColor Red
  exit 1
}

$issue = $issueJson | ConvertFrom-Json
$title = $issue.title
$body = $issue.body
$labels = ($issue.labels | ForEach-Object { $_.name }) -join ", "

Write-Host "   Título: $title" -ForegroundColor White
Write-Host "   Labels: $labels" -ForegroundColor DarkGray

# Determinar tipo de branch
$branchType = "feat"
if ($labels -match "bug") { $branchType = "fix" }
elseif ($labels -match "chore") { $branchType = "chore" }
elseif ($labels -match "docs") { $branchType = "docs" }

$safeName = ($title -replace '[^a-zA-Z0-9\s]', '' -replace '\s+', '-').ToLower().Substring(0, [Math]::Min(50, $title.Length))
$branchName = "$branchType/issue-$IssueNumber-$safeName"

# Construir prompt
$prompt = @"
Resolva a issue #$IssueNumber do projeto Monitoramento Logístico Petlove.

## Issue
**Título**: $title
**Labels**: $labels

## Descrição
$body

## Instruções
1. Leia o CODEX.md na raiz para entender o projeto.
2. Identifique os arquivos relevantes baseado nos labels ($labels).
3. Implemente a solução seguindo as convenções do projeto.
4. Valide a mudança (lint, build se aplicável).
5. Faça commits atômicos referenciando a issue com "Closes #$IssueNumber".
"@

if ($DryRun) {
  Write-Host "`n📝 Prompt (dry-run):" -ForegroundColor Yellow
  Write-Host $prompt
  Write-Host "`n🌿 Branch: $branchName" -ForegroundColor Green
  exit 0
}

# Criar branch
Push-Location $WorkspaceRoot
try {
  Write-Host "🌿 Criando branch: $branchName" -ForegroundColor Green
  git checkout -b $branchName 2>&1 | Out-Null

  # Executar Codex
  Write-Host "🤖 Executando Codex..." -ForegroundColor Cyan
  codex --full-auto -p petlove -C $WorkspaceRoot $prompt

  if ($AutoPR) {
    Write-Host "📮 Criando PR..." -ForegroundColor Cyan
    git push origin $branchName 2>&1
    gh pr create --title "$title" --body "Closes #$IssueNumber`n`nResolvido via Codex CLI." --label $labels.Split(",")[0].Trim()
  }
}
finally {
  Pop-Location
}

Write-Host "✅ Concluído" -ForegroundColor Green
