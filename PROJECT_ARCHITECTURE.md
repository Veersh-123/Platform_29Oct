# Orchestrator Platform - Architecture Analysis

## 📋 Project Overview

**Name:** Orchestrator Platform Automation  
**Version:** 2.0.0  
**Framework:** Playwright with TypeScript  
**Type:** Enterprise-Grade Test Automation Framework with Self-Healing Capabilities  
**Port:** 4000 (Dashboard API Server)

---

## 🏗️ High-Level Architecture

```
Orchestrator Platform
├── Backend (Node.js Express)
│   ├── Port: 4000
│   ├── Entry: server/index.js
│   └── Serves: API + Static HTML Dashboard
├── Frontend Web App (React + Vite)
│   ├── Port: 5173 (dev) or included in Express static
│   ├── Entry: web/src/App.jsx
│   └── UI: Tailwind CSS + Lucide Icons
└── Playwright Test Suite
    ├── Config: playwright.config.ts
    ├── Tests: tests/*.spec.ts
    ├── Page Objects: pages/*.ts
    ├── Locators: Locators/*.ts
    └── Test Data: Test_Data/*.json
```

---

## 📂 Directory Structure

### Root Level
- **`.env` / `.env.example`** - Environment configuration (Jira, ADO, AI providers)
- **`package.json`** - Root dependencies (Playwright, TypeScript, etc.)
- **`playwright.config.ts`** - Playwright configuration
- **`tsconfig.json`** - TypeScript configuration

### `/server` - Backend API (Port 4000)
- **`index.js`** - Main Express server
  - Serves static files (HTML dashboard)
  - REST API endpoints
  - SSE streams for test execution
  - Playwright HTML reports integration
- **`test-automation-generator.js`** - Generates test automation from specs
- **`advanced-automation-generator.js`** - AI-powered test generation
- **`knowledge-graph.js`** - Application context mapping
- **`package.json`** - Server dependencies (Express, Cors, Axios, etc.)

### `/web` - Active React Web Interface
- **`src/App.jsx`** - Root React component
- **`src/components/`** - Dashboard tabs, including manual test-case generation, test-script generation, and User Settings.
- **`vite.config.js`** - Proxies `/api` requests to the Express server on port 4000.
- The Express server serves the built React app from `web/dist` at `/app` (and at `/` when available).

The root HTML dashboards remain available as legacy/static interfaces. `dashboard/web` is a separate frontend copy; the production React app currently built and served by `server/index.js` is the root `web` directory.

### LLM request flow
- `server/llm-config.js` resolves the selected provider from the root `.env` (`LLM_PROVIDER`, with legacy `AI_PROVIDER` compatibility).
- `server/copilot-provider.js` connects through the GitHub Copilot SDK and local Copilot CLI runtime. The runtime must be authenticated with `/login`; SDK sessions have tools disabled and use the Copilot default model unless `COPILOT_MODEL` is set.
- `GET /api/llm/status` exposes only provider/model/authentication status; API keys are never included.
- `POST /api/llm/connect` verifies provider credentials/authentication on the backend and persists the selected provider/model/key to the root `.env`.
- The Planner, test-script generation, and healing routes obtain their credentials and model through the same configuration resolver and call the provider server-side.
- The dashboard's top-level AI Settings tab reads the safe status endpoint and can verify/update the project's Groq, OpenAI, Claude, or Copilot configuration. The selected provider and readiness are also shown in the dashboard header; the browser never receives a stored API key.
- GitHub Copilot is authenticated through the local Copilot CLI and selected as the project provider through backend configuration; the dashboard login remains separate.
- Dry Run failure inspection uses a headless browser by default so healing does not open an extra visible window (`HEALER_HEADLESS=false` opts into a visible inspection browser). Playwright repairs are applied to source and verified by rerunning the test from the beginning; the test runner does not resume at the failed action or keep its browser open after completion.
- Live repair snapshots include text-matched actionable ancestors, including generic elements identified by pointer cursor, role, tabindex, or click handler. Locator names from imported locator sources are included as inspection hints so a static section heading can be distinguished from an unlabeled clickable item card.
- Dry Run retry settings are controlled by `PLAYWRIGHT_RETRIES` (Playwright retries per test cycle) and `HEALER_MAX_RETRIES` (verified repair-and-rerun cycles). `TOTAL_RETRIES_PER_TESTCASE` records the maximum execution count, calculated as `(PLAYWRIGHT_RETRIES + 1) * (HEALER_MAX_RETRIES + 1)`. Automation Studio displays the configured values and maximum test executions.
- Per-run HTML report names use `<story>_<test-case>_DD-MM-YY-HH-MM-SS.html`, for example `RCND-1_TC_P01_26-10-26-15-35-40.html`.
- The Copilot SDK requires Node.js `^20.19.0 || >=22.12.0`. VS Code's Copilot Chat model selection is not automatically shared with SDK sessions; the SDK uses the Copilot CLI's authenticated account and default/explicit session model.
  - **`index.html`** - Vite entry point
  - **`vite.config.js`** - Vite bundler config
  - **`postcss.config.cjs`** - Tailwind CSS pipeline
  - **`jest.config.js`** - Test runner config

### `/tests` - Playwright Test Specifications
- **`*.spec.ts`** - Test files following Playwright convention
- Tests use Page Object Model (POM)
- Import page objects and test data
- Structured with `test.describe()` and `test()`

### `/pages` - Page Object Models
- **`*.ts`** - Page object implementations
- Encapsulate UI interactions and locators
- Self-healing capabilities for locator changes
- Methods for common operations on each page

### `/locators` - Element Locators
- **`*.ts`** - Locator definitions
- Centralized element selectors
- Supports multiple selector strategies
- Used by page objects

### `/Test_Data` - Test Data Files
- **`*.json`** - Test data in JSON format
- Referenced by test files
- Editable through dashboard API

### `/specs` - Specification Files
- **`*.md`** - Business requirements in Markdown
- `## Test Case ID: TC_xxx` format
- Parsed and converted to test cases
- Example: `KAN-1-TEST-CASES.md`

### `/Jira_Connector` - Jira Integration
- **`upload-artifacts.ts`** - Upload test results to Jira
- **`upload-specs-to-jira.ts`** - Upload specs as test cases
- **`story-context.json`** - Current story metadata
- API token & URL configuration in `.env`

### `/ADO_Connector` - Azure DevOps Integration
- **`ai-agent-service.ts`** - AI agent integration
- **`story-connector.ts`** - ADO story linking
- **`guardrails.ts`** - Safety guardrails for automation
- **`logger.ts`** - Logging utilities

### `/observability` - Monitoring & Reporting
- MCP server for test insights
- Test metrics collection
- Performance monitoring

### `/AppContext` - Application Knowledge Base
- **`AppContext.md`** - Application documentation
- **`knowledge-graph.json`** - Mapped application structure (pages, flows, elements)

---

## 🚀 Server Endpoints (Port 4000)

### Dashboard & Metadata
- **`GET /`** - Serve main dashboard HTML
- **`GET /api/stats`** - Test statistics & project metadata
- **`GET /api/structure`** - Project file structure

### Test Management
- **`GET /api/tests`** - List all test files
- **`GET /api/specs`** - Parse markdown specs into test cases
- **`GET /api/results`** - Playwright HTML test results
- **`GET /api/parse-test-file?file=...`** - Extract test names from a file

### Test Execution
- **`POST /api/run-tests`** - Run all tests (SSE stream)
- **`POST /api/run-tests/file`** - Run specific test file (SSE stream)
- **`POST /api/run-mobile-tests`** - Run mobile tests on BrowserStack
- **`GET /api/mobile-results`** - Mobile test results

### Test Data Management
- **`GET /api/testdata`** - Fetch all test data files
- **`PUT /api/testdata/:file`** - Update test data JSON

### Jira Integration
- **`GET /api/jira/config`** - Jira configuration status
- **`GET /api/jira/projects`** - List Jira projects
- **`GET /api/jira/board`** - Get sprint board
- **`GET /api/jira/issue/:key`** - Get specific issue
- **`POST /api/manual-test-cases/generate`** - Generate test cases from story

### Playwright HTML reports
- Playwright writes CLI-run reports to `playwright-report/`.
- Dashboard test runs store reports under `playwright-reports/` and expose the latest run summary through `GET /api/results`.

---

## 🔧 Technology Stack

### Backend
- **Node.js** with Express.js
- **TypeScript** for type safety
- **Cors** for cross-origin requests
- **Axios** for HTTP requests
- **Dotenv** for environment management

### Frontend
- **React 18.2** - UI framework
- **Vite 5** - Fast build tool
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Icon library
- **Axios** - HTTP client
- **Jest** - Testing framework

### Testing & Automation
- **Playwright 1.63** - Browser automation
- **TypeScript 5** - Language support
- **Playwright HTML reports** - Test reporting
- **Winston** - Logging

### Integrations
- **Jira API** - Issue tracking
- **Azure DevOps API** - Project management
- **OpenAI / Groq** - AI-powered test generation
- **BrowserStack** - Cross-device testing

### Observability
- **Model Context Protocol (MCP)** - LLM integration
- **Playwright test reporting** - Test analytics
- **Healing Logs** - Self-healing diagnostics

---

## 📊 Key Features

### 1. **Pure Page Object Model (POM)**
- Encapsulated page interactions
- Centralized locator management
- Reduces test maintenance

### 2. **Self-Healing Capabilities**
- Automatic locator repair
- Healing session logs
- Popup handler for overlays

### 3. **Test Automation Generation**
- AI-powered from specifications
- Manual test case conversion
- Story-driven test creation

### 4. **Dashboard UI**
- Real-time test execution monitoring
- Test data editor
- Spec file viewer
- Jira integration panel
- Test metrics & reports

### 5. **Playwright HTML reporting**
- Detailed test reports
- Test history
- Trend analysis
- Failure diagnostics

### 6. **CI/CD Integration**
- Story-driven automation
- Artifact upload to Jira/ADO
- GitHub Actions ready

---

## 🔄 Data Flow

```
1. User Input (Dashboard)
        ↓
2. API Request (Express Server)
        ↓
3. Test File Processing (Parse/Execute)
        ↓
4. Browser Automation (Playwright)
        ↓
5. Result Capture (Playwright test results)
        ↓
6. Dashboard Display (SSE Stream or API)
        ↓
7. Jira/ADO Update (Optional)
```

---

## 🎯 Environment Configuration (.env)

### Server
- `PORT=4000` - API server port
- `NODE_ENV=development|production`
- `CORS_ORIGIN=*` - CORS settings

### Application Testing
- `BASE_URL` - Application URL to test
- `TIMEOUT=30000` - Test timeout
- `PLAYWRIGHT_HEADLESS=true` - Browser mode

### Jira Integration
- `JIRA_BASE_URL` - Jira instance URL
- `JIRA_EMAIL` - Jira username
- `JIRA_API_TOKEN` - API token
- `JIRA_STORY1_STORY=KAN-1` - Current story

### Azure DevOps
- `ADO_ORG_URL` - ADO organization
- `ADO_PROJECT` - Project name
- `ADO_PAT` - Personal access token

### AI Integration
- `LLM_PROVIDER=openai|groq` - Selected AI provider
- `OPENAI_API_KEY` - OpenAI key
- `OPENAI_MODEL=gpt-4o` - Model selection
- `GROQ_API_KEY` - Groq API key
- `GROQ_MODEL=llama-3.3-70b-versatile`

---

## 📦 NPM Scripts

### Dashboards & Servers
- `npm run dashboard` - Start API server (port 4000)
- `npm run dashboard:web` - Start React dev server (port 5173)

### Playwright Tests
- `npm run pw:test` - Run all tests
- `npm run pw:test:headed` - Run with visible browser
- `npm run pw:test:debug` - Debug mode
- `npm run pw:test:ui` - Playwright UI mode

### Test Reports
- `npx playwright test` - Run tests and generate the Playwright HTML report
- `npx playwright show-report` - Open generated report

### Jira/ADO Uploads
- `npm run upload:artifacts` - Upload results to Jira
- `npm run upload:specs` - Upload specs as test cases

### Linting & Formatting
- `npm run lint` - Run ESLint
- `npm run format` - Prettier format

---

## 🔌 How to Use

### Start Dashboard Server (Port 4000)
```bash
npm install                  # Install dependencies
npm run dashboard           # Start server on http://localhost:4000
```

### Access Dashboard
- **Main Dashboard**: `http://localhost:4000`
- **React Frontend**: Can be served by Express or run separately
- **API Base**: `http://localhost:4000/api/...`

### Run Tests
- Via Dashboard UI → Click "Run Tests"
- Via CLI: `npm run pw:test`
- Via CLI (specific file): `npx playwright test tests/specific.spec.ts`

### View Reports
```bash
npx playwright test
npx playwright show-report
```

---

## 🎓 Development Workflow

1. **Define Specs** → Create `.md` files in `/specs/`
2. **Create Tests** → Write `.spec.ts` in `/tests/`
3. **Build Page Objects** → Implement in `/pages/`
4. **Add Test Data** → JSON files in `/Test_Data/`
5. **Run Tests** → Via Dashboard or CLI
6. **View Results** → Playwright HTML reports
7. **Update Jira** → Auto-upload or manual

---

## 📝 Notes

- **Port 4000** is the main API/Dashboard server
- Tests run in **headless** mode by default (configurable)
- Results stored in `test-results/` directory
- Reports generated to `playwright-report/` directory
- Page objects use **CSS selectors** (can be extended)
- Self-healing tracks locator changes in `healing-logs/`
- Jira token is stored in `.env` (never commit sensitive data)

---

## 🔗 Related Files
- `.env.example` - Configuration template
- `playwright.config.ts` - Playwright settings
- `tsconfig.json` - TypeScript compilation options
- `package.json` - Dependencies and scripts
- `.github/agents/*.md` - Agent documentation for automation orchestration
