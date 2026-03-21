param(
  [string]$Repo = "farias-debug/RoutingPetLove",
  [string]$Milestone
)

$ErrorActionPreference = "Stop"

function Write-Section {
  param([string]$Title)
  Write-Host ""
  Write-Host "=== $Title ===" -ForegroundColor Cyan
}

Write-Section "Autenticacao"
gh auth status

Write-Section "Issues Criticas"
gh issue list --repo $Repo --label "priority: critical" --state open

Write-Section "Issues Alta Prioridade"
gh issue list --repo $Repo --label "priority: high" --state open

Write-Section "Bloqueios"
gh issue list --repo $Repo --label "status: blocked" --state open

if ($Milestone) {
  Write-Section "Milestone: $Milestone"
  gh issue list --repo $Repo --milestone $Milestone --state all
}
else {
  Write-Section "Milestones"
  gh api repos/$Repo/milestones --jq '.[] | "- \(.title): \(.closed_issues)/\(.open_issues + .closed_issues)"'
}

Write-Section "Pull Requests Abertas"
gh pr list --repo $Repo --state open

Write-Section "Workflows Recentes"
gh run list --repo $Repo --limit 10
