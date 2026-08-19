# ThaibaHive Staging Deployment Script (Windows PowerShell)

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host " ThaibaHive Staging & Production Deployment Pipeline " -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan

# 1. Check prerequisites
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "[!] Docker CLI is not installed or not in PATH."
    exit 1
}

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Error "[!] pnpm CLI is not installed or not in PATH."
    exit 1
}

# 2. Generate PostgreSQL Drizzle Migrations
Write-Host "`n[1/4] Generating Drizzle PostgreSQL Migration Files..." -ForegroundColor Yellow
pnpm db:generate:pg
if ($LASTEXITCODE -ne 0) {
    Write-Error "[!] Failed to generate PostgreSQL migration files."
    exit 1
}

# 3. Build Docker Compose Images
Write-Host "`n[2/4] Building Docker Compose Container Images..." -ForegroundColor Yellow
docker compose build
if ($LASTEXITCODE -ne 0) {
    Write-Error "[!] Docker compose build failed."
    exit 1
}

# 4. Boot Staging Container Environment
Write-Host "`n[3/4] Starting Staging Services (PostgreSQL + Next.js App)..." -ForegroundColor Yellow
docker compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Error "[!] Docker compose up failed."
    exit 1
}

# 5. Verify Health Endpoint Probe
Write-Host "`n[4/4] Probing Container Health Endpoint..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

try {
    $healthSecret = if ($env:HEALTH_SECRET) { $env:HEALTH_SECRET } else { "thaibahive_health_secret_token" }
    $headers = @{ "x-health-secret" = $healthSecret }
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/system/health" -Method Get -Headers $headers
    Write-Host "[+] Staging Health Probe Response: $($response | ConvertTo-Json -Compress)" -ForegroundColor Green
    Write-Host "`n=====================================================" -ForegroundColor Green
    Write-Host " DEPLOYMENT SUCCESSFUL! App running at http://localhost:3000 " -ForegroundColor Green
    Write-Host "=====================================================" -ForegroundColor Green
} catch {
    Write-Host "[!] Health probe check failed. Service may still be initializing or has an issue." -ForegroundColor Red
    Write-Host "Check container logs via: docker compose logs thaibahive-app" -ForegroundColor Yellow
}
