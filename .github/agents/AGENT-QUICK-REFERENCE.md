# Agent Quick Reference Guide

## Which Agent to Invoke?

| Scenario | Agent | Command | Output |
|----------|-------|---------|--------|
| New story ready | **Planner** | `invokeSubAgent("playwright-planner-agent", "Generate test cases...")` | `specs/[STORY_ID]-TEST-CASES.md` |
| Test cases ready | **Generator** | `invokeSubAgent("playwright-generator-agent", "Generate code...")` | `pages/`, `Locators/`, `tests/`, `Test_Data/` |
| Scripts ready | **Healer** | `invokeSubAgent("playwright-healer-agent", "Execute tests...")` | `playwright-report/`, `healing-logs/` |
| Everything | **All 3** | Run Planner → Generator → Healer | Complete automation end-to-end |

---

## Agent 1: Planner Agent

**What it does**: Analyzes story and generates test cases

```
Input:  Story from Jira/ADO (requirements, acceptance criteria)
        ↓
Process: Analyze requirements, identify scenarios, generate test steps
        ↓
Output: specs/[STORY_ID]-TEST-CASES.md
```

**How to invoke**:
```typescript
await invokeSubAgent({
  name: "playwright-planner-agent",
  prompt: "Generate comprehensive test cases for SNOW-1 story. Cover happy path, negative scenarios, and edge cases.",
  explanation: "Planning test scenarios from story requirements"
})
```

**Success looks like**:
- ✅ 3-5 test cases generated
- ✅ Mix of positive, negative, edge cases
- ✅ Each test case has ID, steps, expected results
- ✅ Test data requirements identified

**Document**: `.github/agents/Playwright Planner Agent.md`

---

## Agent 2: Generator Agent

**What it does**: Creates page objects and test scripts from test cases

```
Input:  Test cases (from Planner or manual)
        ↓
Process: Generate locators, page objects, test data, test scripts
        ↓
Output: Production-ready automation code
```

**How to invoke**:
```typescript
await invokeSubAgent({
  name: "playwright-generator-agent",
  prompt: "Generate page objects and test scripts from test cases in specs/SNOW-1-TEST-CASES.md. Create locators with fallback selectors.",
  explanation: "Creating automation code following POM pattern"
})
```

**Success looks like**:
- ✅ `Locators/SNOW-1-Locators.ts` created
- ✅ `pages/ServiceNowLoginPage.ts` extends BasePage
- ✅ `tests/SNOW-1/SNOW-1-Script.spec.ts` with all test cases
- ✅ `Test_Data/SNOW-1-test-data.json` with test inputs
- ✅ No TypeScript compilation errors

**Document**: `.github/agents/Playwright Generator Agent.md`

---

## Agent 3: Healer Agent

**What it does**: Executes tests and heals failures automatically

```
Input:  Test scripts + page objects + locators
        ↓
Process: Run tests, analyze failures, apply healing, re-run
        ↓
Output: Test results + healing logs + Playwright HTML reports
```

**How to invoke**:
```typescript
await invokeSubAgent({
  name: "playwright-healer-agent",
  prompt: "Execute tests/SNOW-1/SNOW-1-Script.spec.ts in headed mode with single worker. Self-heal up to 3 attempts per test case.",
  explanation: "Running DRY RUN with automated failure recovery"
})
```

**Success looks like**:
- ✅ All tests executed (visible browser)
- ✅ Failures analyzed
- ✅ Fixes attempted (up to 3 per test)
- ✅ `playwright-report/index.html` generated
- ✅ `healing-logs/healing-sessions.log` with diagnostics
- ✅ 80%+ tests pass Attempt 1 or 2

**Document**: `.github/agents/Playwright Healer Agent.md`

---

## Complete Workflow

### Fastest Path: Invoke All 3 Agents

```typescript
// Step 1: Generate test cases
invokeSubAgent("playwright-planner-agent", 
  "Generate test cases for SNOW-1...")

// Step 2: Generate code
invokeSubAgent("playwright-generator-agent",
  "Generate page objects from test cases...")

// Step 3: Execute and heal
invokeSubAgent("playwright-healer-agent",
  "Execute tests with self-healing...")

// Result: Full end-to-end automation complete!
```

**Time to completion**: ~30-60 minutes per story

---

## Key Features

### Planner Agent
- ✅ Analyzes acceptance criteria
- ✅ Generates test scenarios
- ✅ Covers: Happy + Negative + Edge
- ✅ Creates step-by-step test cases
- ✅ Identifies test data needs

### Generator Agent
- ✅ Creates page objects extending BasePage
- ✅ Generates locators with fallbacks
- ✅ Creates ONE test file per story
- ✅ Externalizes test data to JSON
- ✅ Uses POM pattern (no assertions in pages)

### Healer Agent
- ✅ Executes in headed mode (visible browser)
- ✅ Single worker for sequential execution
- ✅ Up to 3 self-healing attempts per test
- ✅ Analyzes root causes
- ✅ Updates artifacts with fixes
- ✅ Generates Playwright HTML reports

---

## Common Invocation Patterns

### Pattern 1: New Story Start to Finish
```typescript
// 1. Planner: Generate test cases
invokeSubAgent("playwright-planner-agent", 
  "Analyze SNOW-1 and generate test cases...")

// 2. Generator: Create code
invokeSubAgent("playwright-generator-agent",
  "Generate page objects from specs/SNOW-1-TEST-CASES.md...")

// 3. Healer: Execute and fix
invokeSubAgent("playwright-healer-agent",
  "Execute tests/SNOW-1/SNOW-1-Script.spec.ts with healing...")
```

### Pattern 2: Test Cases Already Exist
```typescript
// Skip Planner, start with Generator
invokeSubAgent("playwright-generator-agent",
  "Generate code from existing test cases in specs/KAN-1-TEST-CASES.md...")

// Then run Healer
invokeSubAgent("playwright-healer-agent",
  "Execute tests/KAN-1/KAN-1-Script.spec.ts...")
```

### Pattern 3: Code Already Exists, Just Execute
```typescript
// Skip Planner and Generator, just run Healer
invokeSubAgent("playwright-healer-agent",
  "Execute existing tests with healing...")
```

---

## Output Locations

| Agent | Output Files |
|-------|--------------|
| **Planner** | `specs/[STORY_ID]-TEST-CASES.md` |
| **Generator** | `Locators/`, `pages/`, `tests/`, `Test_Data/` |
| **Healer** | `playwright-report/`, `healing-logs/`, `screenshots/` |

---

## Troubleshooting

### Planner Agent
**Problem**: No test cases generated
**Solution**: Provide detailed story description and acceptance criteria

**Problem**: Missing test scenarios
**Solution**: Explicitly ask for positive, negative, and edge cases

### Generator Agent
**Problem**: Compilation errors
**Solution**: Check locator syntax and TypeScript imports

**Problem**: Test scripts not using page objects
**Solution**: Verify test cases were clear and complete

### Healer Agent
**Problem**: Tests won't run
**Solution**: 
1. Verify page objects compile: `npx tsc --noEmit`
2. Check locators are correct for the app
3. Try running manually: `npm run pw:test:headed`

**Problem**: All tests fail
**Solution**: 
1. Add more selector fallbacks to locators
2. Increase timeouts
3. Check test data matches current UI

**Problem**: Healing doesn't work
**Solution**: 
1. Review healing logs: `tail healing-logs/healing-sessions.log`
2. Check screenshots in `test-results/`
3. Add explicit waits and clicks
4. Verify selectors are semantic (has-text, role, data-*)

---

## Agent Parameters Explained

### Planner Agent Parameters
```typescript
prompt: "Generate test cases for [STORY_ID] covering..."
// What: Clear story context and what to test
// Include: Story ID, acceptance criteria, workflows, edge cases

explanation: "Planning test scenarios from [STORY_ID] requirements"
// Why: Brief reason for invoking
```

### Generator Agent Parameters
```typescript
prompt: "Generate page objects and test scripts from specs/[STORY_ID]-TEST-CASES.md"
// What: Test case file location and output expectations
// Include: Specific test case file, desired output location

explanation: "Creating automation code following POM pattern"
// Why: Brief reason for invoking
```

### Healer Agent Parameters
```typescript
prompt: "Execute tests/[STORY_ID]/[STORY_ID]-Script.spec.ts in headed mode..."
// What: Which test file, execution mode, healing strategy
// Include: Test file path, headed mode, single worker, 3 attempts

explanation: "Running DRY RUN with automated failure recovery"
// Why: Brief reason for invoking
```

---

## Expected Timeline

| Step | Agent | Time | Deliverable |
|------|-------|------|-------------|
| 1 | Planner | 5-10 min | Test cases (MD) |
| 2 | Generator | 10-20 min | Code (TS, JSON) |
| 3 | Healer | 15-30 min | Results + Report |
| **Total** | **All 3** | **30-60 min** | **Complete automation** |

*Times vary based on story complexity and test failures*

---

## Success Checklist

### After Planner Agent
- [ ] `specs/[STORY_ID]-TEST-CASES.md` created
- [ ] 3-5 test cases generated
- [ ] All acceptance criteria covered
- [ ] Clear preconditions and steps
- [ ] Test data requirements identified

### After Generator Agent
- [ ] `Locators/` files created with fallbacks
- [ ] `pages/` files extend BasePage
- [ ] `tests/` files in ONE file per story
- [ ] `Test_Data/` JSON created
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] All imports resolve correctly

### After Healer Agent
- [ ] Tests execute without crashing
- [ ] Screenshots captured on failures
- [ ] Healing logs generated
- [ ] Playwright HTML reports created: `npx playwright show-report`
- [ ] 80%+ tests pass (Attempt 1 or 2)
- [ ] Failures documented with root causes
- [ ] Artifacts updated with fixes

---

## Quick Commands

```bash
# Invoke Planner Agent
# (Use invokeSubAgent tool in IDE)

# Invoke Generator Agent
# (Use invokeSubAgent tool in IDE)

# Invoke Healer Agent
# (Use invokeSubAgent tool in IDE)

# Or run tests manually:
npx playwright test tests/[STORY_ID]/[STORY_ID]-Script.spec.ts --workers=1 --headed

# View healing logs:
tail healing-logs/healing-sessions.log

# Generate Playwright HTML reports:
npx playwright test
npx playwright show-report

# Check TypeScript compilation:
npx tsc --noEmit
```

---

## Document Map

```
.github/agents/
├── Playwright Orchestrated Agent.md      ← Main coordinator
├── Playwright Planner Agent.md           ← Test case generation
├── Playwright Generator Agent.md         ← Code generation
├── Playwright Healer Agent.md            ← Test execution & healing
├── THREE-AGENT-ARCHITECTURE.md           ← Architecture overview
└── AGENT-QUICK-REFERENCE.md              ← This file
```

---

## When to Read Each Document

| Document | When to Read |
|----------|--------------|
| **Orchestrated Agent** | Understanding complete workflow |
| **Planner Agent** | Before invoking test case generation |
| **Generator Agent** | Before invoking code generation |
| **Healer Agent** | Before invoking test execution |
| **Three-Agent Architecture** | Understanding how agents work together |
| **Quick Reference** | Fast lookup for commands and patterns |

---

## Pro Tips

✅ **Start small**: Test with one story before scaling
✅ **Read logs**: Healing logs are your friend for debugging
✅ **Add fallbacks**: More selector fallbacks = more resilient tests
✅ **Use semantics**: Prefer `:has-text()`, role, data-* over brittle CSS
✅ **Monitor execution**: Watch headed mode browser for UI insights
✅ **Keep data clean**: Well-organized test data prevents 80% of issues
✅ **Document patterns**: Note UI quirks for future reference

---

**Last Updated**: 2026-09-15  
**Status**: Production Ready  
**Version**: 1.0
