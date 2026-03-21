param(
    [string]$Repo = "farias-debug/RoutingPetLove"
)

$ErrorActionPreference = "Stop"
$today = Get-Date -Format "yyyy-MM-dd"

Write-Host ""
Write-Host "Standup - $today" -ForegroundColor Cyan
Write-Host ""

Write-Host "FEITO" -ForegroundColor Green
gh issue list --repo $Repo --state closed --limit 100 --json number,title,closedAt --jq '.[] | select(.closedAt != null) | "#\(.number) \(.title) | fechado em \(.closedAt)"'

Write-Host ""
Write-Host "HOJE" -ForegroundColor Yellow
gh issue list --repo $Repo --state open --label "priority: critical" --limit 20
gh issue list --repo $Repo --state open --label "priority: high" --limit 20

Write-Host ""
Write-Host "BLOQUEIOS" -ForegroundColor Red
gh issue list --repo $Repo --state open --label "status: blocked" --limit 20

Write-Host ""
Write-Host "SPRINTS" -ForegroundColor Cyan
gh api repos/$Repo/milestones --jq '.[] | "- \(.title): \(.closed_issues)/\(.open_issues + .closed_issues)"'
