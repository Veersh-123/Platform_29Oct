# Quick Start Guide

Get the Test Analyzer MCP Server running in 5 minutes.

## Prerequisites

- Node.js 18+
- Ollama running (`ollama serve`)
- Ollama model installed (`ollama pull mistral`)

## Step 1: Build the Server (2 min)

```bash
cd mcp-server

# Install dependencies
npm install

# Build TypeScript
npm run build
```

## Step 2: Configure Environment (1 min)

Copy environment template:
```bash
cp .env.example .env
```

The defaults should work. If you need OpenAI features, add:
```
OPENAI_API_KEY=sk-your_api_key
```

## Step 3: Test the Server (30 sec)

```bash
# Start server
node dist/index.js

# You should see:
# 🚀 Test Analyzer MCP Server started
```

Press `Ctrl+C` to stop.

## Step 4: Integrate with Kiro (1 min)

1. In your Kiro workspace, find or create `.kiro/settings/mcp.json`

2. Add this configuration:

```json
{
  "mcpServers": {
    "test-analyzer": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/dist/index.js"],
      "env": {
        "OLLAMA_BASE_URL": "http://localhost:11434",
        "OLLAMA_MODEL": "mistral"
      }
    }
  }
}
```

Replace `/absolute/path/to` with the actual path.

3. Reconnect MCP servers in Kiro (Command Palette → "Reconnect MCP Servers")

## Step 5: Use It! (30 sec)

In Kiro chat, try:

```
Check if Ollama is connected using the utility-check-ollama-connection tool
```

Or:

```
Analyze these test results: 
Use the cucumber-analyze tool with resultsPath set to ../data/sample-cucumber-results.json
```

## That's It!

You now have the MCP server running. Here are some common next steps:

### Run Quick Analysis
```
Use cucumber-get-summary with ../data/sample-cucumber-results.json
```

### Get AI Insights
```
Use cucumber-analyze with includeAiAnalysis: true on your test results
```

### Generate Dashboard
```
Use dashboard-generate-observability
```

### Ask Custom Questions
```
Use cucumber-query to ask: "What are the most common failure patterns?"
```

## Troubleshooting

### "Cannot find module"
```bash
cd mcp-server
npm run build
```

### "Ollama is not running"
```bash
# In another terminal
ollama serve
ollama pull mistral
```

### "MCP server not showing in Kiro"
- Check file path in `.kiro/settings/mcp.json` is absolute
- Reconnect servers in Kiro
- Check for TypeScript compilation errors: `npm run type-check`

### "ChatbotService not available"
- This just means OPENAI_API_KEY is not set
- That's fine, Ollama tools still work
- Set the key if you want advanced AI features

## Common Tools

| Goal | Tool | Command |
|------|------|---------|
| Quick test summary | `cucumber-get-summary` | Pass rate, total tests |
| Full analysis with AI | `cucumber-analyze` | Detailed insights + suggestions |
| Identify bug types | `ai-categorize-bugs` | Product bugs, automation issues, etc |
| Get suggestions | `ai-generate-suggestions` | Improvement recommendations |
| View trends | `dashboard-get-metrics` | System health score, pass rate trends |
| Create dashboard | `dashboard-generate-observability` | Interactive HTML dashboard |
| Ask a question | `cucumber-query` | "Why are tests failing?" |
| Chat with AI | `ai-chat-query` | Conversational analysis |

## Next Steps

1. Read **README.md** for full API reference
2. Read **SETUP.md** for advanced configuration
3. Check **INTEGRATION_EXAMPLES.md** for code examples
4. Explore tools in Kiro chat

## Need Help?

- **README.md** - Complete documentation
- **SETUP.md** - Detailed setup guide
- **INTEGRATION_EXAMPLES.md** - 8+ real examples

---

**Status**: ✅ You're ready to analyze tests with AI!

Start by analyzing your test results and asking the AI for insights.
