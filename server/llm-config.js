'use strict';

const PROVIDERS = {
  groq: {
    apiKey: env => env.GROQ_API_KEY,
    model: env => env.GROQ_MODEL || 'openai/gpt-oss-120b',
  },
  ollama: {
    apiKey: env => env.OLLAMA_API_KEY,
    model: env => env.OLLAMA_MODEL || 'gpt-oss:120b',
  },
  openai: {
    apiKey: env => env.OPENAI_API_KEY
      || (String(env.AI_PROVIDER || '').toLowerCase() === 'openai' ? env.AI_API_KEY : undefined),
    model: env => env.OPENAI_MODEL || env.AI_MODEL || 'gpt-4o',
  },
  claude: {
    apiKey: env => env.ANTHROPIC_API_KEY
      || (['claude', 'anthropic'].includes(String(env.AI_PROVIDER || '').toLowerCase())
        ? env.AI_API_KEY
        : undefined),
    model: env => env.ANTHROPIC_MODEL || env.AI_MODEL || 'claude-3-sonnet-20240229',
  },
  kiro: {
    // Kiro CLI uses its own sign-in or KIRO_API_KEY, so no key is read here.
    apiKey: () => undefined,
    model: env => env.KIRO_MODEL_ID || 'claude-haiku-5.5',
  },
  copilot: {
    apiKey: () => undefined,
    model: env => env.COPILOT_MODEL || null,
  },
};

/** Providers that authenticate outside .env, so they never need an API key. */
function isKeyless(provider) {
  return provider === 'copilot' || provider === 'kiro';
}

function normalizeProvider(provider) {
  const normalized = String(provider || '').trim().toLowerCase();
  return normalized === 'anthropic' ? 'claude' : normalized;
}

function getAIConfiguration(env = process.env) {
  const explicitlyConfigured = env.LLM_PROVIDER || env.AI_PROVIDER;
  const provider = normalizeProvider(
    explicitlyConfigured
      || (env.GROQ_API_KEY ? 'groq' : env.OLLAMA_API_KEY ? 'ollama' : env.OPENAI_API_KEY ? 'openai' : ''),
  );
  const definition = PROVIDERS[provider];

  if (!provider || !definition) {
    return {
      provider: provider || null,
      apiKey: undefined,
      model: null,
      supported: Boolean(definition),
    };
  }

  return {
    provider,
    apiKey: definition.apiKey(env),
    model: definition.model(env),
    supported: true,
  };
}

function getPublicAIConfiguration(env = process.env) {
  const { provider, model, apiKey, supported } = getAIConfiguration(env);
  return {
    provider,
    model,
    supported,
    configured: Boolean(supported && provider && (isKeyless(provider) || apiKey)),
    availableProviders: Object.keys(PROVIDERS),
  };
}

module.exports = { getAIConfiguration, getPublicAIConfiguration, isKeyless };
