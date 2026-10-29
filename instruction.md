# Playwright Pure Page Object Model (POM) Framework with Integrated Test Agents

## Overview

This is an **enterprise-grade test automation framework** using:
- **Pure POM Pattern** - No feature files, only TypeScript page objects
- **Self-Healing Capabilities** - Automatic element locator adaptation on UI changes
- **Playwright + TypeScript** - Modern, fast, and reliable automation
- **Three Integrated Test Agents** - Planner, Generator, and Healer for end-to-end automation
- **Playwright HTML reporting** - Comprehensive test reporting and analytics

**Key Principle**: Separation of concerns - Locators ≠ Page Objects ≠ Tests ≠ Test Data

**Three-Agent Architecture**:
- **Planner Agent** - Analyzes requirements and generates comprehensive test cases
- **Generator Agent** - Creates page objects and test scripts from test cases
- **Healer Agent** - Executes tests, analyzes failures, and suggests/implements fixes

---

## Three-Agent Orchestration Model

This framework integrates three specialized Playwright Test Agents that work together to automate the complete test lifecycle:

### **1. Planner Agent**
**Role**: Test Planning & Case Generation  
**When Used**: Step 2 of workflow

**Responsibilities**:
- Analyze work item requirements and acceptance criteria
- Identify affected pages and user workflows
- Generate comprehensive test scenarios:
  - Happy path (positive scenarios)
  - Negative scenarios (error handling)
  - Edge cases (boundary conditions)
  - Regression scenarios
- Create test case specifications with:
  - Clear numbered steps
  - Expected results
  - Test data requirements
  - Priority and type classification
- Ensure adequate test coverage across all requirements

**Output**: `specs/[STORY_ID]-TEST-CASES.md`

**Key Features**:
- Requirements-driven test planning
- Traceability from acceptance criteria to test cases
- Comprehensive coverage analysis
- Clear, automation-ready specifications

---

### **2. Generator Agent**
**Role**: Code Generation (Page Objects & Test Scripts)  
**When Used**: Steps 5 & 7 of workflow

**Responsibilities**:
- Generate page objects:
  - Extend `BasePage` for self-healing
  - Implement business-level action methods
  - Use self-healing BasePage methods for all interactions
  - No assertions in page objects
  - Comprehensive documentation
  
- Generate test scripts:
  - Follow strict POM pattern
  - Create one file per story containing ALL test cases
  - Import and use page objects exclusively
  - Reference externalized test data from JSON files
  - Include Playwright test annotations (@severity, @testType)
  - Implement `test.step()` for clear step hierarchy
  - Add error handling and screenshot capture

**Output**: 
- `pages/[PageName].ts` - Page objects with self-healing
- `tests/[STORY_ID]/[STORY_ID]-Script.spec.ts` - Test scripts

**Key Features**:
- AST-based code generation for TypeScript
- Automatic method creation from test cases
- Self-healing integration built-in
- Playwright annotation templates
- Error handling scaffolding

---

### **3. Healer Agent**
**Role**: Test Execution, Failure Analysis, & Self-Healing  
**When Used**: Steps 8 & 9 of workflow

**Responsibilities**:
- Execute tests:
  - Run test suite with monitoring
  - Execute in headed mode for visibility
  - Capture execution metrics
  
- Analyze failures:
  - Categorize failure types:
    - Selector not found (UI changed)
    - Timeout (performance issue)
    - Data mismatch (test data issue)
    - Logic error (test code issue)
  - Review Playwright HTML reports and screenshots
  - Check healing logs for attempted recovery
  
- Suggest and implement fixes:
  - Selector updates (add to fallbacks)
  - Timing adjustments (waits/adaptive waits)
  - Test data corrections
  - Logic fixes
  
- Track healing:
  - Monitor self-healing attempts
  - Update locators with new selectors
  - Build healing history for trends
  - Calculate selector stability metrics

**Output**: 
- Updated locators with new selector fallbacks
- Fixed test data and test scripts
- Healing logs and diagnostics
- Test execution reports

**Key Features**:
- Automated root cause analysis
- Locator self-healing with fallback strategies
- Smart retry with exponential backoff
- Healing logs with detailed diagnostics
- Selector stability recommendations

---

## Agent Workflow Integration

The three agents work in sequence to automate the complete test lifecycle:

```
Work Item Requirements
        ↓
[Planner Agent]
├─ Analyze requirements
├─ Identify scenarios
├─ Generate test cases
└─ Output: specs/[STORY_ID]-TEST-CASES.md
        ↓
Manual Artifact Generation (Locators, Test Data)
        ↓
[Generator Agent]
├─ Generate Page Objects
│  ├─ Extend BasePage
│  ├─ Create action methods
│  └─ Output: pages/[PageName].ts
│
├─ Generate Test Scripts
│  ├─ Create test specs from test cases
│  ├─ Use page objects and test data
│  └─ Output: tests/[STORY_ID]/[STORY_ID]-Script.spec.ts
        ↓
[Healer Agent]
├─ Execute Tests (npm run pw:test:headed)
├─ Monitor Results
├─ Analyze Failures
│  ├─ Identify root causes
│  ├─ Review logs and screenshots
│  └─ Suggest fixes
├─ Implement Fixes
│  ├─ Update locators
│  ├─ Fix test data
│  └─ Correct logic
├─ Re-execute & Verify
└─ Generate Healing Report
        ↓
Test Execution Summary & Playwright HTML reports
```

---

## When to Use Each Agent

| Agent | Trigger | Input | Output | Success Criteria |
|-------|---------|-------|--------|------------------|
| **Planner** | New story/work item | Requirements, AC | Test cases (MD) | 3-5 test cases, full coverage |
| **Generator** | Test cases ready | Test cases, Locators, Data | Page objects, Test scripts | Code generation complete |
| **Healer** | Tests ready to run | Test scripts | Fixed tests, Updated locators | All tests pass or issues documented |

---

```
Orchestrator_Platform/
├── Locators/                       [Centralized Selector Definitions]
│   ├── index.ts                   # Main export file
│   ├── README.md                  # Locator guidelines
│   ├── <STORY_ID>-Locators.ts
│   └── ApplicationB-Locators.ts
│
├── pages/                         [Page Objects with Self-Healing]
│   ├── BasePage.ts               # Base class with self-healing methods
│   ├── ApplicationAPage.ts
│   └── ApplicationBPage.ts
│
├── utils/                         [Reusable Utilities]
│   ├── SelfHealing.ts            # Self-healing engine
│   ├── CommonUtils.ts            # Common helper functions
│   └── TensaiExecutor.ts         # TensaiNG integration
│
├── Test_Data/                     [Externalized Test Data]
│   ├── STORY-001-test-data.json
│   ├── STORY-002-test-data.json
│   └── [STORY_ID]-test-data.json
│
├── tests/                         [Test Scripts - Pure POM]
│   ├── STORY-001/
│   │   └── STORY-001-Script.spec.ts  # All test cases in one file
│   ├── STORY-002/
│   │   └── STORY-002-Script.spec.ts
│   └── [STORY_ID]/
│       └── [STORY_ID]-Script.spec.ts
│
├── specs/                         [Test Case Documentation]
│   ├── STORY-001-TEST-CASES.md
│   ├── STORY-002-TEST-CASES.md
│   └── [STORY_ID]-TEST-CASES.md
│
├── test-results/               [Test Execution Results]
├── healing-logs/                 [Self-Healing Diagnostics]
└── playwright.config.ts          [Playwright Configuration]
```

---

## Directory Guidelines

### 1. `Locators/` - Centralized Element Selectors

**Purpose**: Single source of truth for all UI element selectors

**Naming rules** (generator and agents follow these exactly):
- Folder: `Locators/` with a capital L. Never `locators/`.
- File: `Locators/<STORY_ID>-Locators.ts`. Scoped runs: `Locators/<artifactFolder>/<STORY_ID>-Locators.ts`.
- Export: one constant `<PascalStoryId>PageLocators`.
- Page objects import it from `../Locators/<STORY_ID>-Locators`.

**Structure**: 
- One locators file per page: `<STORY_ID>-Locators.ts`
- Organized by semantic sections (AUTH, FORMS, NAVIGATION, etc.)
- Multiple CSS selectors per element for self-healing fallback

**Best Practices**:
✅ Organize locators by functional areas
✅ Provide multiple selector fallbacks
✅ Use semantic locators (`:has-text()`, role-based)
✅ Include labels and error message locators
✅ Document complex selector choices

❌ Single locator per element (no fallback)
❌ Scattered locators in page objects
❌ Overly specific selectors (brittle)
❌ Mix of XPath and CSS (inconsistent)

**Example**:
```typescript
// Locators/<STORY_ID>-Locators.ts
const AUTH_LOCATORS = {
  usernameInput: 'input[name="user_name"], input[id="username"], input[placeholder="Username"]',
  signInButton: 'button:has-text("Sign In"), button[type="submit"]',
};

export const ApplicationALocators = {
  ...AUTH_LOCATORS,
};
```

**Reference**: See `Locators/README.md` for complete guidelines

---

### 2. `pages/` - Page Objects with Self-Healing

**Purpose**: Abstraction layer for UI interactions using POM pattern

**Key Concepts**:
- All page objects **MUST extend `BasePage`** for self-healing capabilities
- Implement **business-level actions**, not UI-level steps
- Use centralized locators from `Locators/` directory
- **NO assertions** in page objects - only interactions
- All methods use self-healing: `this.click()`, `this.fill()`, etc.

**File Naming**: `[PageName].ts` (e.g., `ApplicationAPage.ts`)

**Best Practices**:

✅ **Good - Business-level methods**:
```typescript
export class LoginPage extends BasePage {
  async login(username: string, password: string) {
    await this.fill(Locators.usernameInput, username);
    await this.fill(Locators.passwordInput, password);
    await this.click(Locators.signInButton);
  }
}
```

❌ **Bad - UI-level methods**:
```typescript
async clickUsernameField() { ... }
async typeInUsername(username) { ... }
async clickSignInButton() { ... }
```

**Self-Healing Integration**:
All BasePage methods automatically handle:
- Element location with fallback selectors
- Automatic retry on failure
- Scrolling to element
- Adaptive waits
- Comprehensive logging

**Available Methods** (inherited from BasePage):
- Interactions: `click()`, `fill()`, `type()`, `clear()`, `selectOption()`, `check()`, `uncheck()`
- State checks: `isVisible()`, `isEnabled()`, `isChecked()`, `containsText()`
- Waits: `waitForElement()`, `waitForElementHidden()`, `waitForNavigation()`, `adaptiveWait()`
- Utilities: `scrollToElement()`, `takeScreenshot()`, `getHealingLogs()`

**Example Page Object**:
```typescript
// pages/ApplicationAPage.ts
import { Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { ApplicationALocators as Locators } from '../Locators/<STORY_ID>-Locators';

export class ApplicationAPage extends BasePage {
  constructor(page: Page) {
    super(page);
    this.pageName = 'ApplicationAPage';
  }

  async login(username: string, password: string): Promise<void> {
    await this.fill(Locators.usernameInput, username, { description: 'Username' });
    await this.fill(Locators.passwordInput, password, { description: 'Password' });
    await this.click(Locators.signInButton, { description: 'Sign In Button' });
    await this.waitForNavigation();
    this.log('Login successful');
  }

  async createRequest(requestData: any): Promise<void> {
    await this.click(Locators.newRequestButton);
    await this.fill(Locators.requestTitleInput, requestData.title);
    await this.selectOption(Locators.requestTypeSelect, requestData.type);
    await this.click(Locators.requestFormSubmitButton);
    this.log(`Request created: ${requestData.title}`);
  }

  async getHealingLogs(): string[] {
    return super.getHealingLogs();
  }
}
```

---

### 3. `Test_Data/` - Externalized Test Data

**Purpose**: Keep test data separate from test logic

**Structure**: JSON files organized by story ID
- File naming: `[STORY_ID]-test-data.json`
- One data file per story/feature
- Organized by test case or logical grouping

**Best Practices**:

✅ Data externalization
✅ Multiple test scenarios per file
✅ Clear key naming
✅ Comments for complex data

❌ Hardcoded values in tests
❌ Scattered data across files
❌ Ambiguous data structure

**Example**:
```json
{
  "credentials": {
    "username": "test_user@example.com",
    "password": "SecurePassword123"
  },
  "requestData": {
    "validRequest": {
      "title": "Process Improvement Initiative",
      "type": "Enhancement",
      "financialSection": "Q1 2026",
      "details": "Implementation details"
    }
  },
  "resourceAssignment": {
    "projectManager": {
      "role": "Project Manager",
      "effortType": "Hours",
      "effort": 200
    }
  }
}
```

**Usage in Tests**:
```typescript
import testData from '../../Test_Data/STORY-001-test-data.json';

await page.createRequest(testData.requestData.validRequest);
```

---

### 4. `tests/` - Test Scripts (Pure POM)

**Purpose**: Test execution logic using page objects

**File Structure**:
- Directory per story: `tests/[STORY_ID]/`
- ONE test file per story: `[STORY_ID]-Script.spec.ts`
- ALL test cases for a story in one file

❌ **DON'T create**:
- `tests/STORY-001/TC_STORY001_001.spec.ts` (separate per test case)
- `tests/[TEST_CASE_ID].spec.ts` (flat structure)

✅ **DO create**:
- `tests/STORY-001/STORY-001-Script.spec.ts` (all STORY-001 tests)
- `tests/STORY-002/STORY-002-Script.spec.ts` (all STORY-002 tests)

**Best Practices**:

✅ Use page objects for all interactions
✅ Use test data from `Test_Data/`
✅ Include Playwright test annotations
✅ Use `test.step()` for clarity
✅ Log healing information
✅ Capture screenshots on failure

❌ Direct element interaction (`page.locator()`)
❌ Hardcoded test data
❌ Assertions in page objects
❌ Complex logic in tests

**Example Test Script**:
```typescript
// tests/STORY-001/STORY-001-Script.spec.ts
import { test, expect } from '@playwright/test';
import { ApplicationAPage } from '../../pages/ApplicationAPage';
import testData from '../../Test_Data/STORY-001-test-data.json';

test.describe('STORY-001: Application Workflow', () => {
  let applicationPage: ApplicationAPage;

  test.beforeEach(async ({ page }) => {
    applicationPage = new ApplicationAPage(page);
  });

  test('TC_STORY001_001 - User successfully logs in', async ({ page }) => {
    test.info().annotations.push({
      type: 'severity',
      description: 'Critical',
    });
    test.info().annotations.push({
      type: 'testType',
      description: 'Smoke',
    });

    try {
      // Step 1: Navigate to application
      await test.step('Navigate to application URL', async () => {
        await applicationPage.navigateTo(testData.baseUrl);
      });

      // Step 2: Perform login
      await test.step('Enter credentials and sign in', async () => {
        await applicationPage.login(
          testData.credentials.username,
          testData.credentials.password
        );
      });

      // Step 3: Verify login successful
      await test.step('Verify successful login', async () => {
        const url = await applicationPage.getCurrentUrl();
        expect(url).toContain('dashboard');
        
        // Log healing information
        const healingLogs = applicationPage.getHealingLogs();
        console.log('Healing Logs:', healingLogs);
      });
    } catch (error) {
      await applicationPage.takeScreenshot('TC_STORY001_001-FAILED');
      throw error;
    }
  });
});
```

**Test Execution**:
```bash
npx playwright test        # Run all tests with Playwright HTML reports
npm run pw:test:ui           # Run in UI mode (interactive)
npm run pw:test:debug        # Run in debug mode
npm run pw:test:headed       # Run with visible browser
```

---

### 5. `utils/` - Reusable Utilities

**Purpose**: Common functions and self-healing engine

**Contains**:
- `SelfHealing.ts` - Self-healing engine with adaptive element finding
- `CommonUtils.ts` - Common helper functions
- `TensaiExecutor.ts` - TensaiNG framework integration (optional)

**SelfHealer Features**:
- Multiple locator fallback
- Retry with exponential backoff
- Adaptive waits based on network
- Safe click and fill operations
- Automatic scrolling
- Healing logs
- Element suggestion

**Usage** (automatic via BasePage):
```typescript
// These automatically use self-healing:
await this.click(selector);
await this.fill(selector, value);
await this.waitForElement(selector);
```

**Manual Usage** (if needed):
```typescript
import { SelfHealer } from '../utils/SelfHealing';

const healer = new SelfHealer(page);
await healer.safeClick('button:has-text("Login")');
```

---

### 6. `specs/` - Test Case Documentation

**Purpose**: Human-readable test case specifications

**File Format**: Markdown (`.md`)
**File Naming**: `[STORY_ID]-TEST-CASES.md`

**Structure**:
```markdown
## Test Case: TC_STORY001_001

**Title**: User successfully logs in  
**Preconditions**: User has valid credentials  
**Priority**: Critical  
**Type**: Positive / Negative / Edge  

### Steps:
1. Navigate to login page
2. Enter username
3. Enter password
4. Click Sign In

### Expected Results:
- User is logged in
- Dashboard is displayed

### Test Data:
- username: test@example.com
- password: password123
```

**Purpose**: Documentation for stakeholders, not automated


---

## Self-Healing Capabilities

### What is Self-Healing?

Self-healing automatically adapts to UI changes without requiring manual selector updates:

1. **Multiple Locator Fallback**: Try multiple selectors in order
2. **Automatic Retry**: Retry with exponential backoff on failure
3. **Intelligent Waiting**: Adapt waits based on network conditions
4. **Element Suggestion**: Suggest alternative locators if primary fails
5. **Comprehensive Logging**: Track all healing attempts for diagnostics

### How It Works

```typescript
// In locators file - provide multiple selectors:
submitButton: 'button:has-text("Submit"), button[type="submit"], button[class*="submit"]'

// In page object - use BasePage methods:
await this.click(Locators.submitButton);

// Self-healer automatically:
// 1. Tries button:has-text("Submit")
// 2. If fails, tries button[type="submit"]
// 3. If fails, tries button[class*="submit"]
// 4. Uses first one that works
// 5. Logs all attempts in healing logs
```

### Healing Logs

All healing activity is logged to `healing-logs/healing-sessions.log`:

```
✓ Found element using: button:has-text("Submit")
✓ Successfully clicked element
⚠ Failed initial selector, trying fallback
✓ Found element using: button[type="submit"]
```

Access logs in tests:
```typescript
const healingLogs = page.getHealingLogs();
console.log(healingLogs);
```

---

## Code Reuse Policy

### Before Creating New Code

**ALWAYS follow this checklist**:

1. **Check existing page objects**: Can I use an existing method?
2. **Check BasePage**: Is there a relevant inherited method?
3. **Check utils**: Is there a helper function?
4. **Check locators**: Are similar selectors already defined?
5. **Only if truly unique**: Create new page object, util, or locator

### Creating New Page Objects

```typescript
// BEFORE creating new page, check:
// 1. Does ApplicationAPage have this method? Reuse it
// 2. Can ApplicationBPage method be adapted? Reuse it
// 3. Is this functionality in BasePage? Use inherited method
// THEN: Create new method only if genuinely unique
```

### Creating New Locators

```typescript
// DO:
✅ Add to existing file if same page
✅ Provide multiple selector fallbacks
✅ Organize by semantic section (AUTH, FORMS, etc.)

// DON'T:
❌ Create locator for every element variant
❌ Use single selector without fallback
❌ Scatter locators across multiple files
```

### Creating New Utils

```typescript
// DO:
✅ Generic, reusable functions only
✅ No page-specific logic
✅ Check if function already exists
✅ Clear documentation

// DON'T:
❌ Page-specific selectors or logic
❌ Duplicate existing functions
❌ Complex business logic
```

### Creating New Test Data

```typescript
// DO:
✅ Organize by story ID
✅ Group related data logically
✅ Use clear key names
✅ Comment on complex data

// DON'T:
❌ Create multiple data files for one story
❌ Hardcode data in tests
❌ Ambiguous structure
```

---

## Common Patterns

### Pattern 1: Simple Page Interaction

```typescript
// Page Object
async fillAndSubmitForm(data: FormData): Promise<void> {
  await this.fill(Locators.nameInput, data.name);
  await this.fill(Locators.emailInput, data.email);
  await this.click(Locators.submitButton);
  await this.waitForNavigation();
}

// Test
await test.step('Fill and submit form', async () => {
  await page.fillAndSubmitForm(testData.formData);
});
```

### Pattern 2: Validation Without Assertion

```typescript
// Page Object (NO assertion)
async isFormDisplayed(): Promise<boolean> {
  return await this.isVisible(Locators.formContainer);
}

// Test (WITH assertion)
await test.step('Verify form is displayed', async () => {
  const isDisplayed = await page.isFormDisplayed();
  expect(isDisplayed).toBe(true);
});
```

### Pattern 3: Multi-Step Workflow

```typescript
// Page Object (each step is a method)
async step1_login(): Promise<void> { ... }
async step2_createIdea(): Promise<void> { ... }
async step3_transformToDemand(): Promise<void> { ... }

// Test (orchestrate steps)
await test.step('Execute workflow', async () => {
  await page.step1_login();
  await page.step2_createIdea();
  await page.step3_transformToDemand();
});
```

### Pattern 4: Self-Healing with Logging

```typescript
// Page Object
async click(selector: string, description?: string): Promise<void> {
  // Self-healing is automatic via BasePage
  await super.click(selector, { description });
  this.log(`${description} clicked`);
}

// Check healing logs
const logs = page.getHealingLogs();
if (logs.some(log => log.includes('⚠'))) {
  console.log('Element selectors were adapted by self-healer');
}
```

---

## Best Practices Checklist

### Page Object Best Practices

- [ ] Extends `BasePage`
- [ ] All methods use self-healing BasePage methods
- [ ] No assertions or validations
- [ ] Uses centralized locators
- [ ] Business-level action methods
- [ ] Comprehensive method documentation
- [ ] Includes healing log tracking
- [ ] Handles UI variations gracefully

### Locator Best Practices

- [ ] Multiple selectors per element (fallback)
- [ ] Semantic CSS selectors (has-text, role-based)
- [ ] Organized by functional section
- [ ] Consistent naming convention
- [ ] Includes related elements (labels, errors)
- [ ] Documented with comments
- [ ] No XPath (CSS preferred)

### Test Script Best Practices

- [ ] Uses only page objects (no direct element interaction)
- [ ] All data from Test_Data JSON files
- [ ] Includes Playwright test annotations (@severity, @testType)
- [ ] Uses test.step() for clarity
- [ ] Captures screenshots on failure
- [ ] Logs healing information
- [ ] Independent and reusable
- [ ] Clear, readable step descriptions

### Test Data Best Practices

- [ ] Organized by story ID
- [ ] Grouped by test case or feature
- [ ] No hardcoded values in tests
- [ ] Clear, consistent key naming
- [ ] Comments for complex data
- [ ] Multiple scenarios per file
- [ ] Secure (no sensitive data)
- [ ] Easy to maintain and update

---

## Troubleshooting

### Test Fails: Element Not Found

**Check**:
1. Is locator in `Locators/<STORY_ID>-Locators.ts`?
2. Does locator have multiple fallback selectors?
3. Check healing logs - did self-healer find alternative?
4. Update locator with new selector variations
5. Re-run test

### Test Flaky: Intermittent Failures

**Check**:
1. Are you using `waitForElement()` before interaction?
2. Is `adaptiveWait()` used in slow-network scenarios?
3. Are locators stable or UI-dependent?
4. Add more selector fallbacks
5. Use `test.step()` for clear diagnostics

### Self-Healing Not Working

**Check**:
1. Page object extends `BasePage`?
2. Using BasePage methods (`click()`, `fill()`)? (not `page.click()`)
3. Healing logs enabled in SelfHealer config?
4. Multiple selectors provided in locator?
5. Check healing logs in console and `healing-logs/`

---

## Execution & Reporting

### Run Tests

```bash
# Run all tests with Playwright HTML reports
npx playwright test

# Run in interactive UI mode
npm run pw:test:ui

# Run with visible browser
npm run pw:test:headed

# Run specific test file
npx playwright test tests/STORY-001/STORY-001-Script.spec.ts

# Run with debug mode
npm run pw:test:debug
```

### Generate & View Reports

```bash
# Playwright generates the HTML report during the test run
# Open the report after the run completes
npx playwright show-report
```

### Healing Logs

```bash
# View recent healing activity
tail -50 healing-logs/healing-sessions.log

# Search for failed selectors
grep "✗" healing-logs/healing-sessions.log

# Find adapted selectors
grep "✓ Found element" healing-logs/healing-sessions.log
```

---

## Quick Reference

| Task | Location | Command |
|------|----------|---------|
| Add locators | `Locators/[Page]-Locators.ts` | Edit file |
| Create page object | `pages/[Page].ts` | Extend BasePage |
| Add test data | `Test_Data/[STORY].json` | Create JSON |
| Write test script | `tests/[STORY]/[STORY]-Script.spec.ts` | Use page objects |
| Run tests | Terminal | `npx playwright test` |
| View healing logs | Terminal | `tail healing-logs/*.log` |
| View test report | Browser | `npx playwright show-report` |

---

## Summary

**This framework provides**:
✅ Pure POM pattern without feature files
✅ Self-healing capabilities for UI changes
✅ Centralized locators and test data
✅ Type-safe TypeScript implementations
✅ Comprehensive Playwright HTML reporting
✅ Healing diagnostics and logs

**Key principles**:
✅ Separation of concerns (locators ≠ pages ≠ tests ≠ data)
✅ Reuse existing code before creating new
✅ All interactions use self-healing BasePage methods
✅ No hardcoded values or assertions in pages
✅ Centralized management of all selectors

**Remember**: The framework is designed for **maintainability, scalability, and resilience**. Follow the patterns, reuse existing code, and let self-healing handle UI variations.
