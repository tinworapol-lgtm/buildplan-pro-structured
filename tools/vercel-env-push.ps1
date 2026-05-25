param(
  [string]$EnvFile = ".env.production.local",
  [switch]$Apply
)

$ErrorActionPreference = "Stop"

$required = @(
  "APP_BASE_URL",
  "BETA_ADMIN_TOKEN",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_199_MONTHLY",
  "STRIPE_PRICE_199_YEARLY",
  "STRIPE_PRICE_599_MONTHLY",
  "STRIPE_PRICE_599_YEARLY"
)

function Read-EnvFile {
  param([string]$Path)
  $values = @{}
  if (!(Test-Path -LiteralPath $Path)) {
    throw "Env file not found: $Path. Copy .env.production.example to .env.production.local first."
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
$missing = @()
foreach ($name in $required) {
  if (!$values.ContainsKey($name) -or [string]::IsNullOrWhiteSpace([string]$values[$name])) {
    $missing += $name
  }
}

Write-Host "BuildPlan Pro Vercel Env Push"
Write-Host "Env file: $EnvFile"
foreach ($name in $required) {
  $preview = if ($values.ContainsKey($name)) { Redact ([string]$values[$name]) } else { "" }
  $state = if ($preview) { "set $preview" } else { "missing" }
  Write-Host "- ${name}: $state"
}

if ($missing.Count -gt 0) {
  Write-Error ("Missing required env values: " + ($missing -join ", "))
}

if (!$Apply) {
  Write-Host ""
  Write-Host "Dry run only. To push values to Vercel production, run:"
  Write-Host "powershell -ExecutionPolicy Bypass -File tools\vercel-env-push.ps1 -Apply"
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

foreach ($name in $required) {
  Write-Host "Adding $name to Vercel production..."
  [string]$value = $values[$name]
  $value | & $vercelPath env add $name production
}

Write-Host "Done. Next: vercel --prod, then npm run saas:doctor"
