# Playwright Three-Agent Architecture

## Overview

The Orchestrator Platform uses a **three-agent orchestration model** to automate the complete test automation lifecycle from story to execution.

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│              ORCHESTRATOR AGENT (Main Coordinator)                   │
│              - Extracts story from Jira/ADO                          │
│              - Coordinates agent workflow                            │
│              - Manages dependencies                                  │
│              - Generates final reports                               │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
                        ↓
        ┌───────────────┼───────────────┐
        ↓               ↓               ↓
    ┌────────┐   ┌──────────┐   ┌────────┐
    │ Planner│   │Generator │   │ Healer │
    │ Agent  │   │  Agent   │   │ Agent  │
    └────────┘   └──────────┘   └────────┘
        ↓               ↓               ↓
  Test Cases      Code Artifacts   Execution &
  (MD)            (TS, JSON)       Healing (Logs)
```

---

## Agent 1: Planner Agent 🧠

**Role**: Analyze requirements and generate test cases

### Inputs
- Work item/story from Jira or ADO
- Acceptance criteria
- Business requirements
- Application context

### Processing
1. Parse story requirements
2. Identify UI pages and workflows
3. Generate test scenarios:
   - Happy path (positive)
   - Negative (error conditions)
   - Edge cases (boundaries)
   - Regression scenarios
4. Define clear test steps
5. Extract test data requirements

### Outputs
- **`specs/[STORY_ID]-TEST-CASES.md`** - Comprehensive test case documentation with:
  - Test Case ID (TC_STORYID_001)
  - Title and description
  - Preconditions
  - Step-by-step test steps
  - Expected results
  - Test data requirements
  - Priority (Critical/High/Medium/Low)
  - Type (Positive/Negative/Edge/Regression)

### Example Output Structure
```markdown
## Test Case: TC_STORY001_001

**Title**: User successfully logs in
**Type**: Positive
**Priority**: Critical

### Preconditions
- ServiceNow is accessible
- Valid user credentials available

### Steps
1. Navigate to login page
2. Enter username
3. Enter password
4. Click Sign In

### Expected Results
- User logged in
- Dashboard displayed

### Test Data
- username: valid_user@company.com
- password: SecurePass123
```

### Invocation
```typescript
invokeSubAgent({
  name: "playwright-planner-agent",
  prompt: "Generate comprehensive test cases from this story context...",
  explanation: "Analyzing requirements and planning test scenarios"
})
```

### Document
See: `.github/agents/Playwright Planner Agent.md`

---

## Agent 2: Generator Agent 🔧

**Role**: Generate production-ready automation code

### Inputs
- Test cases from Planner Agent (or manual test cases)
- Story ID and context
- Application UI structure (optional screenshots)
- Existing page objects (for reference)

### Processing
1. Parse test cases to identify:
   - Required pages/screens
   - User interactions (click, fill, select)
   - Form fields and types
   - Navigation flows
   - Expected results

2. Generate 4 artifacts:
   - **Locators**: Centralized element selectors with fallbacks
   - **Page Objects**: Business-level action methods with self-healing
   - **Test Data**: Externalized test data in JSON format
   - **Test Scripts**: Playwright test specifications using POM

### Outputs

#### 1. Locators → `Locators/[PageName]-Locators.ts`
```typescript
const AUTH_SECTION = {
  usernameInput: 'input[name="user_name"], input[id="username"], input[placeholder*="Username"]',
  passwordInput: 'input[type="password"], input[name="password"]',
  signInButton: 'button:has-text("Sign In"), button[type="submit"], button[class*="signin"]',
};

export const <PascalStoryId>PageLocators = { ...AUTH_SECTION };
```

#### 2. Page Objects → `pages/[PageName].ts`
```typescript
export class ApplicationPage extends BasePage {
  async login(username: string, password: string): Promise<void> {
    await this.fill(Locators.usernameInput, username);
    await this.fill(Locators.passwordInput, password);
    await this.click(Locators.signInButton);
    await this.waitForNavigation();
    this.log('Login completed');
  }

  async isLoggedIn(): Promise<boolean> {
    return await this.isVisible(Locators.dashboard);
  }
}
```

#### 3. Test Data → `Test_Data/[STORY_ID]-test-data.json`
```json
{
  "baseUrl": "https://app.example.com",
  "credentials": {
    "validUsername": "test@example.com",
    "validPassword": "SecurePass123",
    "invalidUsername": "invalid@test.com"
  }
}
```

#### 4. Test Scripts → `tests/[STORY_ID]/[STORY_ID]-Script.spec.ts`
```typescript
test.describe('STORY-001: Login Workflow', () => {
  let page: ApplicationPage;

  test.beforeEach(async ({ page: pw }) => {
    page = new ApplicationPage(pw);
  });

  test('TC_STORY001_001 - User login', async () => {
    try {
      await test.step('Login', async () => {
        await page.login(testData.credentials.validUsername, testData.credentials.validPassword);
      });
      
      await test.step('Verify', async () => {
        expect(await page.isLoggedIn()).toBe(true);
      });
    } catch (error) {
      await page.takeScreenshot('TC_STORY001_001-FAILED');
      throw error;
    }
  });
});
```

### Invocation
```typescript
invokeSubAgent({
  name: "playwright-generator-agent",
  prompt: "Generate page objects and test scripts from these test cases...",
  explanation: "Creating automation code artifacts following POM pattern"
})
```

### Document
See: `.github/agents/Playwright Generator Agent.md`

---

## Agent 3: Healer Agent 🩹

**Role**: Execute tests and heal failures with self-healing

### Inputs
- Test scripts from Generator Agent
- Page objects with self-healing capabilities
- Test data JSON files
- Locators with fallback selectors
- Playwright reporting configuration

### Processing

#### Phase 1: Setup
1. Verify all dependencies present
2. Clear previous test results
3. Configure test environment

#### Phase 2: DRY RUN - Execute Tests (Attempt 1)
1. Run tests with:
   - Single worker (sequential)
   - Headed mode (visible browser)
   - Chrome only (chromium)
2. Monitor execution:
   - Browser interactions
   - Element finding
   - Data entry
   - Navigation
3. Capture failures:
   - Screenshots
   - Error messages
   - Healing logs
   - Root causes

#### Phase 3: Failure Analysis (Per Test)
Categorize failures:
- **Selector Issue**: Element not found, UI structure changed
- **Timing Issue**: Timeout, not visible, stale element
- **Data Issue**: Wrong value, format mismatch
- **Logic Error**: Wrong flow, precondition failed
- **Environment Issue**: Service down, no connectivity

#### Phase 4: Attempt 2 - Implement First Fix
For each failed test:
1. Apply healing strategy:
   - Selector issue → Add selector to locators
   - Timing issue → Add wait or adaptive wait
   - Data issue → Update test data
   - Logic issue → Fix test step
2. Re-execute test
3. Check if passed:
   - ✅ Pass → Move to next test
   - ❌ Fail → Continue to Attempt 3

#### Phase 5: Attempt 3 - Final Recovery
1. Deep analysis of failure
2. Check self-healer logs for discovered selectors
3. Apply advanced healing:
   - More selector fallbacks
   - Increased wait times
   - Interactive fixes (click label first)
   - Special handling
4. Final re-execution
5. Document outcome

#### Phase 6: Report Generation
1. Generate Playwright test results
2. Create healing summary
3. Document metrics:
   - Pass rate by attempt
   - Selectors updated
   - Test data fixed
   - Healing success rate

### Outputs

#### 1. Playwright test results → `test-results/`
- Test execution data
- Screenshots on failures
- Test metrics
- Timing information

#### 2. Healing Logs → `healing-logs/healing-sessions.log`
```
✓ Found element using: button[class*="btn-primary"]
⚠ Failed initial selector: button:has-text("Sign In")
✓ Successfully clicked element
⏱ Wait timeout after: 5000ms
💾 Caching result for next attempt
```

#### 3. Updated Artifacts (if needed)
- `Locators/[PageName]-Locators.ts` - New selectors added
- `Test_Data/[STORY_ID]-test-data.json` - Corrected data
- `tests/[STORY_ID]/[STORY_ID]-Script.spec.ts` - Fixed logic

#### 4. Playwright HTML reports → `playwright-report/index.html`
- Test summary
- Pass/fail breakdown
- Screenshots
- Healing metrics
- Detailed test results

### Invocation
```typescript
invokeSubAgent({
  name: "playwright-healer-agent",
  prompt: "Execute tests in headed mode with self-healing up to 3 attempts per test...",
  explanation: "Running DRY RUN and implementing automated recovery strategies"
})
```

### Document
See: `.github/agents/Playwright Healer Agent.md`

---

## Workflow: Complete Picture

```
Story from Jira/ADO
        ↓
┌─────────────────────────────────────┐
│  PLANNER AGENT                      │
│  ✓ Analyzes requirements            │
│  ✓ Generates test cases (MD)        │
│  ✓ Covers: Happy + Negative + Edge  │
│  ✓ Output: specs/[STORY_ID]-TEST-CASES.md
└─────────────────────────────────────┘
        ↓
┌─────────────────────────────────────┐
│  GENERATOR AGENT                    │
│  ✓ Creates locators (TS)            │
│  ✓ Builds page objects (TS)         │
│  ✓ Generates test scripts (TS)      │
│  ✓ Creates test data (JSON)         │
│  ✓ Output: pages/, Locators/, tests/, Test_Data/
└─────────────────────────────────────┘
        ↓
┌─────────────────────────────────────┐
│  HEALER AGENT                       │
│  ✓ Execute tests (Attempt 1)        │
│  ✓ Analyze failures                 │
│  ✓ Implement fixes (Attempt 2)      │
│  ✓ Final recovery (Attempt 3)       │
│  ✓ Generate reports                 │
│  ✓ Output: playwright-report/, healing-logs/
└─────────────────────────────────────┘
        ↓
Final Test Report & Metrics
```

---

## Benefits of Three-Agent Architecture

| Benefit | How It's Achieved |
|---------|-------------------|
| **Specialization** | Each agent has focused responsibility |
| **Consistency** | Each agent follows strict patterns |
| **Quality** | Agents build on each other's output |
| **Scalability** | Can handle multiple stories in parallel |
| **Maintainability** | Changes to one agent don't affect others |
| **Traceability** | Each agent's work is logged and documented |
| **Automation** | Complete end-to-end without manual intervention |
| **Recovery** | Multiple healing attempts per test |

---

## When to Invoke Each Agent

### Planner Agent
- **When**: New story arrives in Jira/ADO
- **Input**: Story description, acceptance criteria
- **Output**: Test case specification (MD file)
- **Time**: ~5-10 minutes per story
- **Example**: `Story SNOW-1 → 8 test cases in specs/SNOW-1-TEST-CASES.md`

### Generator Agent
- **When**: Test cases ready (from Planner or manual)
- **Input**: Test case markdown + UI screenshots (optional)
- **Output**: Page objects, test scripts, locators, test data (TS + JSON)
- **Time**: ~10-20 minutes per story
- **Example**: `Test cases → pages/ServiceNowLoginPage.ts + tests/SNOW-1/SNOW-1-Script.spec.ts`

### Healer Agent
- **When**: Generated test scripts ready
- **Input**: Test scripts + page objects + locators
- **Output**: Test execution results + healing logs + Playwright HTML reports
- **Time**: ~15-30 minutes per story (depends on failures)
- **Example**: `Test script → All 8 tests run → 6 pass Attempt 1, 2 healed Attempt 2`

---

## Invocation Examples

### Invoke All Three Agents (Full Workflow)
```typescript
// Step 1: Planner
await invokeSubAgent({
  name: "playwright-planner-agent",
  prompt: "Generate test cases from SNOW-1 story...",
  explanation: "Planning test scenarios"
});

// Step 2: Generator
await invokeSubAgent({
  name: "playwright-generator-agent",
  prompt: "Generate page objects from test cases...",
  explanation: "Creating automation code"
});

// Step 3: Healer
await invokeSubAgent({
  name: "playwright-healer-agent",
  prompt: "Execute tests with self-healing...",
  explanation: "Running tests and fixing failures"
});
```

### Invoke Only Generator (Already Have Test Cases)
```typescript
await invokeSubAgent({
  name: "playwright-generator-agent",
  prompt: "Generate code from existing test cases in specs/STORY-001-TEST-CASES.md...",
  explanation: "Creating page objects and test scripts"
});
```

### Invoke Only Healer (Already Have Scripts)
```typescript
await invokeSubAgent({
  name: "playwright-healer-agent",
  prompt: "Execute tests/STORY-001/STORY-001-Script.spec.ts with healing...",
  explanation: "Running DRY RUN with self-healing"
});
```

---

## Success Metrics

### Planner Agent Success
- ✅ 3-5 test cases per story
- ✅ All acceptance criteria covered
- ✅ Mix of positive, negative, edge cases
- ✅ Clear, executable test steps

### Generator Agent Success
- ✅ All files created (locators, pages, tests, data)
- ✅ No TypeScript compilation errors
- ✅ Page objects extend BasePage
- ✅ Tests use page objects only
- ✅ Data is externalized in JSON

### Healer Agent Success
- ✅ 80%+ tests pass on Attempt 1
- ✅ Remaining tests pass by Attempt 3
- ✅ Healing logs show adaptation
- ✅ Playwright HTML reports generated
- ✅ Artifacts updated with fixes

---

## Troubleshooting

### Planner Agent Issues
- **No test cases generated**: Check story description is complete
- **Missing scenarios**: Verify acceptance criteria are detailed
- **Solution**: Provide more context and examples

### Generator Agent Issues
- **Compilation errors**: Check locator syntax and imports
- **Page objects missing methods**: Verify test cases were analyzed
- **Solution**: Verify test cases are complete and clear

### Healer Agent Issues
- **Tests won't run**: Check page objects compile
- **All tests fail**: Verify locators are correct for application
- **Healing fails**: Increase selector fallbacks or add explicit waits
- **Solution**: Review logs and add more selector variations

---

## Document References

- **Planner Agent**: `.github/agents/Playwright Planner Agent.md`
- **Generator Agent**: `.github/agents/Playwright Generator Agent.md`
- **Healer Agent**: `.github/agents/Playwright Healer Agent.md`
- **Orchestrator Agent**: `.github/agents/Playwright Orchestrated Agent.md`
- **Framework Guidelines**: `instruction.md`
- **Workflow Details**: `.github/agents/THREE-AGENT-ARCHITECTURE.md` (this file)

---

## Version Information

- **Architecture Version**: 1.0
- **Created**: 2024
- **Framework**: Playwright Pure POM with Self-Healing
- **Status**: Production Ready
- **Last Updated**: 2026-09-15

---

## Key Takeaways

✅ **Three specialized agents** working in sequence
✅ **Each agent builds on previous output** (dependency chain)
✅ **Complete automation** from story to execution
✅ **Automated healing** for test failures
✅ **Self-documenting** through logs and reports
✅ **Scalable** for multiple stories in parallel
✅ **Maintainable** with focused responsibilities
