# MCP Server Setup for Reuse in Other Projects

## Overview
The Test Analyzer MCP Server provides tools for analyzing test results (Cucumber and JUnit), generating dashboards, and providing AI-powered insights using the Observability and Dashboard functionality.

## Installation Steps

### 1. Install as NPM Package
In your other project, add this as a dependency:

```bash
npm install @hexaware/test-analyzer-mcp
```

Or install from a local path during development:

```bash
npm install file:../path/to/mcp-server
```

### 2. Configure MCP in Your Project

Create or update `.kiro/settings/mcp.json` (or `~/.kiro/settings/mcp.json` for user-level config):

```json
{
  "mcpServers": {
    "test-analyzer": {
      "command": "node",
      "args": ["{path-to-package}/node_modules/@hexaware/test-analyzer-mcp/dist/index.js"],
      "env": {
        "OLLAMA_BASE_URL": "http://localhost:11434",
        "OLLAMA_MODEL": "mistral",
        "LOG_LEVEL": "info",
        "OPENAI_API_KEY": "your-key-here"
      },
      "autoApprove": [
        "cucumber-analyze",
        "cucumber-get-summary",
        "junit-analyze",
        "junit-get-summary",
        "dashboard-generate",
        "utility-check-ollama-connection",
        "utility-list-available-tools"
      ]
    }
  }
}
```

### 3. Build the MCP Server

```bash
cd mcp-server
npm run build
```

## Available Tools

### Dashboard Tools
- `dashboard-generate`: Generate observability and test analysis dashboards
- `dashboard-get-settings`: Get current dashboard configuration

### Cucumber Tools
- `cucumber-analyze`: Analyze Cucumber test results
- `cucumber-get-summary`: Get summary of Cucumber results

### JUnit Tools
- `junit-analyze`: Analyze JUnit test results
- `junit-get-summary`: Get summary of JUnit results

### AI Insights Tools
- `ai-analyze`: Get AI-powered insights on test results
- `ai-generate-report`: Generate AI analysis report

### Historic Data Tools
- `historic-store-results`: Store results for historical tracking
- `historic-get-trends`: Get historical trends

### Utility Tools
- `utility-check-ollama-connection`: Verify Ollama connection
- `utility-list-available-tools`: List all available tools

## Environment Variables

Configure these in your MCP settings or `.env` file:

- `OLLAMA_BASE_URL`: Ollama API endpoint (default: http://localhost:11434)
- `OLLAMA_MODEL`: Model to use (default: mistral)
- `OPENAI_API_KEY`: OpenAI API key for advanced analysis (optional)
- `LOG_LEVEL`: Logging level (default: info)

## Usage Example

Once configured, you can use the tools in Kiro:

```
Analyze the test results from /path/to/cucumber-results.json using the dashboard-generate tool
```

The MCP server will automatically handle the analysis and generate observability dashboards.

## Troubleshooting

### Error: Command not found
- Ensure Node.js is installed and accessible
- Verify the path to the MCP server is correct

### Connection Issues
- Check that Ollama is running (if using local models)
- Verify OLLAMA_BASE_URL is correct
- Check firewall settings

### Tool Not Found
- Run `utility-list-available-tools` to see all available tools
- Verify autoApprove list includes the tool you want to use
