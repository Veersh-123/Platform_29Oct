# MCP Server Setup & Integration Guide

This guide walks you through setting up the Test Analyzer MCP Server and integrating it into your projects.

## Quick Start

### Step 1: Prerequisites

Ensure you have:
- Node.js 18+ installed
- Ollama installed and running (`ollama serve`)
- Ollama model pulled (`ollama pull mistral`)

### Step 2: Build the MCP Server

From the `mcp-server` directory:

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build
```

### Step 3: Verify Installation

```bash
# Test the server
npm run build
node dist/index.js
```

You should see: `🚀 Test Analyzer MCP Server started`

---

## Integration Methods

### Method 1: Kiro IDE Integration (Recommended)

This method integrates the MCP server directly into Kiro.

#### 1.1 Update Kiro MCP Configuration

In your Kiro workspace, edit `.kiro/settings/mcp.json` (create if doesn't exist):

```json
{
  "mcpServers": {
    "test-analyzer": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/dist/index.js"],
      "env": {
        "OLLAMA_BASE_URL": "http://localhost:11434",
        "OLLAMA_MODEL": "mistral",
        "OPENAI_API_KEY": "sk-...",
        "LOG_LEVEL": "info"
      },
      "autoApprove": [
        "cucumber-analyze",
        "cucumber-get-summary",
        "junit-analyze",
        "junit-get-summary",
        "utility-check-ollama-connection"
      ]
    }
  }
}
```

#### 1.2 Reconnect MCP Servers

1. Open Kiro command palette: `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Search for "MCP" and select "Reconnect MCP Servers" or "Open MCP Server View"
3. The test-analyzer server should now appear in the MCP Server list

#### 1.3 Test Connection

In Kiro chat, ask the agent:
```
Use the utility-check-ollama-connection tool to verify the server is working
```

---

### Method 2: Direct npm Integration

Use the MCP server as a dependency in another project.

#### 2.1 Install as Local Package

In your consuming project:

```bash
npm install /absolute/path/to/mcp-server
```

Or in `package.json`:

```json
{
  "dependencies": {
    "@hexaware/test-analyzer-mcp": "file:/absolute/path/to/mcp-server"
  }
}
```

#### 2.2 Configure in Your MCP

Create your own MCP server wrapper:

```typescript
import { TestAnalyzerTools } from '@hexaware/test-analyzer-mcp';

const tools = new TestAnalyzerTools();

export async function analyzeCucumber(resultsPath: string) {
  return await tools.executeTool('cucumber-analyze', {
    resultsPath,
    includeAiAnalysis: true
  });
}
```

---

### Method 3: Docker Container

Package the MCP server as a Docker container for deployment.

#### 3.1 Create Dockerfile

Create `mcp-server/Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY src ./src
COPY tsconfig.json ./

# Build
RUN npm run build

# Set executable
RUN chmod +x dist/index.js

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

#### 3.2 Build and Run

```bash
# Build image
docker build -t test-analyzer-mcp .

# Run container
docker run \
  -e OLLAMA_BASE_URL=http://host.docker.internal:11434 \
  -e OLLAMA_MODEL=mistral \
  -e OPENAI_API_KEY=your_key \
  test-analyzer-mcp
```

---

## Environment Configuration

### Development (.env)

```env
# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=mistral

# OpenAI Configuration (optional)
OPENAI_API_KEY=sk-...
AZURE_OPENAI_API_KEY=your_azure_key

# Application Settings
LOG_LEVEL=debug
CUCUMBER_RESULTS_PATH=../data/sample-cucumber-results.json
JUNIT_RESULTS_PATH=../data/sample-mocha-junit-results.xml
DASHBOARD_TITLE=My Test Report
GENERATE_DASHBOARD=true
AUTO_OPEN_DASHBOARD=false
AI_TIMEOUT=120000
```

### Production (.env.production)

```env
OLLAMA_BASE_URL=http://ollama-server:11434
OLLAMA_MODEL=mistral
LOG_LEVEL=info
GENERATE_DASHBOARD=false
AUTO_OPEN_DASHBOARD=false
AI_TIMEOUT=300000
```

---

## Usage Patterns

### Pattern 1: Full Analysis Workflow

```
1. Use: cucumber-analyze
   Analyze test results with AI insights

2. Use: ai-categorize-bugs
   Categorize failures by bug type

3. Use: ai-generate-suggestions
   Get improvement recommendations

4. Use: historic-save-report
   Save findings to historic data

5. Use: dashboard-generate-observability
   Create trend dashboard
```

### Pattern 2: Quick Health Check

```
1. Use: cucumber-get-summary
   Get quick test metrics

2. Use: dashboard-get-metrics
   Check system health score

3. Use: utility-check-ollama-connection
   Verify AI service availability
```

### Pattern 3: Detailed Investigation

```
1. Use: cucumber-process-results
   Get structured test data

2. Use: cucumber-query
   Ask specific questions:
   - "What tests are timing out?"
   - "Which features have highest failure rate?"
   - "What are the most common error types?"

3. Use: ai-chat-query
   Get conversational analysis
```

---

## Verification Steps

### 1. Verify Server Starts

```bash
cd mcp-server
npm run build
node dist/index.js
# Should output: 🚀 Test Analyzer MCP Server started
```

### 2. Verify Ollama Connection

In Kiro, use tool: `utility-check-ollama-connection`

Expected output:
```json
{
  "success": true,
  "connected": true,
  "ollamaBaseUrl": "http://localhost:11434",
  "model": "mistral",
  "message": "Ollama is running and model is available"
}
```

### 3. Verify Test Data Access

Use tool: `cucumber-get-summary` with your test results file path

Expected output: Summary with test metrics

### 4. Verify AI Analysis

Use tool: `cucumber-analyze` with `includeAiAnalysis: true`

Expected output: Analysis results from AI model

---

## Common Issues & Solutions

### Issue: "Cannot find module"

**Solution**: Ensure MCP server is built:
```bash
npm run build
```

### Issue: "Ollama is not running"

**Solution**: Start Ollama service:
```bash
ollama serve
```

Then pull the model:
```bash
ollama pull mistral
```

### Issue: "ChatbotService not available"

**Solution**: This tool requires OpenAI API key. Either:
- Set `OPENAI_API_KEY` environment variable, or
- Use Ollama-only tools (don't require OpenAI)

### Issue: Server connects but tools timeout

**Solution**: Increase AI timeout:
```env
AI_TIMEOUT=300000  # 5 minutes
```

### Issue: Historic data not found

**Solution**: Run analysis first to generate historic data:
```
1. Use: cucumber-analyze
2. Use: historic-save-report
3. Then use dashboard tools
```

---

## Advanced Configuration

### Custom Ollama Models

Use a different Ollama model:

```env
OLLAMA_MODEL=llama2
# or
OLLAMA_MODEL=neural-chat
# or
OLLAMA_MODEL=orca-mini
```

### Remote Ollama Server

Connect to remote Ollama instance:

```env
OLLAMA_BASE_URL=http://ollama.company.com:11434
```

### Azure OpenAI

Use Azure OpenAI instead of OpenAI:

```env
AZURE_OPENAI_API_KEY=your_azure_key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_MODEL=gpt-4
```

### Longer Analysis Timeouts

For large test suites:

```env
AI_TIMEOUT=600000  # 10 minutes
```

---

## Deployment Checklist

- [ ] Node.js 18+ installed
- [ ] MCP server built: `npm run build`
- [ ] Ollama running and model available
- [ ] Environment variables configured
- [ ] Test results files accessible
- [ ] MCP configuration added to consuming project
- [ ] Connections verified with utility tools
- [ ] Test analysis completed successfully

---

## Next Steps

1. **Run your first analysis**: Use `cucumber-analyze` with your test results
2. **Explore AI features**: Try `ai-chat-query` with custom questions
3. **Generate dashboards**: Use `dashboard-generate-observability` for trends
4. **Set up automation**: Configure hooks in your project to auto-analyze results

For questions or issues, refer to the main README.md or project documentation.
