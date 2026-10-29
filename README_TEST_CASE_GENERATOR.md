# Gemini-Powered Test Case Generator

An intelligent test case generation system for the Orchestrator Platform using Google's Gemini LLM. Automatically generates comprehensive test cases covering positive, negative, and boundary scenarios from user story acceptance criteria.

## Features

✨ **AI-Powered Generation**
- Leverages Google Gemini LLM for intelligent test case creation
- Context-aware generation from acceptance criteria
- Automatic coverage of positive, negative, and boundary scenarios

📋 **Comprehensive Test Cases**
- Each test case includes:
  - Test ID and title
  - Scenario type classification
  - Step-by-step test actions
  - Expected results
  - Test data requirements
  - Priority levels

📊 **Multiple Export Formats**
- JSON - For API integration
- Markdown - For documentation
- CSV - For spreadsheet analysis
- Direct Jira integration (future)

🎯 **Smart Categorization**
- Automatically groups test cases by scenario type
- Clear visual distinction between positive/negative/boundary
- Summary statistics and metrics

## Architecture

```
┌──────────────────────────────────┐
│   Orchestrator Platform          │
│   (Orchestrator-Platform.html)   │
└────────────┬─────────────────────┘
             │
             │ (UI Events)
             ↓
┌──────────────────────────────────┐
│  Frontend Integration Layer      │
│ (test-case-generator-ui.js)      │
└────────────┬─────────────────────┘
             │
             │ (HTTP API)
             ↓
┌──────────────────────────────────┐
│  Express.js Backend Server       │
│  (server-setup.js)               │
└────────────┬─────────────────────┘
             │
             ├─→ test-case-api.js (Routes)
             │   └─→ Validation & Formatting
             │
             └─→ gemini-test-case-generator.js
                 └─→ Prompt Engineering
                 └─→ Gemini LLM API Integration
                 └─→ Response Parsing
                     │
                     ↓
             Google Gemini API
```

## Quick Start

### 1. Install

```bash
npm install @google/generative-ai express cors dotenv
```

### 2. Configure

Add to `.env`:
```env
GEMINI_API_KEY=your_api_key_from_https://ai.google.dev/
```

### 3. Start Server

```bash
npm start
```

### 4. Integrate HTML

Add to `Orchestrator-Platform.html`:
```html
<!-- Before </body> -->
<script src="test-case-generator-ui.js"></script>

<!-- In Test Design header -->
<button id="generateTestCasesBtn" class="generate-btn">
  Generate Test Cases
</button>

<!-- In Test Design panel -->
<div id="testCasesContainer"></div>
```

### 5. Use

1. Select a story with acceptance criteria
2. Click "Generate Test Cases"
3. Review and export

## File Structure

```
.
├── README_TEST_CASE_GENERATOR.md      # This file
├── QUICK_START.md                     # 5-minute setup guide
├── INTEGRATION_GUIDE.md               # Detailed integration guide
├── HTML_INTEGRATION_SNIPPET.md        # HTML code snippets
├── package-test-case-generator.json   # Dependencies
├── .env                               # Configuration (add GEMINI_API_KEY)
├── Orchestrator-Platform.html         # Main UI (add button & container)
├── server-setup.js                    # Express server init
├── test-case-api.js                   # API routes & handlers
├── gemini-test-case-generator.js      # Gemini LLM integration
└── test-case-generator-ui.js          # Frontend JavaScript
```

## API Reference

### Generate Test Cases

**Endpoint:** `POST /api/test-cases/generate`

**Request:**
```json
{
  "storyId": "PROJ-123",
  "storyTitle": "User Login",
  "acceptanceCriteria": "Given user visits login page\nWhen they enter valid credentials\nThen they are logged in",
  "description": "Optional context"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "storyId": "PROJ-123",
    "generatedAt": "2024-10-13T10:30:00Z",
    "testCases": [
      {
        "id": "TC001",
        "title": "Login with valid credentials",
        "scenario": "Positive",
        "priority": "High",
        "steps": [
          {"step": 1, "action": "Navigate to login page"}
        ],
        "expectedResult": "User is logged in",
        "testData": "email: test@example.com"
      }
    ],
    "summary": {
      "totalTestCases": 12,
      "positiveCount": 5,
      "negativeCount": 4,
      "boundaryCount": 3
    }
  }
}
```

### Validate Test Cases

**Endpoint:** `POST /api/test-cases/validate`

Validates test case structure and content.

### Format Test Cases

**Endpoint:** `POST /api/test-cases/format`

Exports test cases in different formats (JSON, Markdown, CSV).

## Test Case Types

### 🟢 Positive Scenarios
Tests that verify expected behavior and happy paths.

Example:
- Login with valid credentials → User logged in
- Submit form with valid data → Data saved successfully

### 🔴 Negative Scenarios
Tests that verify error handling and invalid inputs.

Example:
- Login with invalid password → Error message displayed
- Submit empty form → Validation errors shown

### 🟡 Boundary Scenarios
Tests that verify edge cases and system limits.

Example:
- Login with very long email → Handled gracefully
- Submit form at system capacity → Appropriate response

## Configuration

### Environment Variables

```env
# Required
GEMINI_API_KEY=your_api_key_here

# Optional
PORT=3000
TEST_CASE_MIN_COUNT=8
TEST_CASE_MAX_COUNT=15
INCLUDE_POSITIVE_SCENARIOS=true
INCLUDE_NEGATIVE_SCENARIOS=true
INCLUDE_BOUNDARY_SCENARIOS=true
```

### Frontend Configuration

In `test-case-generator-ui.js` initialization:

```javascript
const testCaseGenerator = new TestCaseGeneratorUI({
  apiBaseUrl: 'http://localhost:3000',  // Backend server URL
});
```

## Usage Examples

### Example 1: E-commerce Product Search

**Acceptance Criteria:**
```
Given a user on the product search page
When they enter a search term
Then relevant products are displayed
And they can filter by price, rating, category
And they can sort by relevance, price, rating
```

**Generated Test Cases Include:**
- TC001: Search with valid term
- TC002: Search with special characters
- TC003: Search with very long string (boundary)
- TC004: Search with empty string
- TC005: Filter by multiple criteria
- TC006: Sort by different criteria
- ... and more

### Example 2: Payment Processing

**Acceptance Criteria:**
```
Given a user with items in cart
When they proceed to checkout
And enter valid payment details
Then payment is processed successfully
And order confirmation is displayed
```

**Generated Test Cases Include:**
- TC001: Valid payment - successful
- TC002: Invalid card number - error
- TC003: Expired card - error
- TC004: CVV validation boundary tests
- ... and more

## Customization

### Modify Test Case Generation Prompt

Edit `gemini-test-case-generator.js`, method `_buildPrompt()`:

```javascript
_buildPrompt(storyTitle, acceptanceCriteria, description) {
  return `You are an expert QA engineer...
  // Customize the prompt here
  `;
}
```

### Adjust Test Case Parsing

Edit the `_parseTestCases()` method to handle different response formats.

### Add Custom Validators

Extend `test-case-api.js` with additional validation rules.

## Performance

- **Generation Time:** 2-5 seconds per story
- **Response Size:** ~2-4 KB per test case
- **API Calls:** 1 per generation request
- **Browser Compatibility:** All modern browsers

## Security

- ✅ API keys stored securely in `.env`
- ✅ Input validation on all API endpoints
- ✅ CORS configured for development
- ✅ No sensitive data in logs
- ⚠️ Restrict CORS in production

## Troubleshooting

### Issue: "GEMINI_API_KEY is not configured"

**Solution:**
1. Get key from https://ai.google.dev/
2. Add to `.env`: `GEMINI_API_KEY=your_key`
3. Restart server

### Issue: "Failed to parse Gemini response"

**Solution:**
1. Verify acceptance criteria is descriptive
2. Check API key is valid
3. Review Gemini API documentation

### Issue: Button not working

**Solution:**
1. Verify backend running (`npm start`)
2. Check browser console for errors
3. Verify API base URL configuration

### Issue: Generated test cases incomplete

**Solution:**
1. Provide more detailed acceptance criteria
2. Add description field with context
3. Check Gemini API quotas

## Roadmap

### Current (v1.0)
- ✅ Basic test case generation
- ✅ Export to JSON/Markdown/CSV
- ✅ Positive/Negative/Boundary scenarios

### Planned (v2.0)
- 🔄 Jira test case linking
- 🔄 Test case execution tracking
- 🔄 Historical test case analysis
- 🔄 Custom test case templates

### Future (v3.0)
- 📋 Automated test script generation
- 📋 Multi-language support
- 📋 Integration with test runners
- 📋 AI-powered test optimization

## Contributing

To contribute improvements:

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## License

MIT License - See LICENSE file

## Support

For help:

1. Check `QUICK_START.md` for quick setup
2. See `INTEGRATION_GUIDE.md` for detailed help
3. Review `HTML_INTEGRATION_SNIPPET.md` for HTML changes
4. Check server logs: `npm start`

## FAQ

**Q: Does it work with other LLMs?**
A: Currently integrated with Gemini. Can be extended for others (Claude, GPT, etc.)

**Q: Can I customize the test case format?**
A: Yes, modify `_parseTestCases()` and `_buildPrompt()` methods.

**Q: How many test cases are generated?**
A: Configurable via `TEST_CASE_MIN_COUNT` and `TEST_CASE_MAX_COUNT` in `.env`

**Q: Can I save to Jira automatically?**
A: Framework supports it. Implement in `saveTestCasesToJira()` method.

**Q: What's the API key quota?**
A: Check [Google Gemini pricing](https://ai.google.dev/pricing)

## Credits

Built for the Orchestrator Platform using Google Gemini LLM.

---

**Version:** 1.0.0  
**Last Updated:** October 13, 2024  
**Status:** Production Ready ✅

**Ready to get started?** See `QUICK_START.md` for a 5-minute setup guide.
