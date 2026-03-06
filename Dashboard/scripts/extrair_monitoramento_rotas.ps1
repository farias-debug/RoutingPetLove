param(
    [int]$DaysAhead = 15,
    [switch]$Headed,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $PSCommandPath
$DashboardDir = Split-Path -Parent $ScriptDir
$NodeDir = Join-Path $env:LOCALAPPDATA "Programs\nodejs"
$ExtractorScript = Join-Path $DashboardDir "scripts\extrair_relatorio_tms.mjs"
$PackageJson = Join-Path $DashboardDir "package.json"
$PlaywrightModule = Join-Path $DashboardDir "node_modules\playwright"
$Destino = Join-Path $DashboardDir "data\Relatorio_Monitoramento_Carga"

if (Test-Path (Join-Path $NodeDir "node.exe")) {
    $env:Path = "$NodeDir;$env:Path"
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js nao encontrado no PATH. Instale ou ajuste o PATH para node.exe."
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw "npm nao encontrado no PATH. Verifique a instalacao do Node.js."
}

if (-not (Test-Path $PackageJson)) {
    throw "package.json nao encontrado em: $PackageJson"
}

if (-not (Test-Path $ExtractorScript)) {
    throw "Script extrator nao encontrado em: $ExtractorScript"
}

if (-not (Test-Path $PlaywrightModule)) {
    Write-Host "Dependencias nao encontradas. Executando npm install em $DashboardDir ..."
    Push-Location $DashboardDir
    try {
        & npm install
        if ($LASTEXITCODE -ne 0) {
            throw "Falha no npm install (exit code $LASTEXITCODE)."
        }
    }
    finally {
        Pop-Location
    }
}

if (-not $env:TMS_USER) {
    $env:TMS_USER = [Environment]::GetEnvironmentVariable("TMS_USER", "User")
}
if (-not $env:TMS_PASS) {
    $env:TMS_PASS = [Environment]::GetEnvironmentVariable("TMS_PASS", "User")
}
if (-not $env:TMS_USER -or -not $env:TMS_PASS) {
    throw "Credenciais ausentes. Defina TMS_USER e TMS_PASS."
}

New-Item -ItemType Directory -Path $Destino -Force | Out-Null

$nodeArgs = @(
    $ExtractorScript,
    "--days-ahead", $DaysAhead,
    "--dest-dir", $Destino
)

if ($Headed) { $nodeArgs += "--headed" }
if ($DryRun) { $nodeArgs += "--dry-run" }

Write-Host "Executando extracao do Monitoramento de Rotas..."
Write-Host "Destino: $Destino"
Write-Host "Periodo: hoje ate hoje+$DaysAhead dias"

Push-Location $DashboardDir
try {
    & node @nodeArgs
    if ($LASTEXITCODE -ne 0) {
        throw "Falha na extracao (exit code $LASTEXITCODE)."
    }
}
finally {
    Pop-Location
}

Write-Host "Extracao finalizada."
