# Gemini Test Case Generator Integration Guide

Complete guide to integrate AI-powered test case generation into your Orchestrator Platform.

## Overview

The Gemini Test Case Generator uses Google's Gemini LLM to automatically generate comprehensive test cases from user story acceptance criteria. It covers:

- ✅ **Positive Scenarios** - Happy path and expected behavior
- ❌ **Negative Scenarios** - Error handling and invalid inputs  
- ⚠️ **Boundary Scenarios** - Edge cases and limits

## Prerequisites

1. **Node.js** (v14+) installed
2. **Google Gemini API Key** from [https://ai.google.dev/](https://ai.google.dev/)
3. **Orchestrator Platform** (HTML file already present)

## Installation Steps

### Step 1: Setup Backend

```bash
# Copy the package.json
cp package-test-case-generator.json package.json

# Install dependencies
npm install

# OR if you prefer to install individually:
npm install @google/generative-ai express cors dotenv
```

### Step 2: Configure Environment

Edit your `.env` file and add:

```env
# Gemini LLM Configuration
GEMINI_API_KEY=your_actual_gemini_api_key_here

# Test Case Generation Settings (optional)
TEST_CASE_MIN_COUNT=8
TEST_CASE_MAX_COUNT=15
INCLUDE_POSITIVE_SCENARIOS=true
INCLUDE_NEGATIVE_SCENARIOS=true
INCLUDE_BOUNDARY_SCENARIOS=true
```

**Getting your Gemini API Key:**
1. Visit [https://ai.google.dev/](https://ai.google.dev/)
2. Click "Get API Key" 
3. Create a new API key in Google Cloud Console
4. Copy the key to your `.env` file

### Step 3: Update HTML

Add the following to your `Orchestrator-Platform.html`:

#### A. Include the JavaScript Library

Add before the closing `</body>` tag:

```html
<!-- Gemini Test Case Generator -->
<script src="test-case-generator-ui.js"></script>
```

#### B. Add Generate Button (in Test Design section)

Find the test design panel header and add this button:

```html
<!-- Place this in the .testdesign-header section -->
<button id="generateTestCasesBtn" class="generate-btn" style="margin-left: auto;">
  <span>✨</span> Generate Test Cases
</button>
```

#### C. Add Test Cases Container

Add a container for displaying generated test cases:

```html
<!-- Place this in the .testdesign-panel section -->
<div id="testCasesContainer" style="margin-top: 20px;">
  <!-- Generated test cases will appear here -->
</div>
```

### Step 4: Start the Backend Server

```bash
# Development mode (with auto-reload)
npm run dev

# OR production mode
npm start
```

The server will run on `http://localhost:3000`

Verify setup:
```bash
curl http://localhost:3000/api/test-case-generator/verify
```

## Usage

### Generating Test Cases

1. **Select a User Story** in the Orchestrator Platform
   - Click on a Jira card/story in the Test Design tab
   - Ensure the story has acceptance criteria

2. **Click "Generate Test Cases"** button
   - The UI will call the Gemini LLM API
   - Generation typically takes 2-5 seconds

3. **Review Generated Test Cases**
   - Test cases are grouped by scenario type
   - Each case includes steps, expected results, and test data
   - Summary shows distribution across positive/negative/boundary scenarios

4. **Export or Save**
   - **Export as JSON** - For integration with other tools
   - **Export as Markdown** - For documentation
   - **Export as CSV** - For spreadsheet analysis
   - **Save to Jira** - Create test tracking issues (requires additional Jira integration)

## API Endpoints

### Generate Test Cases

```http
POST /api/test-cases/generate
Content-Type: application/json

{
  "storyId": "PROJ-123",
  "storyTitle": "User Login Functionality",
  "acceptanceCriteria": "Given a user with valid credentials\nWhen they enter their email and password\nThen they should be logged in successfully\nAnd redirected to the dashboard",
  "description": "Optional additional context about the story"
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
        "description": "Test successful login",
        "steps": [
          {"step": 1, "action": "Navigate to login page"},
          {"step": 2, "action": "Enter valid email"}
        ],
        "expectedResult": "User is logged in and redirected to dashboard",
        "testData": "email: test@example.com, password: ValidPass123"
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

```http
POST /api/test-cases/validate
Content-Type: application/json

{
  "testCases": [
    {
      "id": "TC001",
      "title": "Test case title",
      "steps": [{"step": 1, "action": "Do something"}],
      "expectedResult": "Something happens"
    }
  ]
}
```

### Format Test Cases

```http
POST /api/test-cases/format
Content-Type: application/json

{
  "testCases": [...],
  "format": "markdown" // or "csv", "json"
}
```

## Architecture

```
Orchestrator Platform (HTML/JS)
         ↓
test-case-generator-ui.js (Frontend)
         ↓
Express API Server (Node.js)
         ↓
test-case-api.js (Route Handlers)
         ↓
gemini-test-case-generator.js (LLM Integration)
         ↓
Google Gemini API
```

## File Structure

```
project-root/
├── Orchestrator-Platform.html          # Main UI (add button + container)
├── .env                                 # Environment variables (add GEMINI_API_KEY)
├── package.json                         # Node.js dependencies
├── server-setup.js                      # Express server initialization
├── test-case-api.js                     # API route handlers
├── gemini-test-case-generator.js        # Gemini integration logic
├── test-case-generator-ui.js            # Frontend integration
└── INTEGRATION_GUIDE.md                 # This file
```

## Configuration

### Environment Variables

```env
# Required
GEMINI_API_KEY=your_api_key_here

# Optional
PORT=3000                           # Server port
TEST_CASE_MIN_COUNT=8              # Minimum test cases to generate
TEST_CASE_MAX_COUNT=15             # Maximum test cases to generate
INCLUDE_POSITIVE_SCENARIOS=true    # Include positive test cases
INCLUDE_NEGATIVE_SCENARIOS=true    # Include negative test cases
INCLUDE_BOUNDARY_SCENARIOS=true    # Include boundary test cases
```

### API Base URL Configuration

If your backend server is on a different URL, configure it in the HTML:

```html
<script>
  const testCaseGenerator = new TestCaseGeneratorUI({
    apiBaseUrl: 'http://your-api-server:3000'
  });
</script>
```

## Troubleshooting

### "GEMINI_API_KEY is not configured"

**Solution:** 
1. Get your API key from [https://ai.google.dev/](https://ai.google.dev/)
2. Add to `.env`: `GEMINI_API_KEY=your_key`
3. Restart the server

### "API Error: 401 Unauthenticated"

**Solution:**
1. Verify API key is correct
2. Check that API is enabled in Google Cloud Console
3. Ensure key has proper permissions

### "Failed to parse Gemini response"

**Solution:**
1. Check Gemini API response format
2. Ensure acceptance criteria is descriptive enough
3. Try with a different story

### Frontend button not showing

**Solution:**
1. Ensure `test-case-generator-ui.js` is loaded
2. Check browser console for errors
3. Verify button HTML is present in the page

### Cannot connect to backend

**Solution:**
1. Verify server is running: `npm start`
2. Check server is listening on correct port
3. Verify frontend apiBaseUrl matches server URL
4. Check CORS is enabled (it is in server-setup.js)

## Example Acceptance Criteria for Testing

```
Given a user visits the login page
When they enter their registered email
And enter their correct password
And click the login button
Then they should see a success message
And be redirected to their dashboard

When they enter an incorrect password
Then they should see an error message
And remain on the login page

When they enter an email that doesn't exist
Then they should see an appropriate error message

When they leave email field empty
Then they should see a validation error
And the login button should be disabled
```

## Performance Notes

- First request: 2-5 seconds (API call to Gemini)
- Subsequent requests: Similar time (fresh generation each time)
- Response size: ~2-4 KB per generated test case

## Security

- **API Keys:** Never commit `.env` file to version control
- **CORS:** Configured for development; restrict in production
- **Input Validation:** All inputs are validated before sending to Gemini

## Support

For issues or feature requests:
1. Check the Troubleshooting section
2. Review the [Gemini API documentation](https://ai.google.dev/docs)
3. Check server logs for detailed error messages

## Next Steps

1. ✅ Install and configure backend
2. ✅ Update HTML with button and container
3. ✅ Test basic generation flow
4. ✅ Export generated test cases
5. ⏳ (Optional) Integrate Jira test case linking
6. ⏳ (Optional) Add test case execution tracking

---

**Last Updated:** October 13, 2024
**Version:** 1.0.0
