# Observability Module Setup Guide

This guide walks you through setting up the integrated Test Observability and Failure Analysis MCP server in the Orchestrator Platform.

## Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** - Check with: `node --version`
- **Ollama** - Download from [https://ollama.ai](https://ollama.ai)
- **Ollama Model** - Install with: `ollama pull mistral`
- **Orchestrator Platform** - Project root directory where this `observability` folder is located

## Step 1: Verify Ollama is Running

Ollama must be running on `localhost:11434` for the MCP server to work.

```bash
# Start Ollama (if not running)
ollama serve

# In another terminal, verify it's working
curl http://localhost:11434/api/version

# Check that your model is available
ollama list
```

Expected output should include `mistral` (or your chosen model).

## Step 2: Install Dependencies

Install both the main Orchestrator Platform and the MCP server dependencies:

```bash
# From Orchestrator_Platform directory
npm install

# Install MCP server dependencies
npm run obs:build
```

This will:
- Install all root project dependencies
- Install MCP server dependencies in `observability/mcp-server/`
- Compile TypeScript files to `observability/mcp-server/dist/`

## Step 3: Verify MCP Server Build

Check that the MCP server compiled successfully:

```bash
# Check for compiled files
ls -la observability/mcp-server/dist/

# Or on Windows PowerShell
Get-ChildItem observability/mcp-server/dist/
```

You should see `index.js` and other compiled files.

## Step 4: Open Orchestrator Platform in Kiro

1. Open the project root directory in **Kiro IDE**
2. The `.kiro/settings/mcp.json` file has already been configured with the MCP server path

## Step 5: Reconnect MCP Servers in Kiro

1. Open Command Palette: `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. Search for "MCP"
3. Select "Reconnect MCP Servers"
4. Wait 3-5 seconds for the connection to establish

## Step 6: Verify MCP Connection

In Kiro chat, test the connection:

```
Use utility-check-ollama-connection
```

Expected response:
```json
{
  "success": true,
  "connected": true,
  "ollamaBaseUrl": "http://localhost:11434",
  "model": "mistral",
  "message": "Ollama is running and model is available"
}
```

## Step 7: Test with Sample Data

The observability module includes sample test results for testing:

```
Use cucumber-get-summary with resultsPath: ./observability/data/sample-cucumber-results.json
```

You should see a summary with metrics from the sample data.

## Step 8: Generate a Dashboard

Generate an interactive HTML dashboard from the sample data:

```bash
# From project root
node observability/scripts/generate-dashboard.js observability/data/sample-cucumber-results.json
```

This creates a dashboard at: `observability/dashboard/cucumber-dashboard.html`

## Step 9: View Test Observability in Frontend

1. Open `Orchestrator-Platform.html` in your browser
2. Click on the **Value Added Services** tab
3. Click on **Test Observability** card
4. The dashboard should load and display the latest test report

## Common Issues & Solutions

### Issue: "Cannot connect to Ollama"

**Solution:**
```bash
# Verify Ollama is running
ollama serve

# In another terminal, test connection
curl http://localhost:11434/api/tags

# Pull mistral model if needed
ollama pull mistral
```

### Issue: "MCP Server not showing in Kiro"

**Solution:**
1. Verify `observability/mcp-server/dist/index.js` exists
2. Check that `.kiro/settings/mcp.json` has the correct path (absolute path)
3. Run: `npm run obs:build` to recompile
4. Reconnect MCP servers in Kiro

### Issue: "No dashboard report available"

**Solution:**
1. Generate a test dashboard: `node observability/scripts/generate-dashboard.js observability/data/sample-cucumber-results.json`
2. Or run your own tests and generate a dashboard
3. Dashboard should be saved to `observability/dashboard/cucumber-dashboard.html`

### Issue: "TypeScript compilation errors"

**Solution:**
```bash
# Check for TypeScript errors
cd observability/mcp-server
npm run type-check

# Rebuild
npm run build
```

## Configuration Files

### `.kiro/settings/mcp.json`
- **Location:** Root of Orchestrator Platform
- **Purpose:** Configures MCP server connection
- **Important:** Uses absolute path to MCP server executable

### `observability/mcp-server/.env`
- **Location:** `observability/mcp-server/.env`
- **Purpose:** Environment variables for MCP server
- **Example:**
  ```env
  OLLAMA_BASE_URL=http://localhost:11434
  OLLAMA_MODEL=mistral
  LOG_LEVEL=info
  ```

## Using the Observability Module

### Available Commands in Kiro Chat

The commands below use the included Cucumber sample data. Playwright runs initiated
from the dashboard save their own HTML report and execution summary automatically.

**Quick Summary:**
```
Use cucumber-get-summary with resultsPath: ./observability/data/sample-cucumber-results.json
```

**Full Analysis with AI:**
```
Use cucumber-analyze with resultsPath: ./observability/data/sample-cucumber-results.json and includeAiAnalysis: true
```

**Custom Questions:**
```
Use cucumber-query with resultsPath: ./observability/data/sample-cucumber-results.json and query: "What are the top failing tests?"
```

**Dashboard Generation:**
```
Use dashboard-generate-observability with resultsPath: ./observability/data/sample-cucumber-results.json
```

### Available NPM Scripts

```bash
# Build the MCP server
npm run obs:build

# Run in development mode
npm run obs:dev

# Analyze Cucumber results
npm run obs:analyze:cucumber

# Analyze JUnit results
npm run obs:analyze:junit

# Generate dashboard
npm run obs:dashboard
```

## File Structure

```
observability/
├── mcp-server/               # MCP Server implementation
│   ├── src/                  # TypeScript source code
│   ├── dist/                 # Compiled JavaScript (generated)
│   ├── package.json          # MCP server dependencies
│   └── tsconfig.json         # TypeScript config
├── dashboard/                # Generated dashboards
│   ├── test-observability-loader.html
│   └── cucumber-dashboard.html (generated)
├── data/                     # Sample test data
│   └── sample-cucumber-results.json
├── scripts/                  # Utility scripts
│   └── generate-dashboard.js
└── SETUP.md                  # This file
```

## Next Steps

1. ✅ Setup complete! Run tests and generate dashboards
2. ✅ Use MCP tools in Kiro to analyze results
3. ✅ View dashboards in the Orchestrator Platform frontend
4. ✅ Share insights with your team

## Support

For detailed information, see:

- `../OBSERVABILITY_INTEGRATION_GUIDE.md` - Complete integration guide
- `../OBSERVABILITY_QUICK_REFERENCE.md` - Quick command reference
- `mcp-server/README.md` - MCP server API documentation
- `../MCP_CONFIGURATION_GUIDE.md` - Advanced configuration

## Troubleshooting Checklist

- [ ] Ollama is running on localhost:11434
- [ ] Ollama model is available (`ollama list`)
- [ ] `npm install` completed successfully
- [ ] `npm run obs:build` succeeded
- [ ] `.kiro/settings/mcp.json` exists and is valid
- [ ] MCP servers reconnected in Kiro
- [ ] `utility-check-ollama-connection` returns success
- [ ] Sample dashboard generated successfully

---

**Happy testing! 🚀**

For questions or issues, refer to the documentation or check the MCP server logs in Kiro.
