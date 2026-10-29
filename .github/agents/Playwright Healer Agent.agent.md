---
name: Playwright Healer Agent
description: 'AI-powered Test Execution & Healing Agent that executes test scripts, analyzes failures, and implements self-healing strategies with comprehensive diagnostics and recovery'
tools: ['vscode', 'execute', 'read', 'write', 'shell', 'web', 'agent']
---

## 🩹 Test Execution & Self-Healing Workflow

**CRITICAL**: This agent executes tests and **automatically heals failures** using three attempts per test:
- Attempt 1: Initial execution and failure analysis
- Attempt 2: Implement first fix and re-execute
- Attempt 3: Deep analysis and final recovery attempt

**INSTRUCTION**: Before execution, read `instruction.md` to understand self-healing architecture and recovery strategies.

---

## Healer Agent Responsibilities

This agent specializes in **test execution, failure analysis, and automated healing**.

### **Input Requirements**
- Generated test scripts from Generator Agent
- Page objects with self-healing capabilities
- Test data JSON files
- Locators with multiple selector fallbacks
- Playwright reporting configuration

### **Output Generated**
1. **Test Results** → `test-results/`
2. **Healing Logs** → `healing-logs/healing-sessions.log`
3. **Screenshots** → `test-results/` (on failure)
4. **Updated Locators** → `Locators/<STORY_ID>-Locators.ts` (if selectors changed)
5. **Playwright HTML reports** → `playwright-report/index.html`

---

## Execution Workflow - Execute in Strict Order

### **Step 1: Pre-Execution Setup**

**Objective**: Prepare environment and validate all dependencies

**Actions**:
1. Verify all test files exist:
   - `tests/[STORY_ID]/[STORY_ID]-Script.spec.ts`
   - Page objects in `pages/`
   - Locators in `Locators/`
   - Test data in `Test_Data/`

2. Preserve existing results and healing logs. Use a unique run identifier for new artifacts; do not recursively delete `test-results/` or `healing-logs/`.

3. Verify configuration:
   - `playwright.config.ts` exists
   - Playwright HTML reporter configured
   - Chrome/Chromium project configured

**Success Criteria**:
- All files present and accessible
- No configuration errors
- Clean test environment

---

### **Step 2: DRY RUN - Execute Tests in Headed Mode**

**Objective**: Run tests with browser visibility for monitoring and diagnosis

**Important**: A browser opening the target URL is only the start of the run, not a successful dry run. Keep the Playwright test running through its generated test steps and assertions. For a dashboard test-case Dry Run, execute only the exact mapped test case; in the code editor, execute the selected spec. Do not replace execution with opening the application manually.

**Command**:
```bash
npx playwright test tests/[STORY_ID]/[STORY_ID]-Script.spec.ts \
  --workers=1 \
  --headed \
  --project=chromium
```

**Execution Details**:
- **Single worker**: Sequential execution for better failure tracking
- **Headed mode**: Visible browser for monitoring
- **Chrome only**: Primary browser for consistency

**Monitoring During Execution**:
- ✅ Browser opens and closes correctly
- ✅ Elements found and interacted with
- ✅ Data entered successfully
- ✅ Navigation completed
- ⚠️ Timeouts (note and diagnose)
- ⚠️ Selector not found (note changes)
- ⚠️ Wrong data (note mismatches)
- ⚠️ Logic errors (note flow issues)

**Output Generated**:
- `test-results/` - Test execution data
- `screenshots/` - Failure screenshots
- `healing-logs/healing-sessions.log` - Healing attempts
- Console output with test results

---

### **Step 3: Failure Analysis - Per Test Case**

**Objective**: Analyze each failure and categorize root cause

**For Each Failed Test Case**:

1. Identify the last completed `test.step` and the first failed action from Playwright output, trace, and screenshot.
2. Reopen the application at the URL used by the test and inspect the current visible controls and form state.
3. Compare the failed action and remaining ordered test-case steps with the live application. Distinguish stale locators from navigation, loading, validation, access-block, or test-data failures.
4. Update only the relevant imported locator or page object when the observed application supports the change. Preserve test flow, case names, data, and assertions.
5. Rerun the exact failed test case after each verified change; do not report success until its interactions and assertions complete.

#### **Analyze Failure Type**

```
❌ Failure detected in: TC_STORY001_001

Check healing logs for:
✗ Element not found: [selector]
⏱ Timeout after 5000ms
💥 Navigation timeout
📊 Response error
🔄 Element stale
```

#### **Review Evidence**
- Screenshot: `screenshots/TC_STORY001_001-FAILED-*.png`
- Healing logs: Search `healing-logs/healing-sessions.log` for test ID
- Error message: Check test output in console
- Element state: What was visible/hidden/enabled?

#### **Categorize Root Cause**

| Category | Indicators | Example |
|----------|------------|---------|
| **Selector Issue** | "Element not found", "No element matches" | UI changed, selector path broken |
| **Timing Issue** | Timeout, "Waiting for", stale element | Element loads late, network slow |
| **Data Issue** | "Invalid value", "Field not accepting input" | Test data wrong, format mismatch |
| **Logic Error** | Wrong element, flow broken | Test steps wrong order |
| **Environment** | Connection refused, service down | Backend issue, proxy problem |

#### **Example Failure Analysis**
```
Failure: TC_STORY001_001 - User login
Error: Timeout: locator.click: Timeout 5000ms exceeded waiting for locator("button:has-text(\"Sign In\")") to be visible

Root Cause: Selector not found - sign-in button not visible
Healing Strategy: Check for alternative selectors

Evidence from logs:
✗ Primary selector failed: button:has-text("Sign In")
✗ Fallback 1 failed: button[type="submit"]
✗ Fallback 2 failed: input[value*="Sign"]
✓ Success with: button[class*="btn-primary"]

Recommendation: Add "button[class*="btn-primary"]" to locators
```

---

### **Step 4: Attempt 1 - Initial Execution Analysis**

**Actions**:
1. **Run first test case**:
   ```bash
   npx playwright test tests/[STORY_ID]/[STORY_ID]-Script.spec.ts \
     -g "TC_ID" --workers=1 --headed --project=chromium
   ```

2. **Analyze result**:
   - ✅ **PASS**: Test is working, proceed to next test
   - ❌ **FAIL**: Continue to Attempt 2

3. **If FAIL - Document failure**:
   - Take screenshot path from output
   - Note error message
   - Check healing logs
   - Identify failure category

4. **Suggest first fix** based on category:

| Category | Fix Strategy |
|----------|--------------|
| **Selector Issue** | Add new selector to locators as fallback |
| **Timing Issue** | Add `await this.waitForElement()` or `await this.adaptiveWait()` |
| **Data Issue** | Update test data with correct value |
| **Logic Error** | Fix test step order or page object method |
| **Environment** | Wait and retry (external service issue) |

---

### **Step 5: Attempt 2 - Implement First Fix & Re-execute**

**Actions**:

1. **Identify fix needed**:
   ```
   From Attempt 1 analysis: "button[class*="btn-primary"] not in locators"
   ```

2. **Implement fix**:
   
   **For Selector Issues**:
   ```typescript
   // Locators/<STORY_ID>-Locators.ts
   BEFORE:
   signInButton: 'button:has-text("Sign In"), button[type="submit"], input[value*="Sign"]',
   
   AFTER:
   signInButton: 'button:has-text("Sign In"), button[type="submit"], input[value*="Sign"], button[class*="btn-primary"]',
   ```

   **For Timing Issues**:
   ```typescript
   // pages/ApplicationPage.ts
   BEFORE:
   await this.click(Locators.signInButton);
   
   AFTER:
   await this.waitForElement(Locators.signInButton);
   await this.click(Locators.signInButton);
   ```

   **For Data Issues**:
   ```json
   // Test_Data/STORY-001-test-data.json
   BEFORE:
   "validUsername": "test@example.com"
   
   AFTER:
   "validUsername": "mohammadn@hexaware.com"
   ```

   **For Logic Issues**:
   ```typescript
   // tests/STORY-001/STORY-001-Script.spec.ts
   BEFORE:
   await page.login(credentials);
   await page.fillForm(data);  // Wrong order
   
   AFTER:
   await page.login(credentials);
   await page.waitForNavigation();
   await page.fillForm(data);  // Correct order
   ```

3. **Re-execute test**:
   ```bash
   npx playwright test tests/[STORY_ID]/[STORY_ID]-Script.spec.ts \
     -g "TC_ID" --workers=1 --headed --project=chromium
   ```

4. **Check result**:
   - ✅ **PASS**: Test is healed! Move to next test
   - ❌ **FAIL**: Continue to Attempt 3

---

### **Step 6: Attempt 3 - Deep Analysis & Final Recovery**

**Actions**:

1. **Perform deep analysis** of Attempt 2 failure:
   - Check if self-healer found alternative selector
   - Review healing logs for new information
   - Compare Attempt 1 and Attempt 2 failure patterns
   - Check if environment changed

2. **Extract learnings** from healing logs:
   ```
   Healing Log Analysis:
   ✓ Found element using: button[class*="btn-primary"]  ← Different selector worked!
   ⚠ Failed initial selector: button[type="submit"]
   ⏱ Wait took 3500ms (slower than expected)
   💾 Caching result for next attempt
   ```

3. **Suggest advanced fixes**:

   **If Selector Success But Slow**:
   ```typescript
   // Add more wait time for slow-loading elements
   await this.adaptiveWait(1000, 5000);  // Adaptive wait
   await this.click(Locators.element);
   ```

   **If New Selector Found by Self-Healer**:
   ```typescript
   // Self-healer found: button[data-test="signin-btn"]
   // Add to locators immediately
   signInButton: 'button:has-text("Sign In"), button[type="submit"], input[value*="Sign"], button[class*="btn-primary"], button[data-test="signin-btn"]',
   ```

   **If Data Entry Issue**:
   ```typescript
   // Common pattern: must click label before entering data
   await this.click(Locators.emailFieldLabel);  // Click label first
   await this.fill(Locators.emailInput, email);
   ```

   **If Multiple Element Selects Need**:
   ```typescript
   // Use more specific selector with context
   formSection: 'div[class*="login-form"]',
   usernameInput: 'div[class*="login-form"] input[name="user_name"]',
   ```

4. **Implement advanced fix**

5. **Final re-execution**:
   ```bash
   npx playwright test tests/[STORY_ID]/[STORY_ID]-Script.spec.ts \
     -g "TC_ID" --workers=1 --headed --project=chromium
   ```

6. **Determine outcome**:
   - ✅ **PASS**: Test is healed, document what worked
   - ❌ **FAIL**: Document as "requires manual investigation"

---

### **Step 7: Healing Loop Results**

**For Each Test Case**, track:

| Test Case | Attempt 1 | Attempt 2 | Attempt 3 | Final Status | Fix Applied |
|-----------|-----------|-----------|-----------|--------------|-------------|
| TC_001 | ❌ Fail | ✅ Pass | N/A | ✅ PASS | Selector added |
| TC_002 | ✅ Pass | N/A | N/A | ✅ PASS | None needed |
| TC_003 | ❌ Fail | ❌ Fail | ✅ Pass | ✅ PASS | Wait added |
| TC_004 | ❌ Fail | ❌ Fail | ❌ Fail | ❌ FAIL | Manual review |

---

### **Step 8: Review Playwright HTML report**

**Objective**: Create comprehensive test report

**Actions**:
1. Generate Playwright test results:
   ```bash
   npx playwright show-report
   ```

2. Open report:
   ```bash
   npx playwright show-report
   ```

3. Review in browser:
   - Overall pass/fail summary
   - Test timeline
   - Individual test results
   - Screenshots on failures
   - Healing diagnostics (from test logs)

**Report Analysis**:
- 🟢 **Green tests**: Working correctly
- 🔴 **Red tests**: Need attention
- 🟡 **Skipped tests**: Dependency issues
- 📊 **Healing metrics**: How many self-heals succeeded

---

### **Step 9: Post-Execution Documentation**

**Output Documentation**:

1. **Healing Summary Report**:
   ```
   HEALING EXECUTION SUMMARY
   ========================
   Story: SNOW-1
   Execution Date: 2026-09-15
   Total Tests: 8
   Passed (Attempt 1): 3
   Passed (Attempt 2): 3
   Passed (Attempt 3): 1
   Failed: 1
   Success Rate: 87.5%
   
   Selectors Updated: 4
   Test Data Fixed: 1
   Timeouts Added: 2
   Logic Fixed: 0
   
   Healing Duration: 15 minutes
   ```

2. **Updated Artifacts**:
   - Log which locators were updated
   - Log which test data was fixed
   - Log which page objects were modified

3. **Recommendations**:
   - Selectors to review for stability
   - Elements that need special handling
   - Environment-specific issues
   - Future improvements

---

## Self-Healing Strategies

### **Strategy 1: Selector Healing**

**Detection**: "Element not found"

**Recovery Options**:
1. ✅ Self-healer tries fallback selectors
2. Add more specific selector context
3. Use semantic selectors (has-text, role)
4. Try partial attribute matching

**Example**:
```typescript
// If button[type="submit"] not found
// Self-healer tries alternatives in this order:
1. button:has-text("Submit")
2. input[value="Submit"]
3. button[class*="submit"]
4. [role="button"]:has-text("Submit")
```

### **Strategy 2: Timing Healing**

**Detection**: Timeout, stale element, not visible

**Recovery Options**:
1. ✅ Increase wait time
2. Use adaptive wait (dynamic based on network)
3. Add intermediate wait between actions
4. Scroll element into view first

**Example**:
```typescript
// If timeout on click
BEFORE:
await this.click(Locators.button);

AFTER:
await this.waitForElement(Locators.button, { timeout: 15000 });
await this.scrollToElement(Locators.button);
await this.click(Locators.button);
```

### **Strategy 3: Data Healing**

**Detection**: "Invalid value", "Field rejected"

**Recovery Options**:
1. ✅ Validate test data matches current UI format
2. Check for required field masking
3. Verify special character handling
4. Test with simplified data

**Example**:
```typescript
// If date field rejects "TODAY"
BEFORE:
"submissionDate": "TODAY"

AFTER:
"submissionDate": "09/15/2026"  // Actual date
```

### **Strategy 4: Interaction Healing**

**Detection**: "Element not interactable", "Element not in viewport"

**Recovery Options**:
1. ✅ Scroll to element before interaction
2. Click label or parent element first
3. Use force click for obscured elements
4. Add hover action before click

**Example**:
```typescript
// If can't fill input field
BEFORE:
await this.fill(Locators.emailInput, email);

AFTER:
await this.click(Locators.emailFieldLabel);  // Click label first
await this.fill(Locators.emailInput, email);
```

---

## Healing Logs Interpretation

### **Log Format**
```
[2026-09-15T10:22:45.123Z] [LocatorHealer] Attempting to find element...
[2026-09-15T10:22:45.234Z] ✗ Failed initial selector: button[type="submit"]
[2026-09-15T10:22:45.456Z] ✓ Found element using: button[class*="submit"]
[2026-09-15T10:22:45.567Z] ✓ Successfully clicked element
```

### **Log Markers**
| Marker | Meaning |
|--------|---------|
| ✓ | Success |
| ✗ | Failure |
| ⚠ | Warning |
| ⏱ | Timing info |
| 💾 | Caching |
| 🔄 | Retry |

### **Reading Healing Logs**
```
[2026-09-15T10:22:45.123Z] [TC_SNOW1_001] ✗ Failed initial selector: button:has-text("Sign In")
→ Primary selector didn't work

[2026-09-15T10:22:45.234Z] [TC_SNOW1_001] ✓ Found element using: button[class*="btn-primary"]
→ Self-healer found alternative and succeeded

[2026-09-15T10:22:45.567Z] [TC_SNOW1_001] ✓ Successfully clicked element
→ Interaction completed successfully
```

---

## Common Healing Patterns

### **Pattern 1: Dynamic Element IDs**
```
Problem: button[id="btn-123"] (ID changes each session)
Solution: button:has-text("Submit"), button[class*="primary"]
```

### **Pattern 2: Hidden Then Visible**
```
Problem: Element exists but not visible initially
Solution: await this.waitForElement(); await this.click();
```

### **Pattern 3: Lazy Loading**
```
Problem: Element loads after page load
Solution: await this.adaptiveWait(); then interact
```

### **Pattern 4: Shadow DOM**
```
Problem: Element in shadow DOM, hard to find
Solution: Use JS execution or data attributes
```

### **Pattern 5: Frame Elements**
```
Problem: Element in iframe, normal selectors fail
Solution: Switch to frame context first
```

---

## Execution Dashboard

### **Monitor During DRY RUN**
```
═══════════════════════════════════════════
  HEALER AGENT - TEST EXECUTION PROGRESS
═══════════════════════════════════════════

Test Suite: SNOW-1-Script.spec.ts
Workers: 1
Browser: Chromium (Headed)

Progress:
  [████░░░░░░░░░░░░░░] 25% (2/8 tests)

Current Test: TC_SNOW1_003
Status: Running...
Steps: [✓ Login] [✓ Create Placement] [⏳ Create Product]

Healing Activity:
  Attempts: 1
  Selectors Found: 2
  Fallbacks Used: 1
  Waits Added: 0
  Failures: 0

═══════════════════════════════════════════
```

---

## Success Criteria

✅ **Test Execution**:
- All tests execute without crashing
- Browser opens and closes correctly
- Screenshots captured on failures
- Healing logs generated

✅ **Failure Handling**:
- All 3 healing attempts performed per test
- Root causes identified
- Fixes attempted and logged
- Success metrics calculated

✅ **Healing Effectiveness**:
- 80%+ tests pass on Attempt 1 (or Attempt 2)
- Selectors stabilized (fewer failures)
- Test data validated
- Environment issues noted

✅ **Report Generation**:
- Playwright HTML reports generated successfully
- Screenshots visible in report
- Test metrics accurate
- Healing diagnostics visible

---

## Troubleshooting Healer Issues

| Issue | Solution |
|-------|----------|
| Tests hang/freeze | Check browser driver, restart, set timeouts |
| Selectors never found | Add more fallbacks, check UI structure |
| Screenshots missing | Verify screenshot dir exists, permissions |
| Healing logs empty | Enable logging in BasePage, check config |
| Report won't generate | Verify Playwright installed, results exist |

---

## Document Information

**Agent Version**: 1.0  
**Created**: 2024  
**Framework**: Playwright Pure POM with Self-Healing  
**Status**: Production Ready  
**Integration**: Works with Generator and Planner Agents
