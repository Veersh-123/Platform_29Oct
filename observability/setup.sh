#!/bin/bash

# Setup script for Observability MCP Server on macOS/Linux
# Run: bash setup.sh

echo "================================================"
echo "Observability MCP Server Setup"
echo "================================================"
echo ""

# Check if Node.js is installed
echo "Checking prerequisites..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi
NODE_VERSION=$(node --version)
echo "✅ $NODE_VERSION found"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi
NPM_VERSION=$(npm --version)
echo "✅ npm $NPM_VERSION found"

# Navigate to mcp-server directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
MCP_SERVER_PATH="$SCRIPT_DIR/mcp-server"

if [ ! -d "$MCP_SERVER_PATH" ]; then
    echo "❌ mcp-server directory not found at: $MCP_SERVER_PATH"
    exit 1
fi

echo ""
echo "Installing MCP Server dependencies..."
cd "$MCP_SERVER_PATH"
npm install
if [ $? -ne 0 ]; then
    echo "❌ npm install failed"
    exit 1
fi
echo "✅ Dependencies installed"

# Build TypeScript
echo ""
echo "Building TypeScript..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ TypeScript build failed"
    exit 1
fi
echo "✅ TypeScript built successfully"

cd "$SCRIPT_DIR"

# Check Ollama connection
echo ""
echo "Checking Ollama connection..."
if curl -s http://localhost:11434/api/version > /dev/null; then
    OLLAMA_VERSION=$(curl -s http://localhost:11434/api/version)
    echo "✅ Ollama is running"
    echo "   Version: $OLLAMA_VERSION"
else
    echo "⚠️  Ollama is not running at http://localhost:11434"
    echo "   Start Ollama with: ollama serve"
fi

# Display next steps
echo ""
echo "================================================"
echo "Setup Complete!"
echo "================================================"
echo ""
echo "Next Steps:"
echo "1. Ensure Ollama is running:"
echo "   ollama serve"
echo ""
echo "2. Pull a model (if not already done):"
echo "   ollama pull mistral"
echo ""
echo "3. In Kiro IDE:"
echo "   - Press Cmd+Shift+P (Mac) or Ctrl+Shift+P (Linux)"
echo "   - Search for 'MCP'"
echo "   - Select 'Reconnect MCP Servers'"
echo ""
echo "4. Verify connection in Kiro chat:"
echo "   Use utility-check-ollama-connection"
echo ""
echo "5. Generate example dashboard:"
echo "   npm run obs:dashboard"
echo ""
echo "For more information, see: OBSERVABILITY_INTEGRATION_GUIDE.md"
echo ""
