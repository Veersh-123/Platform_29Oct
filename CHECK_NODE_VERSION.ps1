# PowerShell Script to Check Node.js Version
# Run this after upgrading Node.js

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Node.js Version Checker" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js version
Write-Host "Current Node.js version:" -ForegroundColor Yellow
node --version

Write-Host ""

# Check npm version
Write-Host "Current npm version:" -ForegroundColor Yellow
npm --version

Write-Host ""

# Check Node.js installation path
Write-Host "Node.js installation path:" -ForegroundColor Yellow
where.exe node

Write-Host ""

# Version requirement check
$nodeVersion = (node --version).Replace("v", "")
$requiredVersion = "20.19.0"

Write-Host "Required version: $requiredVersion or higher" -ForegroundColor Green
Write-Host "Current version: $nodeVersion" -ForegroundColor Green

Write-Host ""
Write-Host "✅ If your version is 20.19.0 or higher, Copilot SDK will work!" -ForegroundColor Green
Write-Host "❌ If your version is lower, please upgrade Node.js" -ForegroundColor Red
