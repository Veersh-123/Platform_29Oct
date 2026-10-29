# Setup Checklist - Gemini Test Case Generator

Complete this checklist to ensure proper setup and integration.

## Pre-Installation (5 minutes)

- [ ] **Get Gemini API Key**
  - [ ] Visit https://ai.google.dev/
  - [ ] Click "Get API Key"
  - [ ] Create Google Cloud project if needed
  - [ ] Generate API key
  - [ ] Copy key to clipboard (save it!)

- [ ] **Verify Prerequisites**
  - [ ] Node.js 14+ installed (`node --version`)
  - [ ] npm installed (`npm --version`)
  - [ ] Access to Orchestrator-Platform.html file
  - [ ] .env file exists in project root

## Backend Setup (5 minutes)

- [ ] **Install Dependencies**
  - [ ] Run: `npm install @google/generative-ai express cors dotenv`
  - [ ] Or: `npm install` (using package.json)
  - [ ] Verify no installation errors

- [ ] **Configure Environment**
  - [ ] Open `.env` file
  - [ ] Add: `GEMINI_API_KEY=your_actual_key_here`
  - [ ] Save `.env` file
  - [ ] Verify key is valid (not expired)

- [ ] **Create/Verify Files**
  - [ ] `server-setup.js` exists
  - [ ] `test-case-api.js` exists
  - [ ] `gemini-test-case-generator.js` exists
  - [ ] `test-case-generator-ui.js` exists

- [ ] **Start Backend Server**
  - [ ] Run: `npm start`
  - [ ] See startup message (should show port 3000)
  - [ ] Keep terminal running

- [ ] **Verify Backend**
  - [ ] Open new terminal
  - [ ] Run: `curl http://localhost:3000/health`
  - [ ] Should return: `{"status":"ok",...}`
  - [ ] Run: `curl http://localhost:3000/api/test-case-generator/verify`
  - [ ] Should return: `{"status":"verified",...}`

## Frontend Integration (5 minutes)

- [ ] **Prepare HTML File**
  - [ ] Open `Orchestrator-Platform.html`
  - [ ] Locate closing `</body>` tag
  - [ ] Ensure no existing conflicts

- [ ] **Add Script Reference**
  - [ ] Before closing `</body>`, add:
    ```html
    <script src="test-case-generator-ui.js"></script>
    ```
  - [ ] Save file

- [ ] **Add Generate Button**
  - [ ] Find `.testdesign-header` section
  - [ ] Locate the test design header div
  - [ ] After the issue info, add:
    ```html
    <button id="generateTestCasesBtn" class="generate-btn">
      <span style="margin-right: 4px;">✨</span>Generate Test Cases
    </button>
    ```
  - [ ] Save file

- [ ] **Add Test Cases Container**
  - [ ] Find `.testdesign-panel` section
  - [ ] After the criteria box, add:
    ```html
    <div id="testCasesContainer" style="margin-top: 30px;"></div>
    ```
  - [ ] Save file

- [ ] **(Optional) Add CSS Styling**
  - [ ] If styling issues occur, add CSS from `HTML_INTEGRATION_SNIPPET.md`
  - [ ] Test visual appearance

## Testing & Validation (5 minutes)

- [ ] **Load Application**
  - [ ] Open Orchestrator-Platform.html in browser
  - [ ] Should load without errors
  - [ ] Check browser console (F12) - no errors

- [ ] **Verify Button Visibility**
  - [ ] Navigate to Test Design tab
  - [ ] Select a Jira story from the board
  - [ ] "Generate Test Cases" button should appear
  - [ ] Button should be enabled (clickable)

- [ ] **Test Generation**
  - [ ] Story should have acceptance criteria
  - [ ] Click "Generate Test Cases" button
  - [ ] Loading indicator should appear
  - [ ] Generation should complete in 2-5 seconds

- [ ] **Verify Results**
  - [ ] Test cases should display
  - [ ] Should see summary with counts
  - [ ] Test cases grouped by scenario type
  - [ ] Each test case shows:
    - [ ] ID (e.g., TC001)
    - [ ] Title
    - [ ] Priority
    - [ ] Steps
    - [ ] Expected result

- [ ] **Test Export Functions**
  - [ ] Export as JSON
  - [ ] Export as Markdown
  - [ ] Export as CSV
  - [ ] All exports should work without errors

## Troubleshooting Checklist

If something isn't working, check:

### Backend Issues

- [ ] Is Node.js installed? `node --version`
- [ ] Is npm installed? `npm --version`
- [ ] Are dependencies installed? Check `node_modules` folder
- [ ] Is `.env` file configured? Has `GEMINI_API_KEY`?
- [ ] Is API key valid? (Try on gemini website)
- [ ] Is server running? Terminal shows "listening on port 3000"
- [ ] Is port 3000 available? (Check for conflicts)
- [ ] Check server logs for errors

### Frontend Issues

- [ ] Are all script files in place? (`*.js` files)
- [ ] Is script tag loading correctly? (Check Network tab)
- [ ] Is button HTML correctly placed? (Check Elements tab)
- [ ] Browser console clear? (No JavaScript errors)
- [ ] Is browser caching? (Try hard refresh: Ctrl+Shift+R)
- [ ] Correct browser used? (Modern browser required)

### API Connection Issues

- [ ] Backend running on port 3000? (`npm start`)
- [ ] API endpoint responsive? (`curl localhost:3000/health`)
- [ ] CORS errors in console? (Check server logs)
- [ ] API base URL correct? (Check in ui.js initialization)
- [ ] Network tab shows requests? (F12 → Network)

### Test Generation Issues

- [ ] Story selected? (Click a Jira card first)
- [ ] Story has acceptance criteria? (Check Jira issue)
- [ ] Criteria is descriptive enough? (Vague criteria → vague tests)
- [ ] Gemini API quota available? (Check Google Cloud)
- [ ] API key has permissions? (Check Google Cloud Console)
- [ ] Network connection stable? (Check browser network)

## Performance Verification

- [ ] First test generation takes 2-5 seconds ✓
- [ ] Generated at least 8 test cases ✓
- [ ] Includes positive, negative, boundary cases ✓
- [ ] Test cases are coherent and logical ✓
- [ ] No duplicate test cases ✓
- [ ] Priority levels assigned ✓
- [ ] All fields populated ✓

## Security Verification

- [ ] `.env` file not in git? (Check `.gitignore`)
- [ ] API key not exposed in console logs? ✓
- [ ] API key not in HTML comments? ✓
- [ ] Backend uses CORS correctly? ✓
- [ ] No sensitive data in responses? ✓
- [ ] Input validation working? ✓

## Documentation Verification

- [ ] README read? ✓
- [ ] INTEGRATION_GUIDE reviewed? ✓
- [ ] HTML_INTEGRATION_SNIPPET checked? ✓
- [ ] QUICK_START guide followed? ✓
- [ ] API documentation understood? ✓

## Final Validation

- [ ] Can select different stories? ✓
- [ ] Each story generates different test cases? ✓
- [ ] Generated cases match acceptance criteria? ✓
- [ ] Can export in all formats? ✓
- [ ] No errors in 10+ test generations? ✓
- [ ] Performance acceptable? ✓

## Sign-Off

When all checkboxes are completed:

- **Date:** _______________
- **By:** _______________
- **Environment:** _______________
- **Notes:** _______________

## Rollback Instructions

If issues occur and need to rollback:

1. Stop backend: Ctrl+C in terminal
2. Remove `.js` files added to project
3. Remove script tags from HTML
4. Remove .env entries
5. Reload application

## Next Steps After Setup

- [ ] Set up automated test runs with generated cases
- [ ] Configure Jira integration for test tracking
- [ ] Train team on test case generation
- [ ] Set up CI/CD pipeline integration
- [ ] Monitor generation quality over time
- [ ] Customize prompts based on feedback
- [ ] Document test case standards
- [ ] Set up reporting dashboards

## Support

If issues persist after all checks:

1. Review server logs: `npm start` output
2. Check browser console: F12 → Console
3. Check Network tab: F12 → Network (watch for failed requests)
4. Review API responses: F12 → Network → POST request → Response
5. See INTEGRATION_GUIDE.md → Troubleshooting section
6. Check Gemini API status: https://status.openapis.dev/

---

## Quick Reference

### Key URLs
- Backend Health: http://localhost:3000/health
- Verify Setup: http://localhost:3000/api/test-case-generator/verify
- Generate API: POST http://localhost:3000/api/test-cases/generate

### Key Commands
```bash
npm install                    # Install dependencies
npm start                      # Start backend server
npm run dev                    # Start with auto-reload
curl http://localhost:3000/health  # Test backend
```

### Key Files
- Backend: `server-setup.js`, `test-case-api.js`, `gemini-test-case-generator.js`
- Frontend: `test-case-generator-ui.js`
- HTML: `Orchestrator-Platform.html`
- Config: `.env`

### Key API Endpoints
- POST `/api/test-cases/generate` - Generate test cases
- POST `/api/test-cases/validate` - Validate test cases
- POST `/api/test-cases/format` - Format test cases
- GET `/api/test-case-generator/verify` - Verify setup

---

**Total Setup Time:** ~15 minutes  
**Difficulty Level:** Beginner-Friendly  
**Support Level:** Comprehensive ✓

**Ready?** Start with Pre-Installation section above!
