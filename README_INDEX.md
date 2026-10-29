# Project Documentation Index

## Core project

- [Project architecture](PROJECT_ARCHITECTURE.md) — current services, directories, APIs, and data flow.
- [Automation instructions](instruction.md) — Playwright POM conventions and test workflow.
- [Agent prompt](prompt.md) — workflow entry point for the orchestrated agent.
- [Agent documentation](.github/agents/README.md) — planner, generator, healer, and orchestration references.

## Test and application context

- [CSX-1 test cases](specs/CSX-1-TEST-CASES.md)
- [Loan Application test cases](specs/LocalHost/LoanApplication/LoanApplication-TEST-CASES.md)
- [Application context](AppContext/AppContext.md)

## Supporting components

- [Observability documentation](observability/README.md)
- [Framework migrator setup](dashboard/web/FRAMEWORK_MIGRATOR_SETUP.md)
- [LLM provider integration and credential safety](CLAUDE_LLM_INTEGRATION.md)

## Optional legacy Gemini generator

These guides describe the standalone Gemini test-case-generator prototype and are separate from the current platform architecture:

- [Generator overview](README_TEST_CASE_GENERATOR.md)
- [Quick start](QUICK_START.md)
- [Integration guide](INTEGRATION_GUIDE.md)
- [HTML integration snippet](HTML_INTEGRATION_SNIPPET.md)
- [Deployment guide](DEPLOYMENT_GUIDE.md)
- [Setup checklist](SETUP_CHECKLIST.md)
- [Implementation guide](IMPLEMENTATION_GUIDE.md)
