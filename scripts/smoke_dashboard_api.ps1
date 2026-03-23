<#
.SYNOPSIS
  Smoke test da API canônica do dashboard.
.DESCRIPTION
  Valida endpoints críticos publicados, checando status HTTP e estrutura mínima do payload.
.PARAMETER BaseUrl
  URL base da API publicada.
#>

param(
  [string]$BaseUrl = "https://dashboard-logistico-api-745676656148.us-central1.run.app"
)

$ErrorActionPreference = "Stop"

function Write-Step($message) {
  Write-Host "`n== $message ==" -ForegroundColor Cyan
}

function Write-Pass($message) {
  Write-Host "  [OK]   $message" -ForegroundColor Green
}

function Write-Fail($message) {
  Write-Host "  [FAIL] $message" -ForegroundColor Red
}

function Assert-HasProperty($object, $propertyName, $context) {
  $property = $object.PSObject.Properties[$propertyName]
  if (-not $property) {
    throw "$context sem propriedade obrigatória '$propertyName'"
  }
}

function Invoke-SmokeJson($path, $expectedKind, $requiredProperties, [switch]$paginated) {
  $url = "$BaseUrl$path"
  $tmpFile = Join-Path ([System.IO.Path]::GetTempPath()) ([System.IO.Path]::GetRandomFileName())

  try {
    $statusCode = & curl.exe -sS -L -o $tmpFile -w "%{http_code}" $url
    if ($LASTEXITCODE -ne 0) {
      throw "curl falhou para $url"
    }

    if ($statusCode -ne "200") {
      $body = Get-Content -Raw $tmpFile
      throw "HTTP $statusCode em $url :: $body"
    }

    $raw = Get-Content -Raw $tmpFile
    $json = $raw | ConvertFrom-Json

    if ($paginated) {
      Assert-HasProperty $json "data" $path
      Assert-HasProperty $json "page" $path
      Assert-HasProperty $json "pages" $path
      $sample = @($json.data) | Select-Object -First 1
      if (-not $sample) {
        throw "$path retornou paginação vazia"
      }
      foreach ($property in $requiredProperties) {
        Assert-HasProperty $sample $property $path
      }
      Write-Pass "$path retornou payload paginado válido"
      return
    }

    if ($expectedKind -eq "array") {
      $items = @($json)
      if ($items.Count -eq 0) {
        throw "$path retornou array vazio"
      }
      $sample = $items[0]
      foreach ($property in $requiredProperties) {
        Assert-HasProperty $sample $property $path
      }
      Write-Pass "$path retornou array válido"
      return
    }

    foreach ($property in $requiredProperties) {
      Assert-HasProperty $json $property $path
    }
    Write-Pass "$path retornou objeto válido"
  }
  finally {
    if (Test-Path $tmpFile) {
      Remove-Item $tmpFile -Force -ErrorAction SilentlyContinue
    }
  }
}

Write-Host "Smoke test da API canônica" -ForegroundColor White
Write-Host "Base URL: $BaseUrl" -ForegroundColor DarkGray

Write-Step "Health"
$healthStatus = & curl.exe -sS -L -o NUL -w "%{http_code}" "$BaseUrl/health"
if ($LASTEXITCODE -ne 0 -or $healthStatus -ne "200") {
  Write-Fail "/health retornou $healthStatus"
  exit 1
}
Write-Pass "/health retornou 200"

Write-Step "Endpoints canônicos"
Invoke-SmokeJson "/api/metas" "array" @("kpiId", "kpiNome", "meta")
Invoke-SmokeJson "/api/filiais/performance?periodo=2026-03" "array" @("filial", "pedidosReal", "tempoPlan", "scoreOperacional")
Invoke-SmokeJson "/api/transportadores?periodo=2026-03" "array" @("transportador", "rotas", "custoMedioCarga", "scoreOperacional")
Invoke-SmokeJson "/api/alertas?limit=1" "object" @("rota", "prioridade", "flagNaoPlanejada") -paginated
Invoke-SmokeJson "/api/drill-rotas?limit=1" "object" @("rota", "scoreOperacional", "ocupacaoPeso") -paginated

Write-Host "`nSmoke test concluído com sucesso." -ForegroundColor Green
