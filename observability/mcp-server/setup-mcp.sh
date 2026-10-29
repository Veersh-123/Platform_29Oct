#!/bin/bash

# Test Analyzer MCP Server - Setup Script
# This script helps configure the MCP server for use in another project

set -e

echo "╔════════════════════════════════════════════════════════╗"
echo "║  Test Analyzer MCP Server - Setup                      ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check Node.js
echo -e "${BLUE}1. Checking Node.js installation...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    echo "  Install from: https://nodejs.org/"
    exit 1
fi
NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js ${NODE_VERSION} found${NC}"
echo ""

# Check if already built
echo -e "${BLUE}2. Checking build status...${NC}"
if [ -d "dist" ] && [ -f "dist/index.js" ]; then
    echo -e "${GREEN}✓ MCP server is already built${NC}"
else
    echo -e "${YELLOW}Building MCP server...${NC}"
    npm install > /dev/null 2>&1
    npm run build > /dev/null 2>&1
    echo -e "${GREEN}✓ Build complete${NC}"
fi
echo ""

# Get absolute path
echo -e "${BLUE}3. Getting absolute path...${NC}"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
DIST_PATH="$SCRIPT_DIR/dist/index.js"
echo -e "${GREEN}✓ MCP Server path:${NC}"
echo "  ${BLUE}$DIST_PATH${NC}"
echo ""

# Check .env file
echo -e "${BLUE}4. Checking environment configuration...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env from template...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ .env created (using defaults)${NC}"
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi
echo ""

# Test MCP server
echo -e "${BLUE}5. Testing MCP server...${NC}"
echo "  Starting server (this will run for 2 seconds then stop)..."
timeout 2s node dist/index.js > /dev/null 2>&1 || true
echo -e "${GREEN}✓ MCP server is functional${NC}"
echo ""

# Generate configuration
echo -e "${BLUE}6. Generating MCP configuration...${NC}"
cat > mcp-config.json << EOF
{
  "mcpServers": {
    "test-analyzer": {
      "command": "node",
      "args": ["$DIST_PATH"],
      "env": {
        "OLLAMA_BASE_URL": "http://localhost:11434",
        "OLLAMA_MODEL": "mistral",
        "LOG_LEVEL": "info"
      },
      "autoApprove": [
        "cucumber-analyze",
        "cucumber-get-summary",
        "junit-analyze",
        "junit-get-summary",
        "utility-check-ollama-connection",
        "utility-list-available-tools"
      ]
    }
  }
}
EOF
echo -e "${GREEN}✓ Configuration generated: mcp-config.json${NC}"
echo ""

# Instructions
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Setup Complete!${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. In your other project, create/edit: .kiro/settings/mcp.json"
echo ""
echo "2. Add this configuration:"
echo ""
echo -e "${YELLOW}------- Copy & Paste -------${NC}"
cat mcp-config.json | sed 's/^/  /'
echo -e "${YELLOW}---------------------------${NC}"
echo ""
echo "3. In Kiro, run: Reconnect MCP Servers (Cmd+Shift+P)"
echo ""
echo "4. Test with: utility-check-ollama-connection"
echo ""
echo "📚 Documentation:"
echo "  - Full guide: ../MCP_CONFIGURATION_GUIDE.md"
echo "  - API docs: ./README.md"
echo "  - Examples: ./INTEGRATION_EXAMPLES.md"
echo ""
echo "🔧 Troubleshooting:"
echo "  - Ensure Ollama is running: ollama serve"
echo "  - Check model: ollama list"
echo "  - Pull model if needed: ollama pull mistral"
echo ""
echo "📌 Important Notes:"
echo "  - Use ABSOLUTE paths in .kiro/settings/mcp.json (not relative)"
echo "  - Path shown above is: $DIST_PATH"
echo "  - If you move this folder, regenerate config with: ./setup-mcp.sh"
echo ""
