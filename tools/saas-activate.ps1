param(
  [string]$EnvFile = ".env.production.local",
  [switch]$ApplyEnv,
  [switch]$Deploy,
  [switch]$SkipDoctor
)

$ErrorActionPreference = "Stop"

function Invoke-Step {
  param(
    [string]$Name,
    [scriptblock]$Block
  )
  Write-Host ""
  Write-Host "== $Name ==" -ForegroundColor Cyan
  & $Block
}

Write-Host "BuildPlan Pro SaaS Activation Wizard"
Write-Host "Env file: $EnvFile"
Write-Host "Apply env: $ApplyEnv"
Write-Host "Deploy: $Deploy"

$envReady = $false

Invoke-Step "1. Validate local env file" {
  node tools\vercel-env-plan.js --file=$EnvFile
  if ($LASTEXITCODE -eq 0) {
    $script:envReady = $true
  } else {
    Write-Host "Env validation is not ready yet. Fix .env.production.local before pushing values." -ForegroundColor Yellow
  }
}

Invoke-Step "2. Vercel env push" {
  if (!$script:envReady) {
    Write-Host "Skipped because env validation did not pass."
    return
  }
  if ($ApplyEnv) {
    powershell -ExecutionPolicy Bypass -File tools\vercel-env-push.ps1 -EnvFile $EnvFile -Apply
  } else {
    powershell -ExecutionPolicy Bypass -File tools\vercel-env-push.ps1 -EnvFile $EnvFile
    Write-Host "Dry run complete. Add -ApplyEnv to push values to Vercel production."
  }
}

Invoke-Step "3. Production deploy" {
  if (!$script:envReady) {
    Write-Host "Skipped because env validation did not pass."
    return
  }
  if ($Deploy) {
    $vercel = Get-Command vercel -ErrorAction SilentlyContinue
    if (!$vercel) {
      $npmVercel = Join-Path $env:APPDATA "npm\vercel.cmd"
      if (Test-Path -LiteralPath $npmVercel) {
        & $npmVercel --yes --prod --archive tgz
      } else {
        throw "Vercel CLI not found. Install it with npm install -g vercel."
      }
    } else {
      & $vercel.Source --yes --prod --archive tgz
    }
  } else {
    Write-Host "Skipped. Add -Deploy after env values are pushed."
  }
}

Invoke-Step "4. SaaS doctor" {
  if ($SkipDoctor) {
    Write-Host "Skipped by -SkipDoctor."
  } else {
    node tools\saas-launch-doctor.js
  }
}

Write-Host ""
Write-Host "Wizard finished."
