# UAT Tool - One-command startup script (Windows PowerShell)
# Usage: .\start.ps1

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  UAT Data Comparison Tool - Startup" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ── Prerequisites check ──────────────────────────────────────────────────────

Write-Host "Checking prerequisites..." -ForegroundColor Yellow

# Python
try {
    $pyVersion = python --version 2>&1
    Write-Host "  [OK] $pyVersion" -ForegroundColor Green
} catch {
    Write-Host "  [FAIL] Python not found. Install Python 3.10+ from https://python.org" -ForegroundColor Red
    exit 1
}

# Node.js
try {
    $nodeVersion = node --version 2>&1
    Write-Host "  [OK] Node.js $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  [FAIL] Node.js not found. Install Node.js 18+ from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# npm
try {
    $npmVersion = npm --version 2>&1
    Write-Host "  [OK] npm $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "  [FAIL] npm not found. It should come with Node.js." -ForegroundColor Red
    exit 1
}

Write-Host ""

# ── Backend setup ─────────────────────────────────────────────────────────────

Write-Host "Setting up backend..." -ForegroundColor Yellow

$backendDir = Join-Path $PSScriptRoot "backend"
Set-Location $backendDir

# Create venv if not exists
if (-not (Test-Path "venv")) {
    Write-Host "  Creating Python virtual environment..." -ForegroundColor Gray
    python -m venv venv
    Write-Host "  [OK] Virtual environment created" -ForegroundColor Green
} else {
    Write-Host "  [OK] Virtual environment exists" -ForegroundColor Green
}

# Install/update dependencies
Write-Host "  Installing backend dependencies..." -ForegroundColor Gray
& ".\venv\Scripts\pip" install -r requirements.txt --quiet --only-binary ":all:" pyarrow 2>&1 | Out-Null
# Second pass to catch anything that needs building (psycopg2 etc.)
& ".\venv\Scripts\pip" install -r requirements.txt --quiet 2>&1 | Out-Null
Write-Host "  [OK] Backend dependencies installed" -ForegroundColor Green

# Create uploads folder
$uploadDir = Join-Path $backendDir "uploads"
if (-not (Test-Path $uploadDir)) {
    New-Item -ItemType Directory -Path $uploadDir | Out-Null
    Write-Host "  [OK] Uploads folder created" -ForegroundColor Green
}

Write-Host ""

# ── Frontend setup ────────────────────────────────────────────────────────────

Write-Host "Setting up frontend..." -ForegroundColor Yellow

$frontendDir = Join-Path $PSScriptRoot "frontend"
Set-Location $frontendDir

if (-not (Test-Path "node_modules")) {
    Write-Host "  Installing frontend dependencies (first run, may take a minute)..." -ForegroundColor Gray
    npm install --silent
    Write-Host "  [OK] Frontend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "  [OK] node_modules exists" -ForegroundColor Green
}

Write-Host ""

# ── Launch both servers ───────────────────────────────────────────────────────

Write-Host "Starting servers..." -ForegroundColor Yellow
Write-Host ""

# Backend in a new PowerShell window
$backendCmd = "cd '$backendDir'; Write-Host 'Backend starting on http://localhost:8000' -ForegroundColor Cyan; .\venv\Scripts\uvicorn app:app --reload --host 0.0.0.0 --port 8000"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd

Start-Sleep -Seconds 2

# Frontend in a new PowerShell window
$frontendCmd = "cd '$frontendDir'; Write-Host 'Frontend starting on http://localhost:3000' -ForegroundColor Cyan; `$env:REACT_APP_API_URL='http://localhost:8000/api'; npm start"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd

Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Backend :  http://localhost:8000" -ForegroundColor White
Write-Host "  API Docs:  http://localhost:8000/docs" -ForegroundColor White
Write-Host "  Frontend:  http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "  Two new terminal windows opened." -ForegroundColor Gray
Write-Host "  Close them to stop the servers." -ForegroundColor Gray
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
