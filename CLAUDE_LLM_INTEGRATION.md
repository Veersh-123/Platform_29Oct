# LLM Provider Integration Guide

> Restored for review as a sanitized guide. The historical version contained a hard-coded API credential; that value is intentionally omitted and must not be reintroduced. If it may still be active, rotate it.

## Overview

The Orchestrator Platform calls language-model providers from the server. Provider selection and credential lookup are centralized in `server/llm-config.js`; the dashboard uses backend endpoints to view status and configure providers.

Supported provider identifiers in the current configuration include:

- `groq`
- `openai`
- `claude` (Anthropic)
- `ollama`
- `copilot`

The configured provider is selected with `LLM_PROVIDER`. The legacy `AI_PROVIDER` setting is also recognized.

## Credential handling

Set provider credentials in the project-root `.env` file or through the dashboard's provider settings. Never commit credentials, paste them into source files, or include them in Markdown examples.

```env
LLM_PROVIDER=claude
ANTHROPIC_API_KEY=[REDACTED: set locally; do not commit]
ANTHROPIC_MODEL=claude-3-sonnet-20240229
```

Use the model identifier supported by your Anthropic account and the current provider implementation. The project resolver defaults to `claude-3-sonnet-20240229` when no Anthropic model is configured.

Other providers use their corresponding environment variables:

| Provider | Credential | Model |
|---|---|---|
| Groq | `GROQ_API_KEY` | `GROQ_MODEL` |
| OpenAI | `OPENAI_API_KEY` | `OPENAI_MODEL` |
| Anthropic | `ANTHROPIC_API_KEY` | `ANTHROPIC_MODEL` |
| Ollama | `OLLAMA_API_KEY` | `OLLAMA_MODEL` |
| GitHub Copilot | Copilot CLI authentication | `COPILOT_MODEL` (optional) |

Copilot uses the local Copilot CLI authentication and does not require an API key in this configuration.

## Request flow

1. The dashboard requests provider status from `GET /api/llm/status`.
2. Provider configuration is resolved server-side by `server/llm-config.js`.
3. Test-case generation, script generation, and repair routes use the selected provider on the backend.
4. The browser receives status and provider information, not stored API-key values.

The backend also provides provider-management endpoints, including `GET /api/llm/available-providers`, `POST /api/llm/connect`, and `POST /api/llm/configure`. Consult `server/index.js` for their current request shapes and validation.

## Dashboard

The active React application is in `web/`. Its User Settings UI calls the backend to check status and update provider configuration. `dashboard/web/` is a separate frontend copy; see `PROJECT_ARCHITECTURE.md` before using it as the active UI.

Start the backend from the project setup documented in `PROJECT_ARCHITECTURE.md`, then open the dashboard and use its AI/provider settings. Do not copy credentials into commands, screenshots, test fixtures, or documentation.

## Security checklist

- Keep `.env` out of source control.
- Use a restricted, revocable API key.
- Rotate any key that was committed, shared, or embedded in generated documentation.
- Review repository history and external copies if a credential was exposed; deleting the file alone does not revoke the key.
- Check provider configuration responses to ensure they never return credential values.
- Use placeholders such as `[REDACTED]` in examples.
