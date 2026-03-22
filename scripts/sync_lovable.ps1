<#
.SYNOPSIS
    Sync bidirecional RoutingPetLove (Dashboard/frontend) <-> git-connect (Lovable)
.PARAMETER Mode
    push / pull / status / init
.PARAMETER Message
    Mensagem de commit (push/init)
.PARAMETER Force
    Sem confirmacao interativa
#>
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("push", "pull", "status", "init")]
  [string]$Mode,
  [string]$Message = "",
  [switch]$Force
)

$ErrorActionPreference = "Continue"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$FrontendDir = Join-Path $ProjectRoot "Dashboard\frontend"
$LovableRemote = "lovable"
$LovableBranch = "main"
$LovableUrl = "https://github.com/farias-debug/git-connect.git"
$TempSyncDir = Join-Path $env:TEMP ("lovable-sync-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
$SyncLogFile = Join-Path $ProjectRoot "Dashboard\docs\lovable-sync.log"

$LovableOnlyFiles = @("lovable-context.md", "README.md")
$LocalOnlyFiles = @(".env", ".env.example", ".env.production", ".env.staging", "dist", "node_modules")

function Write-Step { param([string]$T) Write-Host ("`n> " + $T) -ForegroundColor Cyan }
function Write-Ok { param([string]$T) Write-Host ("  OK: " + $T) -ForegroundColor Green }
function Write-Warn { param([string]$T) Write-Host ("  WARN: " + $T) -ForegroundColor Yellow }

function Log-Sync {
  param([string]$Action, [string]$Detail)
  $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  $entry = "[$ts] $Action - $Detail"
  $dir = Split-Path $SyncLogFile
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  Add-Content -Path $SyncLogFile -Value $entry
}

function Ensure-Remote {
  Push-Location $ProjectRoot
  try {
    $remotes = git remote 2>&1
    if ($remotes -notcontains $LovableRemote) {
      Write-Step "Adicionando remote lovable..."
      git remote add $LovableRemote $LovableUrl 2>&1 | Out-Null
    }
    Write-Step "Fetch lovable..."
    git fetch $LovableRemote 2>&1 | Out-Null
    Write-Ok "Fetch completo"
  }
  finally { Pop-Location }
}

function Get-FileHashes {
  param([string]$Dir)
  $result = @{}
  $resolvedDir = (Get-Item $Dir).FullName.TrimEnd("\")
  Get-ChildItem $resolvedDir -Recurse -File | Where-Object {
    $rel = $_.FullName.Substring($resolvedDir.Length + 1).Replace("\", "/")
    $skip = $false
    if ($rel.StartsWith(".git/") -or $rel -eq ".git") { $skip = $true }
    foreach ($ex in $LocalOnlyFiles) {
      if ($rel -eq $ex -or $rel.StartsWith($ex + "/")) { $skip = $true; break }
    }
    -not $skip
  } | ForEach-Object {
    $rel = $_.FullName.Substring($resolvedDir.Length + 1).Replace("\", "/")
    $result[$rel] = (Get-FileHash $_.FullName -Algorithm SHA256).Hash
  }
  return $result
}

# ---- STATUS ----
function Invoke-Status {
  Write-Step "Comparando Dashboard/frontend <-> lovable/main..."
  Ensure-Remote
  Push-Location $ProjectRoot
  try {
    if (Test-Path $TempSyncDir) { Remove-Item $TempSyncDir -Recurse -Force }
    git clone --depth 1 $LovableUrl $TempSyncDir 2>&1 | Out-Null

    $localH = Get-FileHashes $FrontendDir
    $lovH = Get-FileHashes $TempSyncDir

    $onlyLocal = @(); $onlyLov = @(); $modified = @()

    foreach ($f in $localH.Keys) {
      if ($LovableOnlyFiles -contains $f) { continue }
      if ($lovH.ContainsKey($f)) {
        if ($localH[$f] -ne $lovH[$f]) { $modified += $f }
      }
      else { $onlyLocal += $f }
    }
    foreach ($f in $lovH.Keys) {
      if ($LovableOnlyFiles -contains $f) { continue }
      if (-not $localH.ContainsKey($f)) { $onlyLov += $f }
    }

    Write-Host "`n=== Status de Sincronizacao ===" -ForegroundColor Magenta
    if ($modified.Count -eq 0 -and $onlyLocal.Count -eq 0 -and $onlyLov.Count -eq 0) {
      Write-Ok "Repositorios sincronizados!"
    }
    else {
      if ($modified.Count -gt 0) {
        Write-Host ("`n  Modificados (" + $modified.Count + "):") -ForegroundColor Yellow
        $modified | ForEach-Object { Write-Host "    M $_" -ForegroundColor Yellow }
      }
      if ($onlyLocal.Count -gt 0) {
        Write-Host ("`n  Apenas local (" + $onlyLocal.Count + "):") -ForegroundColor Green
        $onlyLocal | ForEach-Object { Write-Host "    + $_" -ForegroundColor Green }
      }
      if ($onlyLov.Count -gt 0) {
        Write-Host ("`n  Apenas Lovable (" + $onlyLov.Count + "):") -ForegroundColor Cyan
        $onlyLov | ForEach-Object { Write-Host "    < $_" -ForegroundColor Cyan }
      }
    }
    Remove-Item $TempSyncDir -Recurse -Force -ErrorAction SilentlyContinue
  }
  finally { Pop-Location }
}

# ---- PUSH ----
function Invoke-Push {
  Write-Step "Enviando alteracoes para o Lovable..."
  Ensure-Remote
  if (-not $Force) {
    $c = Read-Host "Enviar Dashboard/frontend para git-connect? (s/N)"
    if ($c -ne "s" -and $c -ne "S") { Write-Warn "Cancelado."; return }
  }

  Write-Step "Clonando git-connect..."
  if (Test-Path $TempSyncDir) { Remove-Item $TempSyncDir -Recurse -Force }
  git clone $LovableUrl $TempSyncDir 2>&1 | Out-Null
  Write-Ok "Clone completo"

  Write-Step "Sincronizando arquivos..."
  Get-ChildItem $TempSyncDir -Force | Where-Object {
    $_.Name -ne ".git" -and $_.Name -ne "lovable-context.md" -and $_.Name -ne "README.md"
  } | ForEach-Object {
    if ($_.PSIsContainer) { Remove-Item $_.FullName -Recurse -Force }
    else { Remove-Item $_.FullName -Force }
  }

  Get-ChildItem $FrontendDir -Force | Where-Object {
    $skip = $false
    foreach ($ex in $LocalOnlyFiles) { if ($_.Name -eq $ex) { $skip = $true; break } }
    if ($_.Name -eq "node_modules" -or $_.Name -eq "dist") { $skip = $true }
    -not $skip
  } | ForEach-Object {
    $dest = Join-Path $TempSyncDir $_.Name
    if ($_.PSIsContainer) { Copy-Item $_.FullName $dest -Recurse -Force }
    else { Copy-Item $_.FullName $dest -Force }
  }

  Push-Location $TempSyncDir
  try {
    git add -A 2>&1 | Out-Null
    $changes = git diff --cached --stat 2>&1
    if ([string]::IsNullOrWhiteSpace($changes)) { Write-Warn "Nenhuma alteracao."; return }

    if ($Message) { $commitMsg = $Message }
    else { $commitMsg = "sync: RoutingPetLove -> Lovable (" + (Get-Date -Format "yyyy-MM-dd HH:mm") + ")" }

    git commit -m $commitMsg 2>&1 | Out-Null
    Write-Step "Push para git-connect..."
    git push origin main 2>&1 | Out-Null
    Write-Ok "Push completo!"
    Write-Host "`n  Alteracoes:" -ForegroundColor Green
    Write-Host $changes
    Log-Sync "PUSH" $commitMsg
  }
  finally {
    Pop-Location
    Remove-Item $TempSyncDir -Recurse -Force -ErrorAction SilentlyContinue
  }
}

# ---- PULL ----
function Invoke-Pull {
  Write-Step "Baixando alteracoes do Lovable..."
  Ensure-Remote
  Push-Location $ProjectRoot
  try {
    if (Test-Path $TempSyncDir) { Remove-Item $TempSyncDir -Recurse -Force }
    git clone --depth 1 $LovableUrl $TempSyncDir 2>&1 | Out-Null

    $localH = Get-FileHashes $FrontendDir
    $lovH = Get-FileHashes $TempSyncDir

    $changed = @(); $newFiles = @()
    foreach ($f in $lovH.Keys) {
      if ($LovableOnlyFiles -contains $f) { continue }
      if ($localH.ContainsKey($f)) {
        if ($localH[$f] -ne $lovH[$f]) { $changed += $f }
      }
      else { $newFiles += $f }
    }

    if ($changed.Count -eq 0 -and $newFiles.Count -eq 0) {
      Write-Warn "Nenhuma alteracao nova do Lovable."
      return
    }

    Write-Host "`n  Alteracoes do Lovable:" -ForegroundColor Cyan
    $changed  | ForEach-Object { Write-Host "    M $_" -ForegroundColor Yellow }
    $newFiles | ForEach-Object { Write-Host "    + $_" -ForegroundColor Green }

    if (-not $Force) {
      $c = Read-Host "`nAplicar no Dashboard/frontend? (s/N)"
      if ($c -ne "s" -and $c -ne "S") { Write-Warn "Cancelado."; return }
    }

    Write-Step "Aplicando alteracoes..."
    $all = $changed + $newFiles
    foreach ($f in $all) {
      $src = Join-Path $TempSyncDir $f
      $dst = Join-Path $FrontendDir $f
      $dstDir = Split-Path $dst
      if (-not (Test-Path $dstDir)) { New-Item -ItemType Directory -Path $dstDir -Force | Out-Null }
      Copy-Item $src $dst -Force
    }
    Write-Ok ("Aplicadas " + $all.Count + " alteracoes!")

    git add "Dashboard/frontend/" 2>&1 | Out-Null
    $commitMsg = "sync: Lovable -> RoutingPetLove (" + $all.Count + " arquivos, " + (Get-Date -Format "yyyy-MM-dd HH:mm") + ")"
    git commit -m $commitMsg 2>&1 | Out-Null
    Write-Ok "Commit: $commitMsg"
    Log-Sync "PULL" ($all.Count.ToString() + " arquivos")

    Remove-Item $TempSyncDir -Recurse -Force -ErrorAction SilentlyContinue
  }
  finally { Pop-Location }
}

# ---- INIT ----
function Invoke-Init {
  Write-Host "`n=== Sincronizacao Inicial ===" -ForegroundColor Magenta
  Write-Host "  Envia estado completo de Dashboard/frontend para git-connect"
  if (-not $Force) {
    $c = Read-Host "Continuar? (s/N)"
    if ($c -ne "s" -and $c -ne "S") { Write-Warn "Cancelado."; return }
  }
  $script:Message = "sync(init): estado completo Dashboard/frontend -> Lovable"
  $script:Force = $true
  Invoke-Push
  Log-Sync "INIT" "Sincronizacao inicial completa"
  Write-Ok "Inicializacao completa!"
}

# ---- MAIN ----
Write-Host "`n[Lovable Sync] Modo: $Mode`n" -ForegroundColor Magenta

switch ($Mode) {
  "status" { Invoke-Status }
  "push" { Invoke-Push }
  "pull" { Invoke-Pull }
  "init" { Invoke-Init }
}

Write-Host ""

