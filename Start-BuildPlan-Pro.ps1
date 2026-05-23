$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot
$Port = 4177
$Url = "http://127.0.0.1:$Port/"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js was not found. Please install Node.js first." -ForegroundColor Red
  Read-Host "Press Enter to close"
  exit 1
}

Write-Host "Starting BuildPlan Pro..." -ForegroundColor Cyan
Write-Host "URL: $Url" -ForegroundColor Green
Start-Process $Url
node .\tools\serve-local.js --port $Port
