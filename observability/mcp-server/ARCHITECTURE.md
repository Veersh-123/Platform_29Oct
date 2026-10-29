# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    External Consumers                        │
├──────────────────────┬──────────────────────┬────────────────┤
│   Kiro IDE Chat      │  CI/CD Pipelines     │  Custom Apps   │
│   (via MCP)          │  (HTTP/Node.js)      │  (Node.js)     │
└──────────────────────┴──────────────────────┴────────────────┘
                              │
                              │ MCP Protocol / Direct Import
                              │
┌─────────────────────────────────────────────────────────────┐
│              MCP Server (mcp-server/src/index.ts)            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Tool Orchestrator (TestAnalyzerTools)                │  │
│  │  - Routes tool calls to appropriate handlers          │  │
│  │  - Manages 25+ tools across 6 categories              │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                 ┌────────────┼────────────┐
                 │            │            │
                 ▼            ▼            ▼
        ┌─────────────┐ ┌────────────┐ ┌──────────┐
        │   Tools     │ │  Config    │ │  Lib     │
        │ (6 groups)  │ │  Manager   │ │ Re-exp.  │
        └─────────────┘ └────────────┘ └──────────┘
                 │                         │
    ┌────────────┼────────────┐            │
    │            │            │            │
    ▼            ▼            ▼            ▼
┌────────┐ ┌─────────┐ ┌──────────┐ ┌────────────────┐
│Cucumber│ │ JUnit   │ │ AI       │ │ Historic/      │
│Tools   │ │ Tools   │ │ Insights │ │ Dashboard      │
└────────┘ └─────────┘ └──────────┘ └────────────────┘
    │            │            │               │
    └────────────┴────────────┴───────────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
    ▼            ▼            ▼
┌─────────┐ ┌──────────┐ ┌─────────────────┐
│ Readers │ │Analyzers │ │ Services        │
│         │ │          │ │ (AI, Chatbot,   │
│ Cuc.    │ │ Cuc.     │ │  Historic,      │
│ JUnit   │ │ JUnit    │ │  Observability) │
└─────────┘ └──────────┘ └─────────────────┘
    │            │              │
    └────────────┴──────────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
    ▼            ▼            ▼
┌──────────┐ ┌────────────┐ ┌────────────┐
│  Ollama  │ │  OpenAI    │ │Local Files │
│(LLM AI)  │ │(Chat/GPT)  │ │(History)   │
└──────────┘ └────────────┘ └────────────┘
```

## Tool Categories & Hierarchy

```
TestAnalyzerTools (Main Orchestrator)
│
├─ CucumberAnalyzerTools (4 tools)
│  ├─ cucumber-analyze
│  ├─ cucumber-get-summary
│  ├─ cucumber-process-results
│  └─ cucumber-query
│
├─ JUnitAnalyzerTools (4 tools)
│  ├─ junit-analyze
│  ├─ junit-get-summary
│  ├─ junit-process-results
│  └─ junit-query
│
├─ AIInsightsTools (4 tools)
│  ├─ ai-chat-query
│  ├─ ai-categorize-bugs
│  ├─ ai-generate-suggestions
│  └─ ai-get-welcome-message
│
├─ HistoricDataTools (3 tools)
│  ├─ historic-get-summary
│  ├─ historic-get-all-data
│  └─ historic-save-report
│
├─ DashboardTools (5 tools)
│  ├─ dashboard-generate-observability
│  ├─ dashboard-get-metrics
│  ├─ dashboard-export-data
│  ├─ dashboard-generate-summary
│  └─ dashboard-validate-prerequisites
│
└─ UtilityTools (4 tools)
   ├─ utility-check-ollama-connection
   ├─ utility-get-server-info
   ├─ utility-list-available-tools
   └─ utility-get-config
```

## Data Flow Example: Cucumber Analysis

```
User Input
│
├─ Tool: cucumber-analyze
├─ Args: { resultsPath: "./results.json", includeAiAnalysis: true }
│
▼
CucumberAnalyzerTools
│
├─ Create CucumberResultsReader
├─ Create ResultsAnalyzer
├─ Create AiAnalysisService
│
├─ 1. readResults(resultsPath)
│   └─▶ JSON File ──parse──▶ Raw Results
│
├─ 2. processResults(rawResults)
│   └─▶ Analyze + Categorize ──▶ ProcessedResults
│       ├─ Summary (pass rate, totals)
│       ├─ Failed Scenarios
│       └─ Bug Analysis
│
├─ 3. analyzeTestResults(processedResults)
│   └─▶ Ollama Service
│       ├─ Format prompt
│       ├─ Send to Ollama
│       └─ Parse response
│
▼
Return Results to Client
│
├─ Summary metrics
├─ Failed scenarios list
├─ Bug analysis
└─ AI analysis text
```

## Service Integration

```
┌─────────────────────────────────────────────────────────────┐
│                  Parent Project Services                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  AiAnalysisService             ChatbotService               │
│  ├─ checkConnection()           ├─ processQuery()           │
│  ├─ analyzeTestResults()        ├─ categorizeBugTypes()    │
│  ├─ generateTestSuggestions()   └─ generateWelcomeMessage()│
│  └─ sendCustomQuery()                                       │
│                                                              │
│  HistoricDataService           ObservabilityDashboardServ.  │
│  ├─ saveReport()               ├─ generateDashboard()      │
│  ├─ getHistoricData()          ├─ getQuickMetrics()       │
│  └─ getHistoricSummary()       ├─ exportDashboardData()    │
│                                └─ validatePrerequisites()  │
│                                                              │
│  CucumberResultsReader         JUnitResultsReader          │
│  ├─ readResults()              ├─ readResults()            │
│  └─ getFileInfo()              └─ getFileInfo()            │
│                                                              │
│  ResultsAnalyzer               JUnitResultsAnalyzer        │
│  ├─ processResults()           ├─ processResults()         │
│  └─ categorizeFailures()       └─ analyzePerformance()    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
        △ Used by all MCP Tools
        │
        └─ Imported via Re-export Pattern
           (mcp-server/src/lib/*)
```

## Configuration Flow

```
Environment (.env)
│
├─ OLLAMA_BASE_URL
├─ OLLAMA_MODEL
├─ OPENAI_API_KEY
├─ LOG_LEVEL
├─ CUCUMBER_RESULTS_PATH
├─ JUNIT_RESULTS_PATH
└─ ... other settings
│
▼
loadConfig() (app.config.ts)
│
├─ Read environment variables
├─ Apply defaults
└─ Return AppConfig object
│
▼
Service Initialization
│
├─ AiAnalysisService(config.ai)
├─ HistoricDataService(outputPath)
├─ ChatbotService() [if OpenAI key]
└─ ObservabilityDashboardService()
│
▼
Tools Ready to Use
```

## Tool Execution Pipeline

```
MCP Request
│
▼
index.ts (StdioServerTransport)
│
├─ Parse MCP protocol message
├─ Extract tool name and arguments
│
▼
TestAnalyzerTools.executeTool(toolName, args)
│
├─ Route based on tool name prefix:
│  ├─ "cucumber-*" ──▶ CucumberAnalyzerTools
│  ├─ "junit-*" ──────▶ JUnitAnalyzerTools
│  ├─ "ai-*" ─────────▶ AIInsightsTools
│  ├─ "historic-*" ───▶ HistoricDataTools
│  ├─ "dashboard-*" ──▶ DashboardTools
│  └─ "utility-*" ────▶ UtilityTools
│
▼
Tool Handler
│
├─ Validate arguments
├─ Call service method(s)
├─ Process results
└─ Handle errors
│
▼
Return Response
│
├─ Format as MCP JSON
├─ Include success/error status
└─ Send back to client
```

## File Structure Detail

```
mcp-server/
│
├─ src/
│  │
│  ├─ index.ts ◄────────────────────── MCP Server Entry
│  │   ├─ StdioServerTransport
│  │   ├─ TestAnalyzerTools initialization
│  │   └─ Tool request handlers
│  │
│  ├─ config/
│  │  └─ app.config.ts ◄─────────────── Configuration
│  │      ├─ loadConfig()
│  │      └─ validateConfig()
│  │
│  ├─ tools/
│  │  ├─ base-tool.ts ◄─────────────── Base Class
│  │  ├─ index.ts ◄────────────────── Orchestrator
│  │  ├─ cucumber.ts ◄─────────────── Cucumber Tools
│  │  ├─ junit.ts ◄────────────────── JUnit Tools
│  │  ├─ ai-insights.ts ◄──────────── AI Tools
│  │  ├─ historic-data.ts ◄────────── Historic Tools
│  │  ├─ dashboard.ts ◄────────────── Dashboard Tools
│  │  └─ utility.ts ◄─────────────── Utility Tools
│  │
│  └─ lib/
│     ├─ services/
│     │  ├─ ai-analysis.service.ts ◄──────────── Re-export
│     │  ├─ chatbot.service.ts ◄─────────────── Re-export
│     │  ├─ historic-data.service.ts ◄────────── Re-export
│     │  └─ observability-dashboard.service.ts ◄ Re-export
│     │
│     ├─ readers/
│     │  ├─ cucumber-reader.ts ◄────────────── Re-export
│     │  └─ junit-reader.ts ◄──────────────── Re-export
│     │
│     └─ analyzers/
│        ├─ results-analyzer.ts ◄───────────── Re-export
│        └─ junit-analyzer.ts ◄────────────── Re-export
│
├─ dist/ ◄──────────────────────────── Compiled Output
│  └─ [Built from src/]
│
├─ package.json
├─ tsconfig.json
├─ .env.example
├─ README.md
├─ SETUP.md
├─ QUICK_START.md
├─ INTEGRATION_EXAMPLES.md
└─ ARCHITECTURE.md (this file)
```

## Deployment Architecture

```
Development
│
├─ npm run dev
├─ Local Ollama instance
└─ Direct file access

Production
│
├─ Docker Container
├─ Remote Ollama service
├─ Remote file storage
└─ CI/CD integration
```

## Key Design Decisions

1. **Re-export Pattern**
   - MCP server re-exports from parent project
   - No code duplication
   - Shared services and types
   - Single source of truth

2. **Tool Organization**
   - Each category (cucumber, junit, etc.) is self-contained
   - BaseTool inheritance for consistency
   - Easy to add new tools
   - Clear separation of concerns

3. **Configuration Management**
   - Environment-based configuration
   - Defaults for common scenarios
   - Validation on startup
   - Flexible for different environments

4. **Error Handling**
   - Each tool validates inputs
   - Graceful error responses
   - Comprehensive error messages
   - Non-blocking failures

5. **Extensibility**
   - New tools can be added to any category
   - New categories can be created
   - Service layer is extensible
   - Configuration is flexible

## Security Considerations

- Sensitive environment variables (API keys) not logged
- File paths validated before access
- Input validation on all tools
- No shell execution
- Sandboxed tool execution

---

For more details, see README.md and SETUP.md
