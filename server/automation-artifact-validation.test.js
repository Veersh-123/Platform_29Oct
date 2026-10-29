'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { findMissingScriptSteps } = require('./automation-artifact-validation');

test('accepts a script with a traceable test.step for every input step', () => {
  const testCase = {
    id: 'LoanApplication-TC_P01',
    steps: Array.from({ length: 19 }, (_, index) => `Action ${index + 1}`),
  };
  const script = testCase.steps.map((_, index) =>
    `await test.step('${testCase.id} | Step ${index + 1}: Action', async () => { await page.performAction(); });`
  ).join('\n');

  assert.deepEqual(findMissingScriptSteps([testCase], script), []);
});

test('reports omitted and out-of-order steps', () => {
  const testCase = {
    id: 'CASE-1',
    stepsWithResults: [{ action: 'First' }, { action: 'Second' }, { action: 'Third' }],
  };
  const script = [
    `await test.step('CASE-1 | Step 1: First', async () => { await page.first(); });`,
    `await test.step('CASE-1 | Step 3: Third', async () => { await page.third(); });`,
    `await test.step('CASE-1 | Step 2: Second', async () => { await page.second(); });`,
  ].join('\n');

  assert.deepEqual(findMissingScriptSteps([testCase], script), [
    'CASE-1 | Step 3: (out of order)',
  ]);
  assert.deepEqual(
    findMissingScriptSteps([testCase], [
      `await test.step('CASE-1 | Step 1: First', async () => { await page.first(); });`,
      `await test.step('CASE-1 | Step 3: Third', async () => { await page.third(); });`,
    ].join('\n')),
    ['CASE-1 | Step 2:', 'expected 3 executable test.step calls, found 2']
  );
});

test('rejects steps with empty bodies or duplicate extra calls', () => {
  const testCase = { id: 'CASE-1', steps: ['Click Next'] };
  const empty = `await test.step('CASE-1 | Step 1: Click Next', async () => {});`;
  assert.deepEqual(findMissingScriptSteps([testCase], empty), [
    'CASE-1 | Step 1: (no executable action or assertion)',
  ]);

  const duplicate = [
    `await test.step('CASE-1 | Step 1: Click Next', async () => { await page.next(); });`,
    `await test.step('CASE-1 | Step 1: Click Next', async () => { await page.next(); });`,
  ].join('\n');
  assert.deepEqual(findMissingScriptSteps([testCase], duplicate), [
    'expected 1 executable test.step calls, found 2',
  ]);
});

test('rejects test cases without supplied steps', () => {
  assert.deepEqual(
    findMissingScriptSteps([{ id: 'CASE-1' }], 'test("CASE-1", async () => {});'),
    ['CASE-1 (no steps supplied)']
  );
});
