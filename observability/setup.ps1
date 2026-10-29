# Setup script for Observability MCP Server on Windows
# Run: powershell -ExecutionPolicy Bypass -File setup.ps1

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Observability MCP Server Setup" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "Checking prerequisites..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($null -eq $nodeVersion) {
    Write-Host "❌ Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Node.js $nodeVersion found" -ForegroundColor Green

# Check if npm is installed
$npmVersion = npm --version 2>$null
if ($null -eq $npmVersion) {
    Write-Host "❌ npm is not installed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ npm $npmVersion found" -ForegroundColor Green

# Navigate to mcp-server directory
$mcpServerPath = Join-Path $PSScriptRoot "mcp-server"
if (!(Test-Path $mcpServerPath)) {
    Write-Host "❌ mcp-server directory not found at: $mcpServerPath" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Installing MCP Server dependencies..." -ForegroundColor Yellow
Push-Location $mcpServerPath
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ npm install failed" -ForegroundColor Red
    Pop-Location
    exit 1
}
Write-Host "✅ Dependencies installed" -ForegroundColor Green

# Build TypeScript
Write-Host ""
Write-Host "Building TypeScript..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ TypeScript build failed" -ForegroundColor Red
    Pop-Location
    exit 1
}
Write-Host "✅ TypeScript built successfully" -ForegroundColor Green

Pop-Location

# Check Ollama connection
Write-Host ""
Write-Host "Checking Ollama connection..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:11434/api/version" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Ollama is running" -ForegroundColor Green
    Write-Host "   Version: $($response.Content)" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Ollama is not running at http://localhost:11434" -ForegroundColor Yellow
    Write-Host "   Start Ollama with: ollama serve" -ForegroundColor Yellow
}

# Display next steps
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Ensure Ollama is running:"
Write-Host "   ollama serve"
Write-Host ""
Write-Host "2. Pull a model (if not already done):"
Write-Host "   ollama pull mistral"
Write-Host ""
Write-Host "3. In Kiro IDE:"
Write-Host "   - Press Ctrl+Shift+P"
Write-Host "   - Search for 'MCP'"
Write-Host "   - Select 'Reconnect MCP Servers'"
Write-Host ""
Write-Host "4. Verify connection in Kiro chat:"
Write-Host "   Use utility-check-ollama-connection"
Write-Host ""
Write-Host "5. Generate example dashboard:"
Write-Host "   npm run obs:dashboard"
Write-Host ""
Write-Host "For more information, see: OBSERVABILITY_INTEGRATION_GUIDE.md" -ForegroundColor Cyan
Write-Host ""
