'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
  buildLocalTestData,
  ensureLocalArtifactDirectories,
  formatLocatorArtifact,
  resolveLocalStory,
} = require('./localhost-artifacts');
const { generateAdvancedTestAutomation } = require('./advanced-automation-generator');

test('formats generated locator objects like the existing flat locator files', () => {
  const source = 'export const AirrPageLocators = {destinationInput: \'input[name="destination"]\', suggestion: (value: string) => `text=${value}`,};';
  const formatted = formatLocatorArtifact(source, 'AirrPageLocators');

  assert.equal(formatted, [
    'export const AirrPageLocators = {',
    '  destinationInput: \'input[name="destination"]\',',
    '  suggestion: (value: string) => `text=${value}`,',
    '};',
    '',
  ].join('\n'));
  assert.throws(
    () => formatLocatorArtifact('export const Bad = { ...other };', 'Bad'),
    /named keys and explicit selector values/
  );
});

test('creates non-empty LocalHost test data for every generated test case', () => {
  const testData = buildLocalTestData('carbon', 'Carbon estimator', {
    positive: [{
      id: 'carbon-TC_P01',
      title: 'Estimate freight emissions',
      type: 'Positive',
      steps: ['Navigate to the estimator', 'Select "Groceries"', 'Set route from "Birmingham" to "Boston"'],
      testData: { freightVolume: '2500 Tons' },
    }],
    negative: [{
      id: 'carbon-TC_N01',
      title: 'Reject missing freight volume',
      type: 'Negative',
      steps: ['Select "Groceries" and leave freight volume empty'],
    }],
    edge: [],
  }, 'Open https://example.test/estimator');

  assert.equal(testData.baseUrl, 'https://example.test/estimator');
  assert.deepEqual(testData.testCases[0].data, { freightVolume: '2500 Tons' });
  assert.deepEqual(testData.testCases[1].data, {
    url: 'https://example.test/estimator',
    inputs: ['Groceries'],
  });
  assert.equal(testData.testCases.every(testCase => Object.keys(testCase.data).length > 0), true);
});

test('resolves extensionless LocalHost artifact folder from a requirement file', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'localhost-artifacts-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'Requirements'));
  fs.writeFileSync(path.join(root, 'Requirements', 'test.txt'), 'requirement');

  const scope = resolveLocalStory(root, 'test.txt');
  assert.equal(scope.issueKey, 'test');
  assert.equal(scope.sourceFile, 'test.txt');
  assert.equal(scope.artifactFolder, 'LocalHost/test');

  ensureLocalArtifactDirectories(root, scope.artifactFolder);
  for (const directory of ['specs', 'tests', 'Locators', 'Test_Data', 'pages']) {
    assert.equal(fs.statSync(path.join(root, directory, 'LocalHost', 'test')).isDirectory(), true);
  }
});

test('rejects LocalHost source paths outside Requirements', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'localhost-artifacts-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'Requirements'));

  assert.throws(() => resolveLocalStory(root, '..\\outside.txt'), /inside Requirements/);
  assert.throws(() => resolveLocalStory(root, 'missing.txt'), /not found/);
});

test('writes all generated artifacts under the LocalHost story folder', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'localhost-generation-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const testCases = {
    positive: [{ id: 'TC_1', title: 'Open the local requirement', type: 'Positive', steps: ['Open the page'], expectedResult: 'The page opens' }],
    negative: [],
    edge: [],
  };

  const result = await generateAdvancedTestAutomation(root, 'test', testCases, 'Local requirement', {}, 'LocalHost/test');
  assert.deepEqual(result.errors, []);
  assert.equal(result.files.locators, 'Locators/LocalHost/test/test-Locators.ts');
  assert.equal(result.files.pageObject, 'pages/LocalHost/test/test-Page.ts');
  assert.equal(result.files.testData, 'Test_Data/LocalHost/test/test-test-data.json');
  assert.equal(result.specFile, 'tests/LocalHost/test/test-Script.spec.ts');
  for (const file of Object.values(result.files)) {
    assert.equal(fs.existsSync(path.join(root, file)), true);
  }
  const generatedData = JSON.parse(fs.readFileSync(path.join(root, result.files.testData), 'utf8'));
  assert.equal(generatedData.testCases.length, 1);
  assert.ok(Object.keys(generatedData.testCases[0].data).length > 0);
});
