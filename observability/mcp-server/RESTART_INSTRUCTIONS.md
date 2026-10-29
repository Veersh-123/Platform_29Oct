# MCP Server Configuration for Test Analysis Dashboard

## Quick Start for Reuse in Other Projects

Due to API incompatibilities between versions, we're creating a simplified, production-ready MCP server that focuses on the core dashboard and analysis functionality.

### Step 1: Build the Root Project Libraries

First, build the shared libraries in the root project:

```bash
npm install
npm run build
```

This provides the core test analysis services that the MCP server wraps.

### Step 2: Update MCP Server Configuration

The MCP server uses a simpler, more maintainable approach by wrapping existing services.

Create a `~/.kiro/settings/mcp.json` or `.kiro/settings/mcp.json` in your project:

```json
{
  "mcpServers": {
    "test-analyzer": {
      "command": "node",
      "args": ["./mcp-server/dist/index.js"],
      "env": {
        "OLLAMA_BASE_URL": "http://localhost:11434",
        "OLLAMA_MODEL": "mistral",
        "LOG_LEVEL": "info",
        "OPENAI_API_KEY": ""
      },
      "autoApprove": [
        "generate-dashboard",
        "analyze-tests",
        "get-metrics"
      ]
    }
  }
}
```

### Step 3: Build the MCP Server

```bash
cd mcp-server
npm install
npm run build
```

### Step 4: Start Services

In your terminal:
```bash
npm start  # Main application server
```

In another terminal (if needed):
```bash
cd mcp-server
node dist/index.js  # MCP server
```

## Available Tools

### Generate Dashboard
- Creates observability dashboard from test results
- Integrates AI-powered insights
- Outputs interactive HTML report

### Analyze Tests
- Analyzes Cucumber and JUnit results
- Categorizes bugs (product, automation, environment)
- Generates trend analysis

### Get Metrics
- Returns quick summary statistics
- Health scores and stability metrics
- Pass rate trends

## Usage in Another Project

1. Copy the `mcp-server` folder to your new project
2. Run `npm install` in the `mcp-server` directory
3. Configure MCP settings as shown above
4. Reconnect the MCP server from Kiro's MCP Server view
5. Use tools like: "Generate dashboard from test results" or "Analyze these test results"

## Troubleshooting

- **MCP not connecting**: Check the path to `dist/index.js` - ensure MCP server is built
- **Missing dependencies**: Run `npm install` in both root and `mcp-server` directories
- **Tool not found**: Verify `autoApprove` list matches tool names exactly
