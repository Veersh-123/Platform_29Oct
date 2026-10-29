# Test Analyzer MCP Server

A native Model Context Protocol (MCP) server for Hexaware Test Automation Analysis. Provides AI-powered test result analysis, dashboard generation, and observability features.

## Features

- **Test Result Analysis**: Analyze Cucumber and JUnit test results with AI-powered insights
- **AI-Powered Insights**: Uses Ollama for local analysis and OpenAI for advanced categorization
- **Bug Categorization**: Automatically categorize failures (product bugs, automation issues, environment issues, flaky tests)
- **Dashboard Generation**: Create interactive dashboards with test metrics and trends
- **Historic Data**: Track test trends over time with historic data storage
- **Conversational AI**: Chat interface for custom queries and analysis
- **Multi-Format Support**: Handles Cucumber JSON, JUnit XML, and Mocha results

## Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the `mcp-server` directory:

```env
# Ollama Configuration (for AI analysis)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=mistral

# OpenAI Configuration (optional, for advanced features)
OPENAI_API_KEY=your_openai_api_key_here

# Application Configuration
LOG_LEVEL=info
CUCUMBER_RESULTS_PATH=../data/sample-cucumber-results.json
JUNIT_RESULTS_PATH=../data/sample-mocha-junit-results.xml
DASHBOARD_TITLE=Test Automation Report
GENERATE_DASHBOARD=true
AUTO_OPEN_DASHBOARD=false
```

### 3. Build the Server

```bash
npm run build
```

## Usage in Another Project

### Option A: Configure as MCP in Kiro

1. Add to your `.kiro/settings/mcp.json` in your consuming project:

```json
{
  "mcpServers": {
    "test-analyzer": {
      "command": "node",
      "args": ["path/to/mcp-server/dist/index.js"],
      "env": {
        "OLLAMA_BASE_URL": "http://localhost:11434",
        "OLLAMA_MODEL": "mistral",
        "OPENAI_API_KEY": "your_key_here"
      },
      "autoApprove": [
        "cucumber-analyze",
        "junit-analyze",
        "cucumber-get-summary"
      ]
    }
  }
}
```

2. Reconnect MCP servers in Kiro

### Option B: Direct Integration

Use as an npm package in your project:

```bash
npm install /path/to/mcp-server
```

Then import and use in your code:

```typescript
import { TestAnalyzerTools } from '@hexaware/test-analyzer-mcp';

const tools = new TestAnalyzerTools();
const result = await tools.executeTool('cucumber-analyze', {
  resultsPath: './test-results.json',
  includeAiAnalysis: true
});
```

## Available Tools

### Cucumber Analysis

- **`cucumber-analyze`**: Full analysis with AI insights
  ```
  Args: {
    resultsPath: string (required),
    includeAiAnalysis?: boolean (default: true)
  }
  ```

- **`cucumber-get-summary`**: Quick summary without AI
  ```
  Args: { resultsPath: string }
  ```

- **`cucumber-process-results`**: Get structured data
  ```
  Args: { resultsPath: string }
  ```

- **`cucumber-query`**: Custom analysis query
  ```
  Args: {
    resultsPath: string,
    query: string
  }
  ```

### JUnit Analysis

- **`junit-analyze`**: Full analysis with AI insights
  ```
  Args: {
    resultsPath: string (required),
    includeAiAnalysis?: boolean (default: true)
  }
  ```

- **`junit-get-summary`**: Quick summary without AI
  ```
  Args: { resultsPath: string }
  ```

- **`junit-process-results`**: Get structured data
  ```
  Args: { resultsPath: string }
  ```

- **`junit-query`**: Custom analysis query
  ```
  Args: {
    resultsPath: string,
    query: string
  }
  ```

### AI Insights

- **`ai-chat-query`**: Conversational AI query
  ```
  Args: {
    message: string,
    context?: object
  }
  ```

- **`ai-categorize-bugs`**: Categorize test failures
  ```
  Args: { resultsPath: string }
  ```

- **`ai-generate-suggestions`**: Get improvement suggestions
  ```
  Args: { resultsPath: string }
  ```

- **`ai-get-welcome-message`**: Personalized welcome
  ```
  Args: { projectName?: string }
  ```

### Historic Data

- **`historic-get-summary`**: Summary of all reports
  ```
  Args: {}
  ```

- **`historic-get-all-data`**: Retrieve all historic data
  ```
  Args: {}
  ```

- **`historic-save-report`**: Save new test report
  ```
  Args: {
    summary: object,
    analysis?: string,
    suggestions?: string,
    fileSource?: string
  }
  ```

### Dashboards

- **`dashboard-generate-observability`**: Generate observability dashboard
  ```
  Args: { historicDataPath?: string }
  ```

- **`dashboard-get-metrics`**: Get quick metrics
  ```
  Args: { historicDataPath?: string }
  ```

- **`dashboard-export-data`**: Export as JSON
  ```
  Args: { historicDataPath?: string }
  ```

- **`dashboard-generate-summary`**: Summary statistics
  ```
  Args: { historicDataPath?: string }
  ```

- **`dashboard-validate-prerequisites`**: Validate setup
  ```
  Args: {}
  ```

### Utility

- **`utility-check-ollama-connection`**: Check Ollama status
- **`utility-get-server-info`**: Get server information
- **`utility-list-available-tools`**: List all tools
- **`utility-get-config`**: Get current configuration

## Prerequisites

### Required

- Node.js 18+
- Ollama running locally (for AI analysis)
- Test results file (Cucumber JSON or JUnit XML)

### Optional

- OpenAI API key (for advanced AI features like bug categorization)
- Historic data for trend analysis and observability dashboards

## Development

### Run in Development Mode

```bash
npm run dev
```

### Type Check

```bash
npm run type-check
```

### Build

```bash
npm run build
```

## Architecture

```
mcp-server/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── config/               # Configuration management
│   ├── tools/                # Tool implementations
│   │   ├── base-tool.ts
│   │   ├── index.ts
│   │   ├── cucumber.ts
│   │   ├── junit.ts
│   │   ├── ai-insights.ts
│   │   ├── historic-data.ts
│   │   ├── dashboard.ts
│   │   └── utility.ts
│   └── lib/                  # Re-exports from parent project
├── dist/                     # Compiled output
├── package.json
├── tsconfig.json
└── README.md
```

## Troubleshooting

### "Cannot connect to Ollama"

Ensure Ollama is running:
```bash
ollama serve
```

And the model is available:
```bash
ollama pull mistral
```

### "ChatbotService not available"

Set `OPENAI_API_KEY` environment variable for AI features that require OpenAI.

### Import Errors

Ensure the parent project (`../lib`) is accessible. The MCP server uses relative paths to import from the main project.

## Examples

### Example 1: Analyze Cucumber Results in Kiro

```
Use the MCP tool: cucumber-analyze
Arguments:
  resultsPath: ./data/sample-cucumber-results.json
  includeAiAnalysis: true
```

### Example 2: Get Test Summary

```
Use the MCP tool: cucumber-get-summary
Arguments:
  resultsPath: ./data/sample-cucumber-results.json
```

### Example 3: Custom Query

```
Use the MCP tool: cucumber-query
Arguments:
  resultsPath: ./data/sample-cucumber-results.json
  query: "What are the most common failure patterns?"
```

### Example 4: Generate Observability Dashboard

```
Use the MCP tool: dashboard-generate-observability
Arguments: {}
```

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_MODEL` | `mistral` | Ollama model to use |
| `OPENAI_API_KEY` | - | OpenAI API key (optional) |
| `LOG_LEVEL` | `info` | Logging level |
| `CUCUMBER_RESULTS_PATH` | `../data/sample-cucumber-results.json` | Cucumber results path |
| `JUNIT_RESULTS_PATH` | `../data/sample-mocha-junit-results.xml` | JUnit results path |
| `DASHBOARD_TITLE` | `Test Automation Report` | Dashboard title |
| `GENERATE_DASHBOARD` | `true` | Auto-generate dashboards |
| `AUTO_OPEN_DASHBOARD` | `false` | Auto-open dashboards |
| `AI_TIMEOUT` | `120000` | AI analysis timeout (ms) |

## License

ISC

## Support

For issues or questions, please refer to the main project documentation or create an issue in the repository.
