'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  inspectApplication,
  extractTestCaseFlow,
  isAccessDeniedPopup,
  isBlockedApplication,
  parseRepairResponse,
  redactFailureEvidence,
  preservePreviousSource,
  redactScriptSecrets,
  readPlaywrightFailureContext,
  resolveSupportingRepairs,
  resolveInspectionUrl,
  resolveSpecPath,
  restoreScriptSecrets,
  validateRepair,
  writeRepairs,
} = require('./script-repair');

test('extracts ordered Playwright steps for the exact selected test case', () => {
  const source = `
    test('case one | route search', async () => {
      await test.step('Select route', async () => {});
      await test.step('Enter airports', async () => {});
    });

    test('case two', async () => {
      await test.step('Submit form', async () => {});
    });
  `;
  assert.deepEqual(extractTestCaseFlow(source, 'case one | route search'), [
    { name: 'case one | route search', steps: ['Select route', 'Enter airports'] },
  ]);
  assert.equal(extractTestCaseFlow(source, 'case missing'), null);
  assert.deepEqual(extractTestCaseFlow(source, ''), [
    { name: 'case one | route search', steps: ['Select route', 'Enter airports'] },
    { name: 'case two', steps: ['Submit form'] },
  ]);
});

test('reads the exact failing test snapshot from its isolated Playwright report', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'playwright-failure-context-'));
  const reportsDirectory = path.join(directory, 'reports');
  const reportDirectory = path.join(reportsDirectory, 'run-123');
  const artifactsDirectory = path.join(directory, 'test-results', 'generated-suite');
  const reportPath = path.join(reportDirectory, 'playwright-results.json');
  const contextPath = path.join(artifactsDirectory, 'error-context.md');
  const context = '# Failure context\n\n- textbox "Account number" [active]\n';

  try {
    fs.mkdirSync(reportDirectory, { recursive: true });
    fs.mkdirSync(artifactsDirectory, { recursive: true });
    fs.writeFileSync(contextPath, context, 'utf8');
    fs.writeFileSync(reportPath, JSON.stringify({
      suites: [{
        title: 'LocalHost\\FundsTransfer\\FundsTransfer-Script.spec.ts',
        specs: [{
          title: 'FundsTransfer-TC_P01 | submits transfer',
          tests: [{
            status: 'unexpected',
            results: [{
              status: 'failed',
              attachments: [{ name: 'error-context', path: contextPath }],
            }],
          }],
        }],
      }],
    }), 'utf8');

    assert.equal(
      readPlaywrightFailureContext(
        directory,
        reportsDirectory,
        'run-123',
        'tests/LocalHost/FundsTransfer/FundsTransfer-Script.spec.ts',
        'FundsTransfer-TC_P01 | submits transfer',
      ),
      context,
    );
    assert.equal(
      readPlaywrightFailureContext(directory, reportsDirectory, 'run-123', 'tests/other/Other.spec.ts', 'missing'),
      '',
    );
    assert.throws(
      () => readPlaywrightFailureContext(directory, reportsDirectory, '../outside', 'spec.ts', 'case'),
      /valid Playwright run ID/,
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('resolves Playwright specs from any workspace directory but rejects generated directories', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-spec-'));
  const specPath = path.join(directory, 'e2e', 'stories', 'checkout.spec.ts');
  const generatedSpecPath = path.join(directory, 'test-results', 'generated.spec.ts');

  try {
    fs.mkdirSync(path.dirname(specPath), { recursive: true });
    fs.mkdirSync(path.dirname(generatedSpecPath), { recursive: true });
    fs.writeFileSync(specPath, "test('checkout', async () => {});", 'utf8');
    fs.writeFileSync(generatedSpecPath, "test('generated', async () => {});", 'utf8');

    assert.equal(resolveSpecPath(directory, 'e2e/stories/checkout.spec.ts'), specPath);
    assert.throws(
      () => resolveSpecPath(directory, 'test-results/generated.spec.ts'),
      /generated or dependency directories/,
    );
    assert.throws(
      () => resolveSpecPath(directory, '../outside.spec.ts'),
      /inside the workspace/,
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('resolves an application entry URL from imported page-object source', () => {
  const sources = [
    { content: `await this.page.goto('https://example.test/app');` },
  ];
  assert.equal(resolveInspectionUrl('.', sources, {}), 'https://example.test/app');
});

test('allows repairs only to page objects and locators imported by the failing spec', () => {
  const root = path.resolve(__dirname, '..');
  const sources = [
    { file: 'tests/CSX-1/CSX-1-Script.spec.ts', content: 'test(...)' },
    { file: 'Locators/CSX-1-Locators.ts', content: 'export const locators = {};' },
  ];
  const repairs = resolveSupportingRepairs(root, sources, [
    { file: 'Locators/CSX-1-Locators.ts', content: 'export const locators = { groceries: "#carbon_b2" };' },
  ]);
  assert.equal(repairs.length, 1);
  assert.equal(repairs[0].file, 'Locators/CSX-1-Locators.ts');
  assert.throws(
    () => resolveSupportingRepairs(root, sources, [
      { file: 'Test_Data/CSX-1-test-data.json', content: '{}' },
    ]),
    /not imported by this test/,
  );
  assert.throws(
    () => resolveSupportingRepairs(root, sources, [
      { file: '../.env', content: 'SECRET=changed' },
    ]),
    /not imported by this test/,
  );
});

test('allows imported support files outside conventional page and locator folders', () => {
  const sources = [
    { file: 'e2e/stories/Checkout.spec.ts', content: 'test(...)' },
    { file: 'automation/steps/checkout-actions.ts', content: 'export const submit = () => old();' },
  ];
  const repairs = resolveSupportingRepairs('.', sources, [{
    file: 'automation/steps/checkout-actions.ts',
    content: 'export const submit = () => updated();',
  }]);

  assert.equal(repairs.length, 1);
  assert.ok(repairs[0].content.includes('// export const submit = () => old();'));
  assert.ok(repairs[0].content.endsWith('export const submit = () => updated();'));
});

test('comments out the previous locator value when a repair changes it', () => {
  const original = [
    'export const locators = {',
    "  recipientAccountNumberInput: 'Recipient Account Number',",
    "  transferAmountInput: 'Amount (USD)',",
    '};',
  ].join('\n');
  const sources = [{ file: 'Locators/LocalHost/FundsTransfer/FundsTransfer-Locators.ts', content: original }];
  const repairs = resolveSupportingRepairs('.', sources, [{
    file: 'Locators/LocalHost/FundsTransfer/FundsTransfer-Locators.ts',
    content: [
      'export const locators = {',
      "  recipientAccountNumberInput: 'label=Recipient Account Number',",
      "  transferAmountInput: 'Amount (USD)',",
      '};',
    ].join('\n'),
  }]);

  assert.equal(
    repairs[0].content,
    [
      'export const locators = {',
      "  // recipientAccountNumberInput: 'Recipient Account Number',",
      "  recipientAccountNumberInput: 'label=Recipient Account Number',",
      "  transferAmountInput: 'Amount (USD)',",
      '};',
    ].join('\n'),
  );
});

test('preserves the previous page-object source as comments before the repaired source', () => {
  const original = 'export class CheckoutPage {\n  async submit() { await this.page.locator("#old").click(); }\n}';
  const candidate = 'export class CheckoutPage {\n  async submit() { await this.page.getByRole("button", { name: "Submit" }).click(); }\n}';
  const preserved = preservePreviousSource(original, candidate);

  assert.ok(preserved.startsWith('// --- Previous version preserved by Dry Run repair ---'));
  assert.ok(preserved.includes('// export class CheckoutPage {'));
  assert.ok(preserved.includes('//   async submit() { await this.page.locator("#old").click(); }'));
  assert.ok(preserved.endsWith(`// --- Active repaired version ---\n${candidate}`));
});

test('preserves only the latest active source across repeated repairs', () => {
  const original = 'const locator = "#first";';
  const firstRepair = preservePreviousSource(original, 'const locator = "#second";');
  const secondRepair = preservePreviousSource(firstRepair, 'const locator = "#third";');

  assert.equal(secondRepair.split('// --- Previous version preserved by Dry Run repair ---').length - 1, 1);
  assert.ok(secondRepair.includes('// const locator = "#second";'));
  assert.ok(!secondRepair.includes('// const locator = "#first";'));
  assert.ok(secondRepair.endsWith('// --- Active repaired version ---\nconst locator = "#third";'));
});

test('comments out previous imported page-object source when resolving repairs', () => {
  const original = 'export class CheckoutPage { async submit() { return "old"; } }';
  const source = { file: 'pages/Checkout-Page.ts', content: original };
  const repairs = resolveSupportingRepairs('.', [source], [{
    file: 'pages/Checkout-Page.ts',
    content: 'export class CheckoutPage { async submit() { return "new"; } }',
  }]);

  assert.ok(repairs[0].content.includes(`// ${original}`));
  assert.ok(repairs[0].content.endsWith('export class CheckoutPage { async submit() { return "new"; } }'));
});

test('writes repairs to their existing files without creating backup files', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'script-repair-'));
  const filePath = path.join(directory, 'example.spec.ts');
  try {
    fs.writeFileSync(filePath, 'original test', 'utf8');
    writeRepairs(
      [{ file: 'tests/example.spec.ts', absolutePath: filePath, content: 'repaired test' }],
      new Map([[filePath, 'original test']]),
    );
    assert.equal(fs.readFileSync(filePath, 'utf8'), 'repaired test');
    assert.deepEqual(fs.readdirSync(directory), ['example.spec.ts']);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('refuses to overwrite repair targets changed after analysis', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'script-repair-'));
  const filePath = path.join(directory, 'example.spec.ts');
  try {
    fs.writeFileSync(filePath, 'newer content', 'utf8');
    assert.throws(
      () => writeRepairs(
        [{ file: 'tests/example.spec.ts', absolutePath: filePath, content: 'repaired test' }],
        new Map([[filePath, 'original content']]),
      ),
      /changed during repair analysis/,
    );
    assert.equal(fs.readFileSync(filePath, 'utf8'), 'newer content');
    assert.deepEqual(fs.readdirSync(directory), ['example.spec.ts']);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('prefers the explicitly configured application URL', () => {
  const sources = [{ content: `await page.goto('https://old.example.test');` }];
  assert.equal(
    resolveInspectionUrl('.', sources, { BASE_URL: 'https://current.example.test/' }),
    'https://current.example.test/',
  );
});

test('rejects inspection URLs that are not credential-free HTTP URLs', () => {
  assert.throws(
    () => resolveInspectionUrl('.', [], { BASE_URL: 'file:///private/data' }),
    /valid http:\/\/ or https:\/\//,
  );
  assert.throws(
    () => resolveInspectionUrl('.', [], { BASE_URL: 'https://user:pass@example.test' }),
    /valid http:\/\/ or https:\/\//,
  );
});

test('rechecks a target-blank application link and redacts its auth query from repair evidence', async () => {
  const previousHeadlessSetting = process.env.HEALER_HEADLESS;
  delete process.env.HEALER_HEADLESS;
  let origin;
  const server = http.createServer((req, res) => {
    if (req.url.startsWith('/start')) {
      res.setHeader('Content-Type', 'text/html');
      res.end(`<a href="${origin}/application?auth=private-token" target="_blank">Apply Now</a>`);
      return;
    }
    res.setHeader('Content-Type', 'text/html');
    res.end('<title>Application blocked</title><h1>Access Denied</h1>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  try {
    const snapshot = await inspectApplication(`${origin}/start`, { probePopup: true });
    assert.equal(snapshot.popupProbe.opened, true);
    assert.equal(snapshot.popupProbe.page.title, 'Application blocked');
    assert.equal(snapshot.popupProbe.page.headings[0], 'Access Denied');
    assert.equal(isAccessDeniedPopup(snapshot), true);
    assert.equal(JSON.stringify(snapshot).includes('private-token'), false);
  } finally {
    if (previousHeadlessSetting === undefined) delete process.env.HEALER_HEADLESS;
    else process.env.HEALER_HEADLESS = previousHeadlessSetting;
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});

test('identifies a generic clickable item card separately from its static section heading', async () => {
  const previousHeadlessSetting = process.env.HEALER_HEADLESS;
  process.env.HEALER_HEADLESS = 'true';
  let origin;
  const server = http.createServer((_req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.end('<p>Step 1: Goods</p><div id="carbon_b2" class="carbon_basic_goodsimg" style="cursor:pointer"><div class="carbon_basic_goods_text">GROCERIES</div></div>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  try {
    const snapshot = await inspectApplication(origin, { hints: ['Goods', 'Groceries'] });
    const heading = snapshot.hintedElements.find(element => element.hint === 'Goods');
    const item = snapshot.hintedElements.find(element => element.hint === 'Groceries');
    assert.ok(heading);
    assert.deepEqual(heading.actionableCandidates, []);
    assert.ok(item);
    assert.ok(item.actionableCandidates.some(candidate =>
      candidate.id === 'carbon_b2' && candidate.cursor === 'pointer'));
  } finally {
    if (previousHeadlessSetting === undefined) delete process.env.HEALER_HEADLESS;
    else process.env.HEALER_HEADLESS = previousHeadlessSetting;
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});

test('does not classify a successful popup as access-denied when the application is available', () => {
  assert.equal(isAccessDeniedPopup({
    popupProbe: {
      opened: true,
      page: { title: 'Loan Application', headings: ['Start your application'] },
    },
  }), false);
  assert.equal(isAccessDeniedPopup({ popupProbe: { opened: false } }), false);
});

test('recognizes an application blocked by a security or access interstitial', () => {
  assert.equal(isBlockedApplication({
    title: 'Attention Required! | Cloudflare',
    headings: ['Sorry, you have been blocked', 'You are unable to access csx.com'],
  }), true);
  assert.equal(isBlockedApplication({
    title: 'Carbon Estimator - CSX.com',
    headings: ['Carbon Estimator'],
  }), false);
});

test('redacts hard-coded secret assignments before sharing a script for repair', () => {
  const source = `const password = 'secret-value'; const api_key: 'key-value';`;
  const redacted = redactScriptSecrets(source);
  assert.equal(
    redacted.script,
    `const password = '__SCRIPT_REPAIR_SECRET_0__'; const api_key: '__SCRIPT_REPAIR_SECRET_1__';`,
  );
  assert.equal(restoreScriptSecrets(redacted.script, redacted.secrets), source);
});

test('redacts personal values from Playwright failure evidence before sharing it', () => {
  const sanitized = redactFailureEvidence([
    'input value="secret phrase"',
    'Contact email: jane.doe@example.test',
    'Account number 123456789012',
    'https://example.test/path?token=private-token',
  ].join('\n'));

  assert.ok(sanitized.includes('value="[REDACTED]"'));
  assert.ok(sanitized.includes('[REDACTED_EMAIL]'));
  assert.ok(sanitized.includes('[REDACTED_NUMBER]'));
  assert.ok(sanitized.includes('token=[REDACTED]'));
  assert.ok(!sanitized.includes('secret phrase'));
  assert.ok(!sanitized.includes('jane.doe@example.test'));
  assert.ok(!sanitized.includes('123456789012'));
  assert.ok(!sanitized.includes('private-token'));
});

test('parses JSON repair responses including markdown fences', () => {
  assert.deepEqual(
    parseRepairResponse('```json\n{"fixed":true,"updatedScript":"test();"}\n```'),
    { fixed: true, updatedScript: 'test();' },
  );
});

test('requires script repairs to preserve test names and assertions', () => {
  const original = `test('case one', async () => { expect(true).toBe(true); });`;
  assert.doesNotThrow(() => validateRepair(original, original.replace('expect(true)', 'expect(false)')));
  assert.throws(
    () => validateRepair(original, `test('different case', async () => { expect(true).toBe(true); });`),
    /test case names/,
  );
  assert.throws(
    () => validateRepair(original, `test('case one', async () => {});`),
    /removed test assertions/,
  );
});
