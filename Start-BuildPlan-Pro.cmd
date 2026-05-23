@echo off
setlocal
cd /d "%~dp0"
set PORT=4177
set URL=http://127.0.0.1:%PORT%/

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Please install Node.js first.
  pause
  exit /b 1
)

echo Starting BuildPlan Pro...
echo URL: %URL%
start "" "%URL%"
node tools\serve-local.js --port %PORT%
pause
