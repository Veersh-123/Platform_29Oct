# Setup Migration Server Dependencies
# Run this if you want to enable the Framework Migrator service

$MigrationBackendPath = "./Value added services/MigrationAgent/MigrationAgent/selenium-playwruight-migration/backend"
$MigrationFrontendPath = "./Value added services/MigrationAgent/MigrationAgent/selenium-playwruight-migration/frontend"

Write-Host "`n🔧 Setting up Framework Migrator (Selenium to Playwright)..." -ForegroundColor Cyan

# Check if migration server exists
if (-not (Test-Path $MigrationBackendPath)) {
    Write-Host "❌ Migration server not found at: $MigrationBackendPath" -ForegroundColor Red
    exit 1
}

# Install backend dependencies
Write-Host "`n📦 Installing backend dependencies..." -ForegroundColor Yellow
Push-Location $MigrationBackendPath

if (-not (Test-Path "node_modules")) {
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install backend dependencies" -ForegroundColor Red
        Pop-Location
        exit 1
    }
}
Write-Host "✅ Backend dependencies ready" -ForegroundColor Green

Pop-Location

# Install frontend dependencies (optional)
Write-Host "`n📦 Installing frontend dependencies..." -ForegroundColor Yellow
if (Test-Path $MigrationFrontendPath) {
    Push-Location $MigrationFrontendPath
    
    if (-not (Test-Path "node_modules")) {
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-Host "⚠️  Frontend dependencies installation had issues (non-critical)" -ForegroundColor Yellow
        } else {
            Write-Host "✅ Frontend dependencies ready" -ForegroundColor Green
        }
    }
    
    Pop-Location
}

Write-Host "`n✅ Framework Migrator setup complete!`n" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Start the main server: npm run server"
Write-Host "  2. Open dashboard: http://localhost:4000"
Write-Host "  3. Click 'Framework Migrator' in Value Added Services tab"
Write-Host "`n"
