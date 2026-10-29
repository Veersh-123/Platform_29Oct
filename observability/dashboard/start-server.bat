@echo off
REM Start Test Observability Server on Windows

setlocal enabledelayedexpansion

set PORT=3001
set NODE_PATH=%~dp0

echo.
echo ╔════════════════════════════════════════════╗
echo ║  Test Observability Server Startup         ║
echo ╚════════════════════════════════════════════╝
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo ✓ Node.js found: 
node --version

echo.
echo Starting server on http://localhost:!PORT!...
echo.

cd /d "%NODE_PATH%"
node server.js

pause
