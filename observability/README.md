# Failure Analysis and Observability

A comprehensive TypeScript project for analyzing test results (Cucumber & JUnit) and generating intelligent insights using AI (Ollama or OpenAI).

## Features

- 📊 **Cucumber Results Analysis**: Parse and analyze JSON test results from Cucumber
- 🤖 **AI-Powered Insights**: Use Ollama or OpenAI to generate detailed analysis and suggestions
- 💬 **Intelligent Chatbot**: Interactive AI assistant to answer questions about your test results
- 📈 **Interactive HTML Dashboard**: Beautiful, responsive dashboard with charts and metrics
- 🐛 **Smart Bug Categorization**: Automatically categorize bugs as product vs automation issues
- 🔍 **Flaky Test Detection**: Identify potentially unreliable tests
- ⚙️ **Configurable**: Separate configuration for AI and application settings
- **Custom Queries**: Ask any question about your test results via the chatbot
- **Flexible analysis capabilities**

## Dashboard Features

The generated HTML dashboard includes:

### 📊 **Visual Metrics**
- Total features, scenarios, and steps
- Pass/fail percentages with color-coded indicators
- Interactive charts showing test distribution
- Flaky test counts and trends

### 🐛 **Smart Bug Analysis**
- **Product Bugs**: Issues related to business logic and requirements
- **Automation Bugs**: Technical issues with test scripts and infrastructure
- Automatic categorization based on error message patterns

### 📈 **Interactive Charts**
- Doughnut chart showing passed/failed/skipped test distribution
- Bar chart displaying bug categories and flaky tests
- Responsive design that works on all devices

### 🔍 **Detailed Breakdowns**
- Failed scenario details with step-by-step error information
- AI-powered analysis and recommendations
- Clean, professional styling with hover effects

### 🎨 **Modern Design**
- **Professional white background** with clean, corporate styling
- **Configurable branding** with custom title and logo support
- **Muted color palette** using professional grays, blues, and subtle accents
- **Responsive grid layouts** that work on all screen sizes
- **Clean typography** using system fonts for maximum compatibility
- **Subtle shadows and borders** for depth without distraction
- 📝 **Detailed Logging**: Comprehensive logging with configurable levels
- 🏠 **Local Processing**: All AI processing happens locally with Ollama

## Project Structure

```
green-slate-demo/
├── src/
│   ├── config/           # Configuration management
│   ├── services/         # Ollama service integration
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions (file reader, logger)
│   └── index.ts         # Main application entry point
├── examples/            # Sample Cucumber results
├── .env.example         # Environment variables template
├── package.json         # Dependencies and scripts
└── tsconfig.json        # TypeScript configuration
```

## Prerequisites

1. **Install Ollama**: Download and install Ollama from [https://ollama.ai](https://ollama.ai)

2. **Pull a model**: Install a language model (e.g., llama2, codellama, or mistral):
   ```bash
   ollama pull llama2
   # or
   ollama pull codellama
   # or
   ollama pull mistral
   ```

3. **Start Ollama**: Ensure Ollama is running:
   ```bash
   ollama serve
   ```

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your settings:
   ```env
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=mistral:latest
   OLLAMA_MAX_TOKENS=2000
   OLLAMA_TEMPERATURE=0.1
   CUCUMBER_RESULTS_PATH=./examples/sample-cucumber-results.json
   LOG_LEVEL=info
   
   # Dashboard Settings
   DASHBOARD_OUTPUT_PATH=./dashboard/cucumber-dashboard.html
   DASHBOARD_AUTO_OPEN=true
   DASHBOARD_GENERATE=true
   ```

3. **Build the project**:
   ```bash
   npm run build
   ```

## Usage

### Full Analysis with Dashboard
Analyze Cucumber results with AI insights and generate interactive dashboard:
```bash
# Using default file path from config
npm run dev

# Using specific file path
npm run dev /path/to/your/cucumber-results.json
```

### Dashboard Only
Generate just the HTML dashboard without AI analysis:
```bash
npm run dev dashboard
npm run dev dashboard /path/to/your/cucumber-results.json
```

### Summary Only
Get a quick summary without AI analysis or dashboard:
```bash
npm run dev summary
npm run dev summary /path/to/your/cucumber-results.json
```

### Custom Queries
Ask specific questions about your test results:
```bash
npm run dev query "What are the most common failure patterns?"
npm run dev query "How can I improve test stability?" /path/to/results.json
```

### Production Build
```bash
npm run build
npm start
```

## Configuration

### AI Configuration
Located in `src/config/index.ts`:
- **baseUrl**: Ollama server URL (default: http://localhost:11434)
- **model**: Ollama model to use (e.g., "llama2", "codellama", "mistral")
- **maxTokens**: Maximum tokens for AI responses
- **temperature**: AI response creativity (0-2)

### Azure OpenAI Configuration
If you want to use Azure OpenAI, set `AI_PROVIDER=azure` and add the following variables:
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_API_URL`
- `AZURE_OPENAI_API_VERSION`
- `AZURE_OPENAI_MODEL`

### Application Configuration
- **cucumberResultsPath**: Default path to Cucumber JSON results
- **logLevel**: Logging level (error, warn, info, debug)

### Dashboard Configuration
- **outputPath**: Where to save the HTML dashboard
- **autoOpen**: Automatically open dashboard in browser after generation
- **generateAfterAnalysis**: Generate dashboard after AI analysis (true/false)
- **title**: Custom title for the dashboard (default: "Test Automation Report")
- **logoUrl**: URL to company logo to display in dashboard header

## Ollama Service Features

### Test Analysis
- Overall test health assessment
- Failure pattern analysis
- Root cause identification
- Improvement recommendations

### Test Suggestions
- Specific improvements for failed scenarios
- Additional test case recommendations
- Best practices guidance
- Automation improvements

### Custom Queries
- Ask any question about your test results
- Get contextual answers based on actual data
- Flexible analysis capabilities

## Sample Output

```
==================================================
TEST EXECUTION SUMMARY
==================================================
Total Features: 2
Total Scenarios: 4
Total Steps: 9
Passed Steps: 6
Failed Steps: 2
Skipped Steps: 3
Pass Rate: 66.67%
Failed Scenarios: 2
==================================================

================================================================================
AI ANALYSIS RESULTS
================================================================================
Based on the test execution results, here's my analysis:

## Overall Test Health Assessment
Your test suite shows a pass rate of 66.67%, which indicates significant room for improvement...

[Detailed AI analysis continues...]
================================================================================
```

## Example Cucumber Results Format

The application expects Cucumber JSON results in the standard format:
```json
[
  {
    "uri": "features/login.feature",
    "id": "user-login",
    "keyword": "Feature",
    "name": "User Login",
    "elements": [
      {
        "id": "user-login;successful-login",
        "keyword": "Scenario",
        "name": "Successful login with valid credentials",
        "steps": [
          {
            "keyword": "Given ",
            "name": "I am on the login page",
            "result": {
              "status": "passed",
              "duration": 1500000000
            }
          }
        ]
      }
    ]
  }
]
```

## Development

### Scripts
- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev` - Run with ts-node (development)
- `npm start` - Run compiled JavaScript (production)
- `npm run clean` - Remove build artifacts

### Adding New Features
1. Add types in `src/types/`
2. Implement services in `src/services/`
3. Add utilities in `src/utils/`
4. Update main application in `src/index.ts`

## Intelligent Chatbot

The dashboard includes an AI-powered chatbot that can answer questions about your test results in natural language.

### Features
- 🤖 **OpenAI Integration**: Powered by GPT-4o-mini for intelligent responses
- 💬 **Natural Conversations**: Ask questions in plain English
- 📊 **Context-Aware**: Understands your specific test data
- 🔄 **Conversation History**: Maintains context across multiple questions
- ⚡ **Fallback Mode**: Works with basic features even without OpenAI

### Setup
See [CHATBOT_SETUP.md](./docs/CHATBOT_SETUP.md) for detailed setup instructions.

Quick start:
```bash
# 1. Copy environment template
cp .env.example .env

# 2. Add your OpenAI API key to .env
OPENAI_API_KEY=sk-your-key-here

# 3. Start the server
npm start

# 4. Generate dashboard
npm run cucumber-ai
```

### Example Questions
- "What is the pass rate?"
- "Tell me about the bugs"
- "What are the priority actions?"
- "How can I improve test stability?"
- "Which features have the most failures?"

## Error Handling

The application includes comprehensive error handling for:
- Missing or invalid configuration
- File system errors
- Ollama API failures
- Invalid JSON formats
- Network connectivity issues

## Troubleshooting

### Ollama Connection Issues
If you get connection errors:

1. **Check if Ollama is running**:
   ```bash
   curl http://localhost:11434/api/version
   ```

2. **List available models**:
   ```bash
   ollama list
   ```

3. **Pull a model if needed**:
   ```bash
   ollama pull llama2
   ```

4. **Test model directly**:
   ```bash
   ollama run llama2 "Hello, how are you?"
   ```

### Common Error Messages
- **"Cannot connect to Ollama"**: Ensure Ollama is running on the specified URL
- **"Model not available"**: The specified model isn't installed, use `ollama pull <model-name>`
- **"Timeout"**: The model response took too long, try a smaller model or reduce max_tokens

## License

ISC License
