'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeAutomationPromptCases } = require('./automation-prompt-privacy');

test('redacts applicant data from actions, results, and test-data values', () => {
  const { testCases, sanitizeText } = sanitizeAutomationPromptCases({
    positive: [{
      id: 'LOAN-1',
      title: 'Application for Mak Tyson',
      steps: ['Enter SSN 1234567012 and email mak@example.com'],
      stepsWithResults: [{
        action: 'Enter Mak Tyson SSN 1234567012',
        result: 'Mak Tyson is accepted',
      }],
      testData: {
        firstName: 'Mak',
        lastName: 'Tyson',
        ssn: '1234567012',
        email: 'mak@example.com',
        branch: 'Internet Application 1010',
        url: 'https://example.test/apply',
      },
    }],
    negative: [],
    edge: [],
  });

  const promptCase = testCases.positive[0];
  const serialized = JSON.stringify(promptCase);
  assert.doesNotMatch(serialized, /Mak|Tyson|1234567012|mak@example\.com|Internet Application 1010/);
  assert.match(serialized, /https:\/\/example\.test\/apply/);
  assert.match(serialized, /<redacted>/);
  assert.doesNotMatch(sanitizeText('SSN 1234567012'), /1234567012/);
});

test('retains case step count and non-sensitive locator labels', () => {
  const { testCases } = sanitizeAutomationPromptCases({
    positive: [{
      id: 'CASE-1',
      steps: ['Click the "I Agree" button'],
      stepsWithResults: [{ action: 'Click the "I Agree" button', result: 'Button closes' }],
      testData: { agreeButtonLabel: 'I Agree', firstName: 'Mak' },
    }],
    negative: [],
    edge: [],
  });

  assert.equal(testCases.positive[0].steps.length, 1);
  assert.equal(testCases.positive[0].steps[0], 'Click the "I Agree" button');
  assert.equal(testCases.positive[0].testData.agreeButtonLabel, 'I Agree');
});
