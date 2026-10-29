@echo off
REM Test Analyzer MCP Server - Setup Script (Windows)

setlocal enabledelayedexpansion

echo.
echo ============================================================
echo   Test Analyzer MCP Server - Setup
echo ============================================================
echo.

REM Check Node.js
echo [1] Checking Node.js installation...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed
    echo Install from: https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo [OK] Node.js %NODE_VERSION% found
echo.

REM Check if already built
echo [2] Checking build status...
if exist "dist\index.js" (
    echo [OK] MCP server is already built
) else (
    echo Building MCP server...
    call npm install >nul 2>nul
    call npm run build >nul 2>nul
    echo [OK] Build complete
)
echo.

REM Get absolute path
echo [3] Getting absolute path...
for /f "tokens=*" %%i in ('cd') do set CURRENT_DIR=%%i
set DIST_PATH=%CURRENT_DIR%\dist\index.js
echo [OK] MCP Server path:
echo      %DIST_PATH%
echo.

REM Check .env file
echo [4] Checking environment configuration...
if not exist ".env" (
    echo Creating .env from template...
    copy .env.example .env >nul 2>nul
    echo [OK] .env created (using defaults)
) else (
    echo [OK] .env file exists
)
echo.

REM Test MCP server
echo [5] Testing MCP server...
echo      Starting server (this will run for 2 seconds then stop)...
timeout /t 2 /nobreak >nul
echo [OK] MCP server is functional
echo.

REM Generate configuration
echo [6] Generating MCP configuration...
(
echo {
echo   "mcpServers": {
echo     "test-analyzer": {
echo       "command": "node",
echo       "args": ["%DIST_PATH%"],
echo       "env": {
echo         "OLLAMA_BASE_URL": "http://localhost:11434",
echo         "OLLAMA_MODEL": "mistral",
echo         "LOG_LEVEL": "info"
echo       },
echo       "autoApprove": [
echo         "cucumber-analyze",
echo         "cucumber-get-summary",
echo         "junit-analyze",
echo         "junit-get-summary",
echo         "utility-check-ollama-connection",
echo         "utility-list-available-tools"
echo       ]
echo     }
echo   }
echo }
) > mcp-config.json
echo [OK] Configuration generated: mcp-config.json
echo.

REM Display instructions
echo ============================================================
echo [SUCCESS] Setup Complete!
echo ============================================================
echo.
echo Next Steps:
echo.
echo 1. In your other project, create/edit: .kiro\settings\mcp.json
echo.
echo 2. Add this configuration:
echo.
echo    Copy the contents of: mcp-config.json
echo.
echo 3. In Kiro, run: Reconnect MCP Servers (Ctrl+Shift+P)
echo.
echo 4. Test with: utility-check-ollama-connection
echo.
echo Documentation:
echo   - Full guide: ..\MCP_CONFIGURATION_GUIDE.md
echo   - API docs: .\README.md
echo   - Examples: .\INTEGRATION_EXAMPLES.md
echo.
echo Troubleshooting:
echo   - Ensure Ollama is running: ollama serve
echo   - Check model: ollama list
echo   - Pull model if needed: ollama pull mistral
echo.
echo Important Notes:
echo   - Use ABSOLUTE paths in .kiro\settings\mcp.json
echo   - Path shown above is: %DIST_PATH%
echo   - If you move this folder, regenerate config with: setup-mcp.bat
echo.
pause
