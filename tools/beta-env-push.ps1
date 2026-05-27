param(
  [string]$EnvFile = ".env.production.local",
  [switch]$Apply
)

$ErrorActionPreference = "Stop"

$required = @(
  "APP_BASE_URL",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "BETA_ADMIN_TOKEN"
)

$optional = @(
  "BETA_TRIAL_DAYS",
  "BETA_PROJECT_LIMIT",
  "BETA_PROJECT_PAYLOAD_BYTES"
)

function Read-EnvFile {
  param([string]$Path)
  $values = @{}
  if (!(Test-Path -LiteralPath $Path)) {
    throw "Env file not found: $Path. Run npm run beta:env:init -- --write first."
  }
  foreach ($line in Get-Content -LiteralPath $Path) {
    $trimmed = $line.Trim()
    if (!$trimmed -or $trimmed.StartsWith("#")) { continue }
    $index = $trimmed.IndexOf("=")
    if ($index -lt 1) { continue }
    $key = $trimmed.Substring(0, $index).Trim()
    $value = $trimmed.Substring($index + 1).Trim()
    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    $values[$key] = $value
  }
  return $values
}

function Redact {
  param([string]$Value)
  if (!$Value) { return "" }
  if ($Value.Length -le 8) { return "***" }
  return $Value.Substring(0, 4) + "..." + $Value.Substring($Value.Length - 4)
}

$values = Read-EnvFile -Path $EnvFile
$names = @()
$names += $required
foreach ($name in $optional) {
  if ($values.ContainsKey($name) -and ![string]::IsNullOrWhiteSpace([string]$values[$name])) {
    $names += $name
  }
}

$missing = @()
foreach ($name in $required) {
  if (!$values.ContainsKey($name) -or [string]::IsNullOrWhiteSpace([string]$values[$name])) {
    $missing += $name
  }
}

Write-Host "BuildPlan Pro Public Beta Vercel Env Push"
Write-Host "Env file: $EnvFile"
foreach ($name in $names) {
  $preview = if ($values.ContainsKey($name)) { Redact ([string]$values[$name]) } else { "" }
  $state = if ($preview) { "set $preview" } else { "missing" }
  Write-Host "- ${name}: $state"
}

if ($missing.Count -gt 0) {
  Write-Error ("Missing required beta env values: " + ($missing -join ", "))
}

if (!$Apply) {
  Write-Host ""
  Write-Host "Dry run only. To push beta values to Vercel production, run:"
  Write-Host "powershell -ExecutionPolicy Bypass -File tools\beta-env-push.ps1 -Apply"
  Write-Host ""
  Write-Host "Stripe env is intentionally not required for Public Beta."
  exit 0
}

$vercel = Get-Command vercel -ErrorAction SilentlyContinue
if (!$vercel) {
  $npmVercel = Join-Path $env:APPDATA "npm\vercel.cmd"
  if (Test-Path -LiteralPath $npmVercel) {
    $vercelPath = $npmVercel
  } else {
    throw "Vercel CLI not found. Install it with npm install -g vercel, then login with vercel login."
  }
} else {
  $vercelPath = $vercel.Source
}

foreach ($name in $names) {
  Write-Host "Adding $name to Vercel production..."
  [string]$value = $values[$name]
  $value | & $vercelPath env add $name production
}

Write-Host "Done. Next: deploy production, then run npm run beta:doctor."
