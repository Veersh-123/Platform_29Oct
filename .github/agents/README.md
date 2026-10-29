# Playwright Orchestrator Agents

Complete agent-based test automation framework with three specialized agents working in coordination.

## 📋 Overview

This directory contains the complete **three-agent orchestration system** for Playwright test automation:

```
┌─────────────────────────────────────┐
│  PLAYWRIGHT ORCHESTRATED AGENT      │
│  Coordinates the complete workflow  │
└─────────────────────────────────────┘
              ↓
    ┌────────┬────────┬────────┐
    ↓        ↓        ↓        ↓
 Planner  Generator  Healer  Support
 Agent    Agent      Agent   Docs
```

## 🎯 Agent Files

### Core Agents

1. **Playwright Orchestrated Agent** (`Playwright Orchestrated Agent.md`)
   - Main coordinator and orchestrator
   - Manages complete workflow from story to execution
   - Delegates to specialized agents
   - Generates final reports

2. **Playwright Planner Agent** (`Playwright Planner Agent.md`)
   - Test case generation from story requirements
   - Comprehensive test scenario analysis
   - Input: Story from Jira/ADO
   - Output: `specs/[STORY_ID]-TEST-CASES.md`

3. **Playwright Generator Agent** (`Playwright Generator Agent.md`)
   - Code artifact generation (locators, page objects, test scripts)
   - Follows pure POM pattern with self-healing
   - Input: Test cases
   - Output: `Locators/`, `pages/`, `tests/`, `Test_Data/`

4. **Playwright Healer Agent** (`Playwright Healer Agent.md`)
   - Test execution with automated healing
   - Up to 3 self-healing attempts per test
   - Comprehensive failure analysis and recovery
   - Input: Test scripts and page objects
   - Output: `playwright-report/`, `healing-logs/`, updated artifacts

### Documentation

5. **THREE-AGENT-ARCHITECTURE** (`THREE-AGENT-ARCHITECTURE.md`)
   - Complete architecture overview
   - How agents work together
   - Invocation examples
   - Success metrics and troubleshooting

6. **AGENT-QUICK-REFERENCE** (`AGENT-QUICK-REFERENCE.md`)
   - Quick lookup guide
   - Common invocation patterns
   - Parameter explanations
   - Pro tips and troubleshooting

## 🚀 Quick Start

### Invoke All Three Agents (Complete Workflow)

```typescript
// Step 1: Planner - Generate test cases
await invokeSubAgent({
  name: "playwright-planner-agent",
  prompt: "Generate comprehensive test cases for SNOW-1 story covering happy path, negative scenarios, and edge cases",
  explanation: "Planning test scenarios from story requirements"
})

// Step 2: Generator - Generate code artifacts
await invokeSubAgent({
  name: "playwright-generator-agent",
  prompt: "Generate page objects and test scripts from specs/SNOW-1-TEST-CASES.md. Create locators with multiple CSS selector fallbacks",
  explanation: "Creating automation code following POM pattern"
})

// Step 3: Healer - Execute and heal tests
await invokeSubAgent({
  name: "playwright-healer-agent",
  prompt: "Execute tests/SNOW-1/SNOW-1-Script.spec.ts in headed mode with single worker. Self-heal up to 3 attempts per test",
  explanation: "Running DRY RUN with automated failure recovery"
})
```

**Result**: Complete end-to-end automation in 30-60 minutes!

## 📦 What Each Agent Creates

### Planner Agent Output
```
specs/
└── SNOW-1-TEST-CASES.md          # 3-5 comprehensive test cases
```

### Generator Agent Output
```
Locators/
├── ServiceNowLoginPage-Locators.ts
├── BrokerWorkspacePage-Locators.ts
├── PlacementFormPage-Locators.ts
├── ProductFormPage-Locators.ts
└── SubmissionPage-Locators.ts

pages/
├── ServiceNowLoginPage.ts
├── BrokerWorkspacePage.ts
├── PlacementFormPage.ts
├── ProductFormPage.ts
└── SubmissionPage.ts

Test_Data/
└── SNOW-1-test-data.json

tests/
└── SNOW-1/
    └── SNOW-1-Script.spec.ts
```

### Healer Agent Output
```
playwright-report/
└── index.html                    # Comprehensive test report

healing-logs/
└── healing-sessions.log          # Detailed healing diagnostics

screenshots/
└── TC_*.png                      # Failure screenshots
```

## 🔄 Agent Workflow

```
Story from Jira/ADO
        ↓
    PLANNER
    (5-10 min)
        ↓
   Test Cases (MD)
        ↓
    GENERATOR
    (10-20 min)
        ↓
Code Artifacts (TS, JSON)
        ↓
     HEALER
    (15-30 min)
        ↓
Execution Results + Report
```

## 📊 Key Features

### Planner Agent 🧠
- Analyzes requirements and acceptance criteria
- Generates 3-5 test cases per story
- Covers: Happy path, negative, edge cases
- Creates automation-ready test specifications

### Generator Agent 🔧
- Generates page objects extending BasePage
- Creates locators with multiple CSS fallbacks
- Generates ONE test file per story
- Externalizes test data to JSON
- Pure POM pattern (no assertions in pages)
- Self-healing integration built-in

### Healer Agent 🩹
- Executes tests in headed mode (visible browser)
- Single worker for sequential execution
- Up to 3 self-healing attempts per test case
- Analyzes failures and root causes
- Updates artifacts with discovered fixes
- Generates comprehensive Playwright HTML reports
- Detailed healing logs and diagnostics

## 💡 When to Use Each Agent

| Scenario | Agent(s) |
|----------|---------|
| New story arrives | Planner → Generator → Healer (complete) |
| Test cases already exist | Generator → Healer (skip Planner) |
| Scripts already exist | Healer only (skip both) |
| Want fast feedback | Run only Healer (if code exists) |

## 📖 Documentation Map

| Document | Purpose | Read When |
|----------|---------|-----------|
| **README.md** (this file) | Overview and quick start | First time |
| **AGENT-QUICK-REFERENCE.md** | Fast lookup and commands | Quick questions |
| **THREE-AGENT-ARCHITECTURE.md** | Complete architecture | Deep understanding |
| **Playwright Orchestrated Agent.md** | Main workflow | Understanding flow |
| **Playwright Planner Agent.md** | Test case generation | Before Planner |
| **Playwright Generator Agent.md** | Code generation | Before Generator |
| **Playwright Healer Agent.md** | Test execution | Before Healer |

## ✅ Success Metrics

### After Planner Agent
- ✅ Test cases generated
- ✅ All acceptance criteria covered
- ✅ Mix of positive, negative, edge cases

### After Generator Agent
- ✅ No TypeScript compilation errors
- ✅ Page objects extend BasePage
- ✅ Tests use page objects only
- ✅ Data is externalized

### After Healer Agent
- ✅ 80%+ tests pass on first attempt
- ✅ Remaining tests pass by third attempt
- ✅ Playwright HTML reports generated
- ✅ Artifacts updated with fixes

## 🛠️ Manual Fallback

If agents are unavailable, all tasks can be done manually following the guidelines in each agent's markdown file:

1. **Manually**: Follow Planner Agent guidelines to write test cases
2. **Manually**: Follow Generator Agent guidelines to create code
3. **Manually**: Follow Healer Agent guidelines to execute and heal

## 🔗 Dependencies

### On Orchestrator Platform
- `instruction.md` - Framework guidelines
- `prompt.md` - Workflow instructions
- `pages/BasePage.ts` - Self-healing base class
- `Locators/` directory - Centralized selectors
- `Test_Data/` directory - Externalized data
- `tests/` directory - Test scripts

### On External Services
- Jira/Azure DevOps - Story retrieval
- Playwright - Test execution
- Playwright HTML - Report generation

## 📝 Configuration

### Enable Agents in .env
```bash
# Already configured for SNOW-1:
JIRA_STORY1_STORY=SNOW-1
```

### Configure Playwright
```typescript
// playwright.config.ts
{
  testDir: './tests',
  reporter: ['list', ['html', { outputFolder: 'test-results' }]],
  use: {
    baseURL: process.env.BASE_URL,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
}
```

## 🎓 Learning Path

### New Users
1. Read: `README.md` (this file)
2. Read: `AGENT-QUICK-REFERENCE.md`
3. Read: `THREE-AGENT-ARCHITECTURE.md`
4. Try: Invoke Planner Agent

### Intermediate Users
1. Read: Individual agent documents
2. Try: Invoke Generator Agent
3. Try: Invoke Healer Agent
4. Customize: Modify agent prompts

### Advanced Users
1. Modify: Agent markdown files
2. Create: Custom agent variations
3. Integrate: With CI/CD pipelines
4. Scale: Multiple stories in parallel

## 🐛 Troubleshooting

### Common Issues

**Issue**: Agent not found
**Solution**: Ensure agent name matches exactly (case-sensitive)

**Issue**: Tests won't compile
**Solution**: Run `npx tsc --noEmit` to check TypeScript errors

**Issue**: Tests fail on execution
**Solution**: Check Healer logs: `tail healing-logs/healing-sessions.log`

**Issue**: Selectors don't work
**Solution**: Add more fallbacks to locators or use semantic selectors

For detailed troubleshooting, see each agent's documentation.

## 📊 Workflow Examples

### Example 1: SNOW-1 Complete Automation
```
Story: "Create placement, product, submission, send quote requests"
    ↓
Planner: 8 test cases (Login, Create Placement, Create Product, etc.)
    ↓
Generator: Page objects + Test scripts + Test data
    ↓
Healer: Execute → 6/8 pass first try → 2/8 healed → All pass
    ↓
Result: Complete automation in 45 minutes
```

### Example 2: Existing Test Cases
```
Already have: specs/KAN-1-TEST-CASES.md
    ↓
Generator: Create pages/ + tests/ + Test_Data/
    ↓
Healer: Execute and heal
    ↓
Result: Automation ready in 30 minutes
```

## 🎯 Next Steps

1. **Try Planner**: Generate test cases for a new story
2. **Try Generator**: Create page objects and test scripts
3. **Try Healer**: Execute tests and fix failures
4. **Scale Up**: Automate multiple stories in sequence
5. **Customize**: Modify agent prompts for your needs

## 📚 Additional Resources

- `../AI_POWERED_AUTOMATION_ARCHITECTURE.md` - Architecture overview
- `../instruction.md` - Framework guidelines
- `../AGENT_VALIDATION_CHECKLIST.md` - Validation steps
- `../../pages/BasePage.ts` - Self-healing implementation
- `../../Locators/README.md` - Locator best practices

## 📞 Support

For issues or questions:
1. Check agent documentation
2. Review AGENT-QUICK-REFERENCE.md
3. Check healing logs for diagnostics
4. Review Playwright HTML reports for detailed results
5. Read framework guidelines in `instruction.md`

## 📈 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-09-15 | Initial three-agent architecture |
| - | - | Planner Agent for test cases |
| - | - | Generator Agent for code creation |
| - | - | Healer Agent for execution |
| - | - | Complete documentation |

## 🏆 Architecture Status

- ✅ **Production Ready**
- ✅ **Fully Documented**
- ✅ **Tested with SNOW-1**
- ✅ **Scalable Design**
- ✅ **Self-Healing Integrated**
- ✅ **End-to-End Automation**

---

**Framework**: Playwright Pure POM with Self-Healing  
**Last Updated**: 2026-09-15  
**Status**: Production Ready  
**All Systems Go** ✅
