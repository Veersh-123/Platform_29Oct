'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createRepairWorkspace, isSupportedNodeVersion } = require('./copilot-provider');

test('accepts the Copilot SDK minimum Node versions', () => {
  assert.equal(isSupportedNodeVersion('20.19.0'), true);
  assert.equal(isSupportedNodeVersion('20.20.0'), true);
  assert.equal(isSupportedNodeVersion('22.12.0'), true);
  assert.equal(isSupportedNodeVersion('24.0.0'), true);
});

test('rejects Node versions outside the Copilot SDK support range', () => {
  assert.equal(isSupportedNodeVersion('20.15.0'), false);
  assert.equal(isSupportedNodeVersion('20.18.9'), false);
  assert.equal(isSupportedNodeVersion('21.0.0'), false);
  assert.equal(isSupportedNodeVersion('22.11.9'), false);
});

test('Copilot repair tools expose only explicitly scoped source and stage edits', () => {
  const workspace = createRepairWorkspace([
    { file: 'tests/LocalHost/FundsTransfer/FundsTransfer-Script.spec.ts', content: 'test source', editable: true },
    { file: 'automation/pages/CheckoutPage.ts', content: 'page source', editable: true },
    { file: 'automation/shared/CheckoutHelpers.ts', content: 'helper source', editable: true },
    { file: 'pages/shared/readonly.ts', content: 'supporting source', editable: false },
  ]);

  assert.equal(workspace.readFile('tests/LocalHost/FundsTransfer/FundsTransfer-Script.spec.ts'), 'test source');
  assert.deepEqual(
    workspace.proposeFileUpdate('automation/pages/CheckoutPage.ts', 'repaired page'),
    { accepted: true, file: 'automation/pages/CheckoutPage.ts' },
  );
  assert.equal(
    workspace.proposals.get('automation/pages/CheckoutPage.ts'),
    'repaired page',
  );
  assert.deepEqual(
    workspace.proposeFileUpdate('automation/shared/CheckoutHelpers.ts', 'repaired helper'),
    { accepted: true, file: 'automation/shared/CheckoutHelpers.ts' },
  );
  assert.throws(() => workspace.readFile('../.env'), /not in this test repair workspace/);
  assert.throws(
    () => workspace.proposeFileUpdate('pages/shared/readonly.ts', 'changed support'),
    /only to the selected test and its imported page\/locator files/,
  );
  assert.throws(
    () => createRepairWorkspace([{ file: '../.env', content: 'secret', editable: true }]),
    /out-of-scope file/,
  );
  assert.throws(
    () => workspace.proposeFileUpdate('tests/LocalHost/FundsTransfer/FundsTransfer-Script.spec.ts', ''),
    /complete non-empty file contents/,
  );
});
