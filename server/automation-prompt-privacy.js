'use strict';

const SENSITIVE_FIELD = /name|ssn|social.?security|birth|dob|email|phone|address|city|state|zip|postal|license|income|payment|marital|citizen|housing|employment|contact|joint|suffix|branch|account/i;

function parseTestData(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch {
      return {};
    }
  }
  return {};
}

function collectSensitiveValues(value, fieldName, values) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      collectSensitiveValues(child, key, values);
    }
  } else if (SENSITIVE_FIELD.test(fieldName) && value !== null && value !== undefined) {
    const text = String(value).trim();
    if (text.length >= 3) values.push({ text, fieldName });
  }
}

function redactText(value, sensitiveValues) {
  let text = String(value ?? '');
  const uniqueValues = [...new Map(
    sensitiveValues.map(item => [item.text.toLowerCase(), item])
  ).values()].sort((left, right) => right.text.length - left.text.length);

  for (const { text: sensitive, fieldName } of uniqueValues) {
    const escaped = sensitive.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const boundaryAware = /^[\w]+$/.test(sensitive)
      ? `\\b${escaped}\\b`
      : escaped;
    text = text.replace(new RegExp(boundaryAware, 'gi'), `<redacted:${fieldName}>`);
  }
  return text;
}

function redactData(value, fieldName = '') {
  if (Array.isArray(value)) return value.map(item => redactData(item, fieldName));
  if (!value || typeof value !== 'object') {
    if (SENSITIVE_FIELD.test(fieldName) && value !== null && value !== undefined) {
      return '<redacted>';
    }
    return value;
  }

  return Object.fromEntries(Object.entries(value).map(([key, child]) => [
    key,
    redactData(child, key),
  ]));
}

function sanitizeAutomationPromptCases(testCases) {
  const sensitiveValues = [];
  const parsedDataByCase = new Map();
  for (const category of ['positive', 'negative', 'edge']) {
    for (const testCase of testCases[category] || []) {
      const data = parseTestData(testCase.testData);
      parsedDataByCase.set(testCase.id, data);
      collectSensitiveValues(data, '', sensitiveValues);
    }
  }

  const sanitizeText = value => redactText(value, sensitiveValues);
  const sanitized = Object.fromEntries(['positive', 'negative', 'edge'].map(category => [
    category,
    (testCases[category] || []).map(testCase => ({
      ...testCase,
      title: sanitizeText(testCase.title),
      preconditions: sanitizeText(testCase.preconditions),
      expectedResult: sanitizeText(testCase.expectedResult),
      steps: Array.isArray(testCase.steps)
        ? testCase.steps.map(step => sanitizeText(step))
        : [],
      stepsWithResults: Array.isArray(testCase.stepsWithResults)
        ? testCase.stepsWithResults.map(step => ({
            ...step,
            action: sanitizeText(step.action),
            result: sanitizeText(step.result),
          }))
        : [],
      testData: redactData(parsedDataByCase.get(testCase.id) || {}),
    })),
  ]));

  return {
    testCases: sanitized,
    sanitizeText,
  };
}

module.exports = { sanitizeAutomationPromptCases };
