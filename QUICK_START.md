# Quick Start Guide - Gemini Test Case Generator

Get up and running in 5 minutes.

## Prerequisites

- Node.js 14+ installed
- Gemini API key from [https://ai.google.dev/](https://ai.google.dev/)

## Setup (5 minutes)

### 1. Install Dependencies (1 minute)

```bash
npm install @google/generative-ai express cors dotenv
```

Or use the provided package.json:
```bash
cp package-test-case-generator.json package.json
npm install
```

### 2. Configure API Key (1 minute)

Edit `.env` file:
```env
GEMINI_API_KEY=your_actual_api_key_here
```

### 3. Start Backend (1 minute)

```bash
npm start
```

Expected output:
```
╔═══════════════════════════════════════════════════════════════╗
║     Test Case Generator Server - Powered by Gemini LLM        ║
╚═══════════════════════════════════════════════════════════════╝

📍 Server running at: http://localhost:3000
```

### 4. Verify Setup (1 minute)

```bash
# Open new terminal
curl http://localhost:3000/api/test-case-generator/verify
```

Should return:
```json
{
  "status": "verified",
  "message": "Gemini API is properly configured",
  "model": "gemini-1.5-flash"
}
```

### 5. Update HTML (1 minute)

In `Orchestrator-Platform.html`:

**A.** Add script before `</body>`:
```html
<script src="test-case-generator-ui.js"></script>
```

**B.** Add button to Test Design header:
```html
<button id="generateTestCasesBtn" class="generate-btn">
  <span>✨</span> Generate Test Cases
</button>
```

**C.** Add container for test cases:
```html
<div id="testCasesContainer" style="margin-top: 30px;"></div>
```

## Usage

1. Open Orchestrator Platform in browser
2. Go to Test Design tab
3. Select a Jira story with acceptance criteria
4. Click "Generate Test Cases"
5. Review and export generated test cases

## Files

| File | Purpose |
|------|---------|
| `test-case-generator-ui.js` | Frontend UI integration |
| `gemini-test-case-generator.js` | Gemini API integration |
| `test-case-api.js` | Express API routes |
| `server-setup.js` | Express server config |
| `.env` | Configuration (API keys) |

## API Endpoints

```bash
# Health check
GET http://localhost:3000/health

# Generate test cases
POST http://localhost:3000/api/test-cases/generate
Content-Type: application/json

{
  "storyId": "PROJ-123",
  "storyTitle": "Login Feature",
  "acceptanceCriteria": "User can login with valid credentials",
  "description": "Optional description"
}

# Verify Gemini setup
GET http://localhost:3000/api/test-case-generator/verify
```

## Common Issues

| Issue | Solution |
|-------|----------|
| "GEMINI_API_KEY not configured" | Add key to `.env` file |
| "Cannot GET /..." | Backend not running - run `npm start` |
| "Failed to generate" | Check API key and try simpler acceptance criteria |
| Button not showing | Check HTML added correctly, reload page |

## Next Steps

- ✅ See `INTEGRATION_GUIDE.md` for detailed setup
- ✅ See `HTML_INTEGRATION_SNIPPET.md` for HTML changes
- ✅ Customize test case generation prompts in `gemini-test-case-generator.js`

## Support

For detailed troubleshooting, see:
- `INTEGRATION_GUIDE.md` - Complete setup guide
- `HTML_INTEGRATION_SNIPPET.md` - HTML integration details
- Server logs - Run `npm start` for detailed error messages

---

**Ready?** Run `npm start` and you're good to go! 🚀
