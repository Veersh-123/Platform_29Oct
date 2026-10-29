'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getAIConfiguration, getPublicAIConfiguration } = require('./llm-config');

test('uses the explicitly selected Groq provider and model', () => {
  const config = getAIConfiguration({
    LLM_PROVIDER: 'groq',
    GROQ_API_KEY: 'groq-secret',
    GROQ_MODEL: 'openai/gpt-oss-120b',
    OPENAI_API_KEY: 'openai-secret',
  });

  assert.equal(config.provider, 'groq');
  assert.equal(config.apiKey, 'groq-secret');
  assert.equal(config.model, 'openai/gpt-oss-120b');
});

test('does not silently switch providers when the selected provider has no key', () => {
  const config = getAIConfiguration({
    LLM_PROVIDER: 'openai',
    GROQ_API_KEY: 'groq-secret',
    OPENAI_MODEL: 'gpt-4o-mini',
  });

  assert.equal(config.provider, 'openai');
  assert.equal(config.apiKey, undefined);
  assert.equal(config.model, 'gpt-4o-mini');
});

test('normalizes Anthropic to the Claude adapter', () => {
  const config = getAIConfiguration({
    LLM_PROVIDER: 'anthropic',
    ANTHROPIC_API_KEY: 'anthropic-secret',
    ANTHROPIC_MODEL: 'claude-model',
  });

  assert.equal(config.provider, 'claude');
  assert.equal(config.apiKey, 'anthropic-secret');
  assert.equal(config.model, 'claude-model');
});

test('uses the configured Ollama Cloud key and model without exposing the key publicly', () => {
  const env = {
    LLM_PROVIDER: 'ollama',
    OLLAMA_API_KEY: 'ollama-secret',
    OLLAMA_MODEL: 'gpt-oss:120b',
  };
  const config = getAIConfiguration(env);

  assert.equal(config.provider, 'ollama');
  assert.equal(config.apiKey, 'ollama-secret');
  assert.equal(config.model, 'gpt-oss:120b');

  const publicConfig = getPublicAIConfiguration(env);
  assert.equal(publicConfig.configured, true);
  assert.ok(publicConfig.availableProviders.includes('ollama'));
  assert.equal(JSON.stringify(publicConfig).includes('ollama-secret'), false);
});

test('supports GitHub Copilot without an API key and uses its default model when unset', () => {
  const config = getAIConfiguration({ LLM_PROVIDER: 'copilot' });
  assert.equal(config.provider, 'copilot');
  assert.equal(config.apiKey, undefined);
  assert.equal(config.model, null);
  assert.equal(config.supported, true);

  const publicConfig = getPublicAIConfiguration({ LLM_PROVIDER: 'copilot' });
  assert.equal(publicConfig.configured, true);
  assert.ok(publicConfig.availableProviders.includes('copilot'));
});

test('reports safe public configuration without returning credentials', () => {
  const config = getPublicAIConfiguration({
    LLM_PROVIDER: 'groq',
    GROQ_API_KEY: 'must-not-be-returned',
    GROQ_MODEL: 'configured-model',
  });

  assert.deepEqual(config, {
    provider: 'groq',
    model: 'configured-model',
    supported: true,
    configured: true,
    availableProviders: ['groq', 'ollama', 'openai', 'claude', 'copilot'],
  });
  assert.equal(JSON.stringify(config).includes('must-not-be-returned'), false);
});

test('marks unknown providers unsupported instead of falling back to another key', () => {
  const config = getPublicAIConfiguration({
    LLM_PROVIDER: 'unknown-provider',
    GROQ_API_KEY: 'groq-secret',
  });

  assert.equal(config.provider, 'unknown-provider');
  assert.equal(config.supported, false);
  assert.equal(config.configured, false);
});
