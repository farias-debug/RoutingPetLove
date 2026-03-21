param(
  [string]$Owner = "farias-debug",
  [string]$Repo = "RoutingPetLove",
  [switch]$ConfigureBranchProtection
)

$ErrorActionPreference = "Stop"
$repoRef = "$Owner/$Repo"

function Assert-GhAuth {
  gh auth status | Out-Null
}

function Set-ProjectLabel {
  param(
    [string]$Name,
    [string]$Color,
    [string]$Description
  )

  $exists = gh label list --repo $repoRef --limit 200 --search $Name --json name --jq '.[].name'
  if ($exists) {
    gh label edit $Name --repo $repoRef --color $Color --description $Description | Out-Null
    Write-Host "Label atualizada: $Name"
    return
  }

  gh label create $Name --repo $repoRef --color $Color --description $Description | Out-Null
  Write-Host "Label criada: $Name"
}

function Set-ProjectMilestone {
  param(
    [string]$Title,
    [string]$Description,
    [string]$DueOn
  )

  $exists = gh api repos/$repoRef/milestones --jq ".[] | select(.title == \"$Title\") | .title"
  if ($exists) {
    Write-Host "Milestone existente: $Title"
    return
  }

  gh api repos/$repoRef/milestones --field "title=$Title" --field "description=$Description" --field "due_on=$DueOn" | Out-Null
  Write-Host "Milestone criada: $Title"
}

Assert-GhAuth

$labels = @(
  @{ Name = "type: feature"; Color = "0E8A16"; Description = "Nova funcionalidade" },
  @{ Name = "type: bug"; Color = "D73A4A"; Description = "Correcao de erro" },
  @{ Name = "type: chore"; Color = "FEF2C0"; Description = "Manutencao, refactoring, config" },
  @{ Name = "type: docs"; Color = "0075CA"; Description = "Documentacao" },
  @{ Name = "type: ci/cd"; Color = "E4E669"; Description = "Automacao, pipelines e deploy" },
  @{ Name = "domain: bigquery"; Color = "1D76DB"; Description = "Pipeline BigQuery v4/v5/v6" },
  @{ Name = "domain: frontend"; Color = "7057FF"; Description = "React dashboard" },
  @{ Name = "domain: apps-script"; Color = "FBCA04"; Description = "Google Apps Script" },
  @{ Name = "domain: api"; Color = "B60205"; Description = "API Cloud Run" },
  @{ Name = "domain: extraction"; Color = "D4C5F9"; Description = "Extracao TMS e CSV" },
  @{ Name = "domain: infra"; Color = "C5DEF5"; Description = "Infraestrutura, scripts e setup" },
  @{ Name = "priority: critical"; Color = "B60205"; Description = "Bloqueante" },
  @{ Name = "priority: high"; Color = "FF9F1C"; Description = "Alta prioridade" },
  @{ Name = "priority: medium"; Color = "FBCA04"; Description = "Prioridade normal" },
  @{ Name = "priority: low"; Color = "0E8A16"; Description = "Nice to have" },
  @{ Name = "status: blocked"; Color = "D93F0B"; Description = "Aguardando dependencia" },
  @{ Name = "status: in-progress"; Color = "0E8A16"; Description = "Em andamento" },
  @{ Name = "status: needs-review"; Color = "FBCA04"; Description = "Precisa de review" }
)

foreach ($label in $labels) {
  Set-ProjectLabel -Name $label.Name -Color $label.Color -Description $label.Description
}

$milestones = @(
  @{ Title = "Sprint 1 - Fundacao"; Description = "Setup repo, CI/CD, templates, documentacao base"; DueOn = "2026-04-04T00:00:00Z" },
  @{ Title = "Sprint 2 - Pipeline Estavel"; Description = "Pipeline BigQuery validado, extracao TMS e sync Sheets"; DueOn = "2026-04-18T00:00:00Z" },
  @{ Title = "Sprint 3 - Frontend MVP"; Description = "React dashboard funcional com dados reais"; DueOn = "2026-05-02T00:00:00Z" },
  @{ Title = "Sprint 4 - Producao"; Description = "Deploy, monitoramento e alertas"; DueOn = "2026-05-16T00:00:00Z" }
)

foreach ($milestone in $milestones) {
  Set-ProjectMilestone -Title $milestone.Title -Description $milestone.Description -DueOn $milestone.DueOn
}

if ($ConfigureBranchProtection) {
  $body = @{
    required_status_checks        = @{
      strict   = $true
      contexts = @("Validate SQL")
    }
    enforce_admins                = $true
    required_pull_request_reviews = @{
      required_approving_review_count = 1
      dismiss_stale_reviews           = $true
      require_code_owner_reviews      = $false
    }
    restrictions                  = $null
    allow_force_pushes            = $false
    allow_deletions               = $false
    required_linear_history       = $true
  } | ConvertTo-Json -Depth 6

  $tempFile = [System.IO.Path]::GetTempFileName()
  try {
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($tempFile, $body, $utf8NoBom)
    gh api repos/$repoRef/branches/main/protection --method PUT --input $tempFile | Out-Null
  }
  finally {
    Remove-Item -Path $tempFile -ErrorAction SilentlyContinue
  }

  Write-Host "Branch protection configurada para main"
}

Write-Host "Bootstrap do repositório concluído para $repoRef" -ForegroundColor Green
