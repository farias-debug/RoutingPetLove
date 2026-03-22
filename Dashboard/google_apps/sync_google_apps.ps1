param(
    [ValidateSet("Status", "Push", "Pull", "Open", "Login")]
    [string]$Action = "Status"
)

$ErrorActionPreference = "Stop"

$dashboardRoot = Split-Path $PSScriptRoot -Parent
$googleAppsDir = Join-Path $dashboardRoot "google_apps"

if (-not (Test-Path $googleAppsDir)) {
    throw "Diretorio google_apps nao encontrado: $googleAppsDir"
}

$scriptMap = @{
    "Status" = "clasp:status"
    "Push" = "clasp:push"
    "Pull" = "clasp:pull"
    "Open" = "clasp:open"
    "Login" = "clasp:login"
}

Push-Location $googleAppsDir
try {
    & npm run $scriptMap[$Action]
    exit $LASTEXITCODE
}
finally {
    Pop-Location
}
