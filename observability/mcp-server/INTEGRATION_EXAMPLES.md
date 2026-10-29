# Integration Examples

Real-world examples of integrating and using the Test Analyzer MCP Server.

## Example 1: Kiro Chat Integration

### Scenario: Analyze Recent Test Failures

**In Kiro Chat:**

```
Analyze our test results and tell me what's wrong. 
Use the cucumber-analyze tool with results from ./data/sample-cucumber-results.json
```

**Agent will:**
1. Execute `cucumber-analyze` tool
2. Provide AI analysis of failures
3. Show pass rate, failed scenarios, and error patterns
4. Suggest next steps

### Scenario: Get Detailed Failure Report

```
I need a detailed report on why tests are failing.
1. Use cucumber-process-results with ./data/sample-cucumber-results.json
2. Categorize the bugs using ai-categorize-bugs
3. Generate improvement suggestions with ai-generate-suggestions
```

**Result:**
- Structured test data
- Failures categorized by type
- Actionable improvement recommendations

---

## Example 2: CI/CD Pipeline Integration

### GitHub Actions Workflow

Create `.github/workflows/test-analysis.yml`:

```yaml
name: Test Analysis

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  test-analysis:
    runs-on: ubuntu-latest
    
    services:
      ollama:
        image: ollama/ollama
        options: >-
          --health-cmd "ollama list"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        volumes:
          - ollama_data:/root/.ollama

    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install MCP Server
        run: |
          cd mcp-server
          npm install
          npm run build
      
      - name: Pull Ollama Model
        run: |
          docker exec ${{ job.services.ollama.id }} ollama pull mistral
      
      - name: Run Tests
        run: npm test
      
      - name: Analyze Test Results
        run: |
          node -e "
            const { TestAnalyzerTools } = require('./mcp-server/dist/index.js');
            const tools = new TestAnalyzerTools();
            tools.executeTool('cucumber-analyze', {
              resultsPath: './test-results.json',
              includeAiAnalysis: true
            }).then(result => {
              console.log(JSON.stringify(result, null, 2));
              process.exit(result.summary.failedScenarios ? 1 : 0);
            });
          "

    volumes:
      ollama_data: {}
```

---

## Example 3: Custom Analysis Script

### Using MCP Tools in Node.js

Create `analyze-tests.js`:

```javascript
import { TestAnalyzerTools } from './mcp-server/dist/index.js';

async function analyzeAndReport() {
  const tools = new TestAnalyzerTools();
  
  console.log('🚀 Starting test analysis...\n');
  
  // Step 1: Check Ollama connection
  console.log('1️⃣ Checking Ollama connection...');
  const connCheck = await tools.executeTool('utility-check-ollama-connection', {});
  if (!connCheck.connected) {
    console.error('❌ Ollama not running!');
    process.exit(1);
  }
  console.log('✅ Ollama connected\n');
  
  // Step 2: Analyze results
  console.log('2️⃣ Analyzing Cucumber results...');
  const analysis = await tools.executeTool('cucumber-analyze', {
    resultsPath: './data/sample-cucumber-results.json',
    includeAiAnalysis: true
  });
  
  console.log(`✅ Analysis complete`);
  console.log(`   Pass rate: ${analysis.summary.passRate.toFixed(2)}%`);
  console.log(`   Failed scenarios: ${analysis.failedScenarios.length}\n`);
  
  // Step 3: Categorize bugs (if OpenAI key available)
  if (process.env.OPENAI_API_KEY) {
    console.log('3️⃣ Categorizing bugs...');
    const categorization = await tools.executeTool('ai-categorize-bugs', {
      resultsPath: './data/sample-cucumber-results.json'
    });
    console.log('✅ Bug categories identified\n');
  }
  
  // Step 4: Save to history
  console.log('4️⃣ Saving report to history...');
  await tools.executeTool('historic-save-report', {
    summary: analysis.summary,
    analysis: analysis.aiAnalysis,
    fileSource: 'automated-analysis'
  });
  console.log('✅ Report saved\n');
  
  // Step 5: Generate dashboard
  console.log('5️⃣ Generating observability dashboard...');
  const dashboard = await tools.executeTool('dashboard-generate-observability', {});
  if (dashboard.success) {
    console.log(`✅ Dashboard: ${dashboard.dashboardPath}\n`);
  }
  
  console.log('🎉 Analysis complete!');
}

analyzeAndReport().catch(console.error);
```

Run with:
```bash
node analyze-tests.js
```

---

## Example 4: Real-Time Test Monitoring

### Continuous Analysis Script

Create `monitor-tests.js`:

```javascript
import { TestAnalyzerTools } from './mcp-server/dist/index.js';
import fs from 'fs';
import { watch } from 'fs';

const tools = new TestAnalyzerTools();
const RESULTS_FILE = './data/sample-cucumber-results.json';
const CHECK_INTERVAL = 5000; // 5 seconds

let lastModified = 0;

async function analyzeIfChanged() {
  try {
    const stats = fs.statSync(RESULTS_FILE);
    
    if (stats.mtimeMs > lastModified) {
      lastModified = stats.mtimeMs;
      
      console.log(`\n📊 [${new Date().toLocaleTimeString()}] New results detected. Analyzing...\n`);
      
      const summary = await tools.executeTool('cucumber-get-summary', {
        resultsPath: RESULTS_FILE
      });
      
      console.log(`✅ Pass Rate: ${summary.summary.passRate.toFixed(2)}%`);
      console.log(`❌ Failed: ${summary.failedScenariosCount}`);
      console.log(`📝 Total: ${summary.summary.totalScenarios} scenarios\n`);
      
      if (summary.failedScenariosCount > 0) {
        const fullAnalysis = await tools.executeTool('cucumber-analyze', {
          resultsPath: RESULTS_FILE,
          includeAiAnalysis: true
        });
        console.log('🤖 AI Analysis:\n', fullAnalysis.aiAnalysis.slice(0, 500) + '...\n');
      }
    }
  } catch (error) {
    console.error('Error during analysis:', error.message);
  }
}

// Start monitoring
console.log(`🔍 Monitoring ${RESULTS_FILE} for changes...\n`);
setInterval(analyzeIfChanged, CHECK_INTERVAL);

// Initial check
analyzeIfChanged();
```

Run with:
```bash
node monitor-tests.js
```

---

## Example 5: Slack Integration

### Post Test Results to Slack

Create `slack-reporter.js`:

```javascript
import { TestAnalyzerTools } from './mcp-server/dist/index.js';
import fetch from 'node-fetch';

const tools = new TestAnalyzerTools();
const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL;

async function reportToSlack() {
  try {
    const analysis = await tools.executeTool('cucumber-analyze', {
      resultsPath: './data/sample-cucumber-results.json',
      includeAiAnalysis: true
    });
    
    const metrics = await tools.executeTool('dashboard-get-metrics', {});
    
    const color = analysis.summary.passRate >= 80 ? '#36a64f' : '#ff0000';
    
    const payload = {
      attachments: [{
        color,
        title: '📊 Test Automation Report',
        fields: [
          {
            title: 'Pass Rate',
            value: `${analysis.summary.passRate.toFixed(2)}%`,
            short: true
          },
          {
            title: 'Total Tests',
            value: `${analysis.summary.totalScenarios}`,
            short: true
          },
          {
            title: 'Failed Tests',
            value: `${analysis.failedScenarios.length}`,
            short: true
          },
          {
            title: 'Health Score',
            value: `${metrics.metrics.healthScore}/100`,
            short: true
          },
          {
            title: 'AI Analysis',
            value: analysis.aiAnalysis.slice(0, 300) + '...'
          }
        ],
        timestamp: Math.floor(Date.now() / 1000)
      }]
    };
    
    await fetch(SLACK_WEBHOOK, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    
    console.log('✅ Report sent to Slack');
  } catch (error) {
    console.error('Error sending to Slack:', error);
  }
}

reportToSlack();
```

Run with:
```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/... node slack-reporter.js
```

---

## Example 6: Dashboard Generation Automation

### Auto-generate Dashboards

Create `.kiro/hooks/test-analysis-hook.json`:

```json
{
  "name": "Analyze Tests on Save",
  "version": "1.0.0",
  "description": "Run test analysis when results file changes",
  "when": {
    "type": "fileEdited",
    "patterns": ["data/sample-cucumber-results.json"]
  },
  "then": {
    "type": "askAgent",
    "prompt": "A new test results file was saved. Please:\n1. Use cucumber-analyze to get full analysis\n2. Use ai-categorize-bugs to identify bug types\n3. Use dashboard-generate-observability to create updated dashboard\n4. Summarize the key findings"
  }
}
```

---

## Example 7: API Endpoint for Test Analysis

### Express Server with MCP Tools

Create `test-analysis-api.js`:

```javascript
import express from 'express';
import { TestAnalyzerTools } from './mcp-server/dist/index.js';

const app = express();
const tools = new TestAnalyzerTools();

app.use(express.json());

// Analyze Cucumber results
app.post('/api/analyze/cucumber', async (req, res) => {
  try {
    const { resultsPath, includeAi } = req.body;
    const result = await tools.executeTool('cucumber-analyze', {
      resultsPath,
      includeAiAnalysis: includeAi !== false
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get test summary
app.get('/api/summary/:type', async (req, res) => {
  try {
    const { resultsPath } = req.query;
    const toolName = `${req.params.type}-get-summary`;
    const result = await tools.executeTool(toolName, { resultsPath });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get dashboard metrics
app.get('/api/dashboard/metrics', async (req, res) => {
  try {
    const result = await tools.executeTool('dashboard-get-metrics', {});
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Chat query
app.post('/api/chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    const result = await tools.executeTool('ai-chat-query', {
      message,
      context
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('API server running on port 3000');
});
```

Use:
```bash
curl -X POST http://localhost:3000/api/analyze/cucumber \
  -H "Content-Type: application/json" \
  -d '{"resultsPath": "./data/sample-cucumber-results.json"}'
```

---

## Example 8: Batch Analysis of Multiple Files

### Process Multiple Test Reports

Create `batch-analyze.js`:

```javascript
import { TestAnalyzerTools } from './mcp-server/dist/index.js';
import fs from 'fs';
import path from 'path';

const tools = new TestAnalyzerTools();

async function analyzeDirectory(dir) {
  const files = fs.readdirSync(dir);
  const results = [];
  
  for (const file of files) {
    if (file.endsWith('-results.json')) {
      const filePath = path.join(dir, file);
      console.log(`\n📊 Analyzing ${file}...`);
      
      try {
        const analysis = await tools.executeTool('cucumber-analyze', {
          resultsPath: filePath,
          includeAiAnalysis: true
        });
        
        results.push({
          file,
          timestamp: analysis.timestamp,
          passRate: analysis.summary.passRate,
          failed: analysis.failedScenarios.length,
          total: analysis.summary.totalScenarios
        });
        
        console.log(`✅ ${file}: ${analysis.summary.passRate.toFixed(2)}% pass rate`);
      } catch (error) {
        console.error(`❌ Error analyzing ${file}:`, error.message);
      }
    }
  }
  
  return results;
}

async function main() {
  const results = await analyzeDirectory('./test-results');
  
  // Save summary
  fs.writeFileSync(
    './batch-analysis-summary.json',
    JSON.stringify(results, null, 2)
  );
  
  // Print report
  console.log('\n\n📈 BATCH ANALYSIS SUMMARY\n');
  console.log('File                          Pass Rate    Failed/Total');
  console.log('─'.repeat(60));
  
  for (const result of results) {
    console.log(
      `${result.file.padEnd(30)} ${result.passRate.toFixed(2).padEnd(12)} ${result.failed}/${result.total}`
    );
  }
}

main().catch(console.error);
```

---

## Quick Reference

| Scenario | Tool | Usage |
|----------|------|-------|
| Quick health check | `cucumber-get-summary` | Get metrics without AI |
| Full analysis | `cucumber-analyze` | Analysis with AI insights |
| Detailed failures | `ai-categorize-bugs` | Categorize by bug type |
| Suggestions | `ai-generate-suggestions` | Get improvement ideas |
| Trends | `dashboard-get-metrics` | Historical trends |
| Dashboard | `dashboard-generate-observability` | Create visual dashboard |
| Custom question | `cucumber-query` | Ask specific questions |
| Chat | `ai-chat-query` | Conversational analysis |

---

For more examples and use cases, see the main README.md and SETUP.md files.
