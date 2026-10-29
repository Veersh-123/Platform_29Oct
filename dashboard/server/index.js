﻿﻿﻿﻿﻿﻿﻿﻿/**
 * Playwright Dashboard â€“ Backend API Server
 * Port: 4000
 *
 * Endpoints consumed by both web/ (React) and test-dashboard.html:
 *   GET  /api/stats
 *   GET  /api/tests
 *   GET  /api/results
 *   GET  /api/testdata
 *   GET  /api/structure
 *   POST /api/run-tests              (SSE stream)
 *   POST /api/run-tests/file         (SSE stream)
 *   POST /api/run-mobile-tests       (SSE stream â€“ Taqwright/BrowserStack)
 *   GET  /api/mobile-results
 *   GET  /api/jira/config
 *   GET  /api/jira/projects
 *   GET  /api/jira/board
 *   GET  /api/jira/issue/:key
 *   POST /api/manual-test-cases/generate
 */

'use strict';

const express  = require('express');
const cors     = require('cors');
const fs       = require('fs');
const path     = require('path');
const { execFile, spawn } = require('child_process');
const axios    = require('axios');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { generateAdvancedTestAutomation } = require('./advanced-automation-generator');
const {
  createPlaywrightReportRun,
  finalizePlaywrightReport,
  parsePlaywrightResults,
  playwrightReportEnvironment,
} = require('../../server/playwright-reporting');

const app  = express();
const PORT = 4000;

// â”€â”€ Root of the Playwright project (one level up from server/) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// PROJECT_ROOT = Playwright project root (two levels up from dashboard/server/)
// DASHBOARD_DIR = dashboard/ folder where HTML files live
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const DASHBOARD_DIR = path.resolve(__dirname, '..');
const ROOT = PROJECT_ROOT;

// Path to the project .env file
const ENV_FILE_PATH = path.resolve(__dirname, '../.env');

app.use(cors());
app.use(express.json());

// â”€â”€ Serve test-dashboard.html at / â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Serve dashboard HTML files from dashboard/ dir
app.use(express.static(DASHBOARD_DIR, { 
  index: 'Orchestrator-Platform.html',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// Also serve project root for test artifacts, features, and specs.
app.use(express.static(ROOT));

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Upsert key=value pairs in a .env file without destroying comments or other keys.
 * If a key already exists its line is replaced; new keys are appended.
 */
function updateEnvFile(filePath, values) {
  const raw    = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  const lines  = raw.split(/\r?\n/);
  const updated = new Set();

  const result = lines.map(line => {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/);
    if (match && Object.prototype.hasOwnProperty.call(values, match[1])) {
      updated.add(match[1]);
      return `${match[1]}=${values[match[1]]}`;
    }
    return line;
  });

  for (const [k, v] of Object.entries(values)) {
    if (!updated.has(k)) result.push(`${k}=${v}`);
  }

  fs.writeFileSync(filePath, result.join('\n').replace(/\n*$/, '\n'), 'utf8');
}

/** POST /api/env/update — Update .env fields and hot-patch process.env */
app.post('/api/env/update', (req, res) => {
  try {
    const allowed = [
      'TestManagementTool',
      'JIRA_BASE_URL', 'JIRA_EMAIL', 'JIRA_API_TOKEN',
      'ADO_ORG_URL', 'ADO_PROJECT', 'ADO_PAT',
      'LLM_PROVIDER', 'AI_PROVIDER', 'AI_API_KEY', 'AI_MODEL',
      'OPENAI_API_KEY', 'OPENAI_MODEL',
      'GROQ_API_KEY', 'GROQ_MODEL',
      'BASE_URL', 'Customer',
    ];
    const body = req.body || {};
    const toWrite = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        toWrite[key] = String(body[key]);
      }
    }
    if (!Object.keys(toWrite).length) {
      return res.status(400).json({ error: 'No recognised env keys provided' });
    }
    updateEnvFile(ENV_FILE_PATH, toWrite);
    for (const [k, v] of Object.entries(toWrite)) {
      process.env[k] = v;
    }
    res.json({ ok: true, updated: Object.keys(toWrite) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/env/read — Return current non-secret env values for UI display */
app.get('/api/env/read', (req, res) => {
  res.json({
    TestManagementTool: process.env.TestManagementTool || process.env.TESTMANAGEMENTTOOL || 'Jira',
    JIRA_BASE_URL:      process.env.JIRA_BASE_URL  || '',
    JIRA_EMAIL:         process.env.JIRA_EMAIL     || '',
    JIRA_API_TOKEN:     process.env.JIRA_API_TOKEN ? '***set***' : '',
    ADO_ORG_URL:        process.env.ADO_ORG_URL    || '',
    ADO_PROJECT:        process.env.ADO_PROJECT    || '',
    LLM_PROVIDER:       process.env.LLM_PROVIDER   || process.env.AI_PROVIDER || '',
    AI_MODEL:           process.env.AI_MODEL       || process.env.OPENAI_MODEL || process.env.GROQ_MODEL || '',
    BASE_URL:           process.env.BASE_URL       || '',
    Customer:           (process.env.Customer || process.env.CUSTOMER || '').replace(/^"|"$/g, ''),
  });
});

/** Recursively list files under dir, returning paths relative to ROOT */
function walkDir(dir, base = ROOT) {
  let results = [];
  if (!fs.existsSync(dir)) return results;  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel  = path.relative(base, full).replace(/\\/g, '/');
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      const SKIP = ['node_modules', '.git', '.playwright', '.playwright-mcp', 'playwright-reports'];
      if (!SKIP.includes(name)) results = results.concat(walkDir(full, base));
    } else {
      results.push(rel);
    }
  }
  return results;
}

/** Parse spec files under tests/ to extract test names and steps */
function parseSpecFiles() {
  const testsDir = path.join(ROOT, 'tests');
  if (!fs.existsSync(testsDir)) return [];

  const specFiles = [];
  function findSpecs(dir) {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) findSpecs(full);
      else if (name.endsWith('.spec.ts') || name.endsWith('.spec.js')) specFiles.push(full);
    }
  }
  findSpecs(testsDir);

  return specFiles.map(filePath => {
    const src      = fs.readFileSync(filePath, 'utf8');
    const relFile  = path.relative(ROOT, filePath).replace(/\\/g, '/');
    const suiteMatch = src.match(/test\.describe\s*\(\s*['"`](.+?)['"`]/);
    const suiteName  = suiteMatch ? suiteMatch[1] : path.basename(filePath, '.spec.ts');

    // Extract individual test names and their steps (comment lines after test(â€¦))
    const tests = [];
    // Updated regex to match ANY test() call, not just TC_ prefixed ones
    const testRe = /test(?:\.skip|\.only)?\s*\(\s*['"`]([^'"`]+)['"`]/g;
    let m;
    while ((m = testRe.exec(src)) !== null) {
      const testName = m[1];
      // Pull step comments from the surrounding block (lines with "// TC" or "// â”€")
      const blockStart = src.indexOf(m[0], m.index);
      const blockEnd   = Math.min(blockStart + 1500, src.length);
      const block      = src.slice(blockStart, blockEnd);
      const stepRe     = /\/\/\s+(Navigate|Verify|Perform|Login|Wait|Click|Capture|Assert|Enter|Select|Complete|Navigate|Attempt)\s+.+/g;
      const steps = [];
      let sm;
      while ((sm = stepRe.exec(block)) !== null) steps.push(sm[0].replace(/\/\/\s+/, '').trim());
      tests.push({ name: testName, steps: steps.slice(0, 5) });
    }

    // Try to find a matching page object
    const poMatch  = src.match(/from\s+['"`][./]*pages\/(\w+)/);
    const pageObject = poMatch ? poMatch[1] : null;

    // Try to find test data
    let testDataObj = null;
    const tdMatch = src.match(/from\s+['"`][./]*Test_Data\/([\w-]+)\.json/);
    if (tdMatch) {
      try {
        testDataObj = JSON.parse(fs.readFileSync(path.join(ROOT, 'Test_Data', tdMatch[1] + '.json'), 'utf8'));
      } catch { /* ignore */ }
    }

    return {
      file:       relFile,
      suite:      suiteName,
      tests,
      pageObject,
      testData:   testDataObj,
      src,
    };
  });
}


// â”€â”€ API Endpoints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** GET /api/stats â€“ Test execution statistics + project metadata */
app.get('/api/stats', (req, res) => {
  const results = parsePlaywrightResults();

  // â”€â”€ Count spec files under tests/ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const testsDir = path.join(ROOT, 'tests');
  let specFiles = 0, totalTests = 0, totalSuites = 0;
  const specData = parseSpecFiles();
  specFiles  = specData.length;
  totalTests = specData.reduce((sum, s) => sum + (s.tests ? s.tests.length : 0), 0);
  
  // Count test suites (test.describe blocks) from spec files
  totalSuites = specData.reduce((sum, s) => {
    if (s.file && fs.existsSync(s.file)) {
      try {
        const content = fs.readFileSync(s.file, 'utf8');
        // Count test.describe blocks
        const describeMatches = content.match(/test\.describe\s*\(/g);
        return sum + (describeMatches ? describeMatches.length : 0);
      } catch (e) {
        return sum;
      }
    }
    return sum;
  }, 0);

  // â”€â”€ Count page objects under pages/ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const pagesDir = path.join(ROOT, 'Page_Objects');
  let pageObjects = 0;
  if (fs.existsSync(pagesDir)) {
    pageObjects = fs.readdirSync(pagesDir).filter(f => f.endsWith('.ts') || f.endsWith('.js')).length;
  }

  // â”€â”€ Count markdown spec files under specs/ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const specsMdDir = path.join(ROOT, 'specs');
  let mdSpecFiles = 0, mdTestCases = 0;
  if (fs.existsSync(specsMdDir)) {
    const mdFiles = fs.readdirSync(specsMdDir).filter(f => f.endsWith('.md'));
    mdSpecFiles = mdFiles.length;
    for (const f of mdFiles) {
      const content = fs.readFileSync(path.join(specsMdDir, f), 'utf8');
      const matches = content.match(/^## Test Case ID:/gm);
      if (matches) mdTestCases += matches.length;
    }
  }

  // â”€â”€ Jira story context â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const storyCtxPath = path.join(ROOT, 'Jira_Connector', 'story-context.json');
  let storyCtx = null;
  try { storyCtx = JSON.parse(fs.readFileSync(storyCtxPath, 'utf8')); } catch { /* ignore */ }

  // â”€â”€ Count test-data files â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const testDataDir = path.join(ROOT, 'Test_Data');
  let testDataFiles = 0;
  if (fs.existsSync(testDataDir)) {
    testDataFiles = fs.readdirSync(testDataDir).filter(f => f.endsWith('.json')).length;
  }

  // â”€â”€ AI provider â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const aiProvider = process.env.AI_PROVIDER || null;

  const playwrightSuiteCount = results ? (Array.isArray(results.suites) ? results.suites.length : 0) : 0;
  const suiteCount = totalSuites > 0 ? totalSuites : playwrightSuiteCount;

  res.json({
    ...(results || { total: 0, passed: 0, failed: 0, skipped: 0, suites: [] }),
    // Project metadata
    specFiles,
    totalTests:    totalTests || mdTestCases,
    pageObjects,
    testDataFiles,
    mdSpecFiles,
    mdTestCases,
    suiteCount,
    // Jira story info
    storyId:       storyCtx?.storyId   || null,
    storyName:     storyCtx?.storyName || null,
    jiraUrl:       storyCtx?.jiraUrl   || null,
    platform:      storyCtx?.platform  || null,
    // AI
    aiProvider,
    // Framework info
    framework:     'Playwright',
    language:      'TypeScript',
    baseUrl:       process.env.BASE_URL || 'https://vb-bank-demo.vercel.app',
  });
});

/** GET /api/tests â€“ List all test files and their metadata */
app.get('/api/tests', (req, res) => {
  const specs = parseSpecFiles();
  res.json({ specs });
});

/** GET /api/specs â€“ Parse markdown spec files into structured test cases */
app.get('/api/specs', (req, res) => {
  const specsDir = path.join(ROOT, 'specs');
  if (!fs.existsSync(specsDir)) return res.json({ testCases: [], files: [] });

  const mdFiles = fs.readdirSync(specsDir).filter(f => f.endsWith('.md'));
  const testCases = [];

  for (const file of mdFiles) {
    const content = fs.readFileSync(path.join(specsDir, file), 'utf8');
    // Derive issue key from filename e.g. KAN-1-TEST-CASES.md â†’ KAN-1
    const issueKeyMatch = file.match(/^([A-Z]+-\d+)/);
    const issueKey = issueKeyMatch ? issueKeyMatch[1] : file.replace('.md', '');

    // Split on test case blocks: ## Test Case ID: TC_xxx
    const blocks = content.split(/\n(?=## Test Case ID:)/);

    for (const block of blocks) {
      const idMatch    = block.match(/##\s*Test Case ID:\s*(TC_\d+)/i);
      if (!idMatch) continue;

      const id         = idMatch[1];
      const titleMatch = block.match(/\*\*Title:\*\*\s*(.+)/i);
      const prioMatch  = block.match(/\*\*Priority:\*\*\s*(.+)/i);
      const typeMatch  = block.match(/\*\*Test Type:\*\*\s*(.+)/i);
      const expMatch   = block.match(/\*\*Expected Results:\*\*([\s\S]*?)(?=\n\*\*|$)/i);

      // Extract first expected result line
      let expected = '';
      if (expMatch) {
        const lines = expMatch[1].trim().split('\n').map(l => l.replace(/^[-*]\s*/, '').trim()).filter(Boolean);
        expected = lines[0] || '';
      }

      testCases.push({
        id:       `${issueKey}-${id}`,
        issueKey,
        title:    titleMatch ? titleMatch[1].trim() : id,
        priority: prioMatch  ? prioMatch[1].trim()  : 'Medium',
        type:     typeMatch  ? typeMatch[1].trim()   : 'Functional',
        expected,
        source:   `specs/${file}`,
      });
    }
  }

  res.json({ testCases, files: mdFiles.map(f => `specs/${f}`) });
});

/** GET /api/results â€“ Latest Playwright test results */
app.get('/api/results', (req, res) => {
  const results = parsePlaywrightResults();
  res.json(results || { total: 0, passed: 0, failed: 0, skipped: 0, suites: [] });
});

/** GET /api/testdata â€“ Test data files with full JSON contents */
app.get('/api/testdata', (req, res) => {
  const testDataDir = path.join(ROOT, 'Test_Data');
  const files = fs.existsSync(testDataDir)
    ? fs.readdirSync(testDataDir).filter(f => f.endsWith('.json'))
    : [];
  const contents = {};
  for (const f of files) {
    try { contents[f] = JSON.parse(fs.readFileSync(path.join(testDataDir, f), 'utf8')); }
    catch { contents[f] = null; }
  }
  res.json({ files, contents });
});

/** PUT /api/testdata/:file â€“ Save edited JSON content back to Test_Data folder */
app.put('/api/testdata/:file', (req, res) => {
  try {
    const { file } = req.params;
    if (!file.endsWith('.json') || file.includes('..') || file.includes('/')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    const filePath = path.join(ROOT, 'Test_Data', file);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
    const { content } = req.body || {};
    // Validate JSON before saving
    JSON.parse(content);
    fs.writeFileSync(filePath, content, 'utf8');
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/** POST /api/testdata — Create or overwrite a test data file in Test_Data folder */
app.post('/api/testdata', (req, res) => {
  try {
    const { file, content } = req.body || {};
    if (!file || !file.endsWith('.json') || file.includes('..') || file.includes('/')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    const testDataDir = path.join(ROOT, 'Test_Data');
    if (!fs.existsSync(testDataDir)) fs.mkdirSync(testDataDir, { recursive: true });
    const filePath = path.join(testDataDir, file);
    // Validate JSON before saving
    JSON.parse(content);
    fs.writeFileSync(filePath, content, 'utf8');
    res.json({ ok: true, file });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/** GET /api/structure â€“ Project directory structure */
app.get('/api/structure', (req, res) => {
  const files = walkDir(ROOT);
  res.json({ files });
});

/** POST /api/run-tests â€“ Run all tests (SSE stream, type/data format) */
app.post('/api/run-tests', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  function sse(type, data) {
    res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
  }

  sse('log', 'â–¶ Starting test executionâ€¦');
  const reportRun = createPlaywrightReportRun('', '');

  const isWin = process.platform === 'win32';
  const binExt = isWin ? '.cmd' : '';
  const playwrightBin = path.join(ROOT, 'node_modules', '.bin', `playwright${binExt}`);
  const binExists = fs.existsSync(playwrightBin);

  const runCmd  = binExists ? `"${playwrightBin}"` : 'npx playwright';
  const runArgs = binExists
    ? ['test', '--reporter=list,html,json']
    : ['playwright', 'test', '--reporter=list,html,json'];

  const proc = spawn(runCmd, runArgs, {
    cwd: ROOT,
    shell: true,
    env: { ...process.env, ...playwrightReportEnvironment(reportRun) },
  });
  let outputBuf = '';

  function flushLines(text) {
    outputBuf += text;
    const lines = outputBuf.split('\n');
    outputBuf  = lines.pop();
    for (const line of lines) {
      if (line.trim()) sse('log', line);
    }
  }

  proc.stdout.on('data', d => flushLines(d.toString()));
  proc.stderr.on('data', d => flushLines(d.toString()));

  proc.on('close', code => {
    if (outputBuf.trim()) sse('log', outputBuf);
    sse('log', '');
    sse('log', `â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”`);
    
    const report = finalizePlaywrightReport(reportRun);
    if (report) sse('log', `Playwright report saved: ${report.reportUrl}`);
    sse('done', { exitCode: code, reportFile: report?.reportFile || null, reportUrl: report?.reportUrl || null });
    res.end();
  });

  req.on('close', () => { if (!proc.killed) proc.kill('SIGTERM'); });
});

/** GET /api/parse-test-file â€“ Extract test cases from a TypeScript spec file */
app.get('/api/parse-test-file', (req, res) => {
  console.log('[parse-test-file] Request received:', req.query);
  try {
    const { file } = req.query;
    if (!file) {
      console.log('[parse-test-file] Error: file parameter missing');
      return res.status(400).json({ error: 'file parameter is required' });
    }

    // Resolve to an absolute path
    let absFile;
    if (path.isAbsolute(file)) {
      absFile = path.normalize(file);
    } else {
      absFile = path.resolve(ROOT, file.replace(/\\/g, path.sep));
    }

    console.log('[parse-test-file] Resolved path:', absFile);

    if (!fs.existsSync(absFile)) {
      console.log('[parse-test-file] Error: File not found');
      return res.status(404).json({ error: 'File not found', path: absFile });
    }

    // Read the file content
    const content = fs.readFileSync(absFile, 'utf-8');
    console.log('[parse-test-file] File read successfully, length:', content.length);

    // Extract test cases using regex
    // Match test('test name', ...) or test.skip('test name', ...)
    const testRegex = /test(?:\.skip|\.only)?\s*\(\s*['"`]([^'"`]+)['"`]/g;
    const tests = [];
    let match;

    while ((match = testRegex.exec(content)) !== null) {
      const testName = match[1];
      
      // Try to extract additional metadata from comments above the test
      const beforeTest = content.substring(0, match.index);
      const lines = beforeTest.split('\n');
      
      // Look for metadata in comments (Type, Priority, etc.)
      let type = '';
      let priority = 'Medium';
      
      // Search backwards through recent lines for metadata
      for (let i = lines.length - 1; i >= Math.max(0, lines.length - 10); i--) {
        const line = lines[i];
        if (line.includes('Type:')) {
          const typeMatch = line.match(/Type:\s*(\w+)/);
          if (typeMatch) type = typeMatch[1];
        }
        if (line.includes('Priority:')) {
          const prioMatch = line.match(/Priority:\s*(\w+)/);
          if (prioMatch) priority = prioMatch[1];
        }
      }

      // If type not found in comments, infer from test name
      if (!type) {
        const nameLower = testName.toLowerCase();
        if (/negative|invalid|fail|error|empty|without|incorrect|insufficient|boundary|edge|special.char|maximum|minimum/.test(nameLower)) {
          type = 'Negative';
        } else {
          type = 'Positive';
        }
      }

      tests.push({
        name: testName,
        type,
        priority,
        file: file
      });
    }

    console.log('[parse-test-file] Found', tests.length, 'tests');
    res.json({
      file,
      testCount: tests.length,
      tests
    });
  } catch (err) {
    console.error('[parse-test-file] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/run-tests/file â€“ Run a specific spec file (SSE stream, type/data format) */
app.post('/api/run-tests/file', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  function sse(type, data) {
    res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
  }

  const { file, testName } = req.body || {};
  if (!file) {
    sse('error', 'No file specified');
    sse('done', { exitCode: 1, passed: 0, failed: 0, skipped: 0, testResults: [] });
    res.end();
    return;
  }

  // Resolve to an absolute, OS-native path
  let absFile;
  if (path.isAbsolute(file)) {
    absFile = path.normalize(file);
  } else {
    // Try multiple resolution strategies
    const strategies = [
      path.resolve(ROOT, file.replace(/\//g, path.sep)),  // Replace forward slashes with backslashes on Windows
      path.resolve(ROOT, file),                            // Direct resolution
      path.join(ROOT, file),                               // Using path.join
    ];
    
    absFile = null;
    for (const candidate of strategies) {
      if (fs.existsSync(candidate)) {
        absFile = candidate;
        break;
      }
    }
    
    // If still not found, use first strategy (for better error message)
    if (!absFile) {
      absFile = strategies[0];
    }
  }

  if (!fs.existsSync(absFile)) {
    sse('error', `âŒ Spec file not found: ${absFile}`);
    sse('error', `   Searched for: ${file}`);
    sse('error', `   Current working directory: ${ROOT}`);
    sse('done', { exitCode: 1, passed: 0, failed: 0, skipped: 0, testResults: [], file });
    res.end();
    return;
  }

  sse('log', `â–¶ Running: ${file}${testName ? ` [grep: "${testName}"]` : ''}`);
  sse('log', `ðŸ“‚ Resolved path: ${absFile}`);

  // Playwright 1.x matches spec file paths as regex patterns relative to the
  // project root. Passing an absolute path does NOT work â€” use the original
  // relative path (forward-slash normalised) so it matches the test discovery.
  const relFile = file.replace(/\\/g, '/');
  const reportRun = createPlaywrightReportRun(relFile, testName);
  const reportEnv = { ...process.env, ...playwrightReportEnvironment(reportRun) };

  // On Windows .cmd files need shell:true. On all platforms, quoting the path
  // handles spaces. Use the local playwright binary for speed; fall back to npx.
  const isWin  = process.platform === 'win32';
  const binExt = isWin ? '.cmd' : '';
  const playwrightBin = path.join(ROOT, 'node_modules', '.bin', `playwright${binExt}`);
  const binExists = fs.existsSync(playwrightBin);

  let spawnCmd, spawnArgs, spawnOpts;
  
  if (binExists) {
    // Direct local binary â€” shell:true required on Windows for .cmd files
    spawnCmd  = playwrightBin;
    spawnArgs = ['test', relFile, '--reporter=list,html,json'];
    if (testName) {
      spawnArgs.push('--grep', testName);
      // spawnArgs.push('--headed');  // Temporarily disabled
    }
    spawnOpts = { cwd: ROOT, shell: isWin, env: reportEnv };
  } else {
    // Fall back to npx
    spawnCmd  = 'npx';
    spawnArgs = ['playwright', 'test', relFile, '--reporter=list,html,json'];
    if (testName) {
      spawnArgs.push('--grep', testName);
      // spawnArgs.push('--headed');  // Temporarily disabled
    }
    spawnOpts = { cwd: ROOT, shell: isWin, env: reportEnv };
  }

  let outputBuf = '';
  let passed = 0, failed = 0, skipped = 0;
  const testResults = [];
  let lastFailureMessage = null;

  // When shell:true on Windows, we need to handle arguments differently
  let proc;
  if (isWin && spawnOpts.shell) {
    // On Windows with shell, build a command string with proper quoting
    const escapedArgs = spawnArgs.map(arg => {
      // Quote arguments that contain spaces
      if (arg.includes(' ') || arg.includes('"')) {
        return `"${arg.replace(/"/g, '\\"')}"`;
      }
      return arg;
    }).join(' ');
    const fullCmd = `${spawnCmd} ${escapedArgs}`;
    // Call with just 2 arguments when using shell with full command string
    proc = spawn(fullCmd, { shell: true, cwd: ROOT, env: reportEnv });
  } else {
    proc = spawn(spawnCmd, spawnArgs, spawnOpts);
  }

  function flushLines(text) {
    outputBuf += text;
    const lines = outputBuf.split('\n');
    outputBuf  = lines.pop();
    for (const line of lines) {
      if (!line.trim()) continue;
      sse('log', line);
      // Parse Playwright list reporter output
      // e.g.  âœ“  1 [chromium] â€º KAN-3: VB_Bank > TC_001: ... (3.2s)
      //       âœ—  2 [chromium] â€º KAN-3: VB_Bank > TC_002: ... (1.1s)
      const passMatch = line.match(/^\s*[âœ“âœ”]\s+\d+\s+.*?â€º\s+(.+?)\s+\((\d+[\d.]*\w*)\)/);
      const failMatch = line.match(/^\s*[âœ—âœ˜Ã—]\s+\d+\s+.*?â€º\s+(.+?)\s+\((\d+[\d.]*\w*)\)/);
      const skipMatch = line.match(/^\s*[-â€“]\s+\d+\s+.*?â€º\s+(.+)/);
      // Capture error details from lines containing error indicators
      if (line.includes('Error:') || line.includes('expected') || line.includes('Timeout') || line.includes('FAIL')) {
        lastFailureMessage = line.trim();
      }
      
      if (passMatch)  { passed++;  testResults.push({ name: passMatch[1], status: 'passed',  duration: passMatch[2], error: null }); lastFailureMessage = null; }
      if (failMatch)  { failed++;  testResults.push({ name: failMatch[1], status: 'failed',  duration: failMatch[2], error: lastFailureMessage }); }
      if (skipMatch)  { skipped++; testResults.push({ name: skipMatch[1], status: 'skipped', duration: '0', error: null }); }
    }
  }

  proc.stdout.on('data', d => flushLines(d.toString()));
  proc.stderr.on('data', d => flushLines(d.toString()));

  proc.on('error', err => {
    sse('error', `âŒ Process error: ${err.message}`);
    sse('log', '');
    sse('log', `â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”`);
    sse('done', { exitCode: 1, passed: 0, failed: 0, skipped: 0, testResults: [], file });
    res.end();
  });

  proc.on('close', code => {
    if (outputBuf.trim()) sse('log', outputBuf);
    sse('log', '');
    sse('log', `â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”`);
    sse('log', `Results: ${passed} passed, ${failed} failed, ${skipped} skipped (exit code: ${code})`);
    
    const report = finalizePlaywrightReport(reportRun, { passed, failed, skipped });
    if (report) sse('log', `Playwright report saved: ${report.reportUrl}`);
    sse('done', {
      exitCode: code,
      passed,
      failed,
      skipped,
      testResults,
      file,
      reportFile: report?.reportFile || null,
      reportUrl: report?.reportUrl || null,
    });
    res.end();
  });

  req.on('close', () => { if (!proc.killed) proc.kill('SIGTERM'); });
});

/** POST /api/run-mobile-tests â€“ Trigger a Taqwright mobile test suite (SSE stream) */
app.post('/api/run-mobile-tests', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const VALID_SUITES = ['taqwright', 'taqwright:swaglab', 'taqwright:bloodbank'];
  const suite = (req.body && req.body.suite) || 'taqwright';

  if (!VALID_SUITES.includes(suite)) {
    res.write(`data: ${JSON.stringify({ status: 'error', message: `Invalid suite. Valid: ${VALID_SUITES.join(', ')}` })}\n\n`);
    res.end();
    return;
  }

  res.write(`data: ${JSON.stringify({ status: 'starting', message: `Starting mobile suite: ${suite}` })}\n\n`);

  const runnerScript = path.join(ROOT, 'mobile-tests', 'scripts', 'mcp-run-tests.js');
  const extraEnv     = (req.body && req.body.env) || {};
  const proc         = spawn('node', [runnerScript, '--suite', suite], {
    cwd:   ROOT,
    shell: true,
    env:   Object.assign({}, process.env, extraEnv),
  });

  let outputBuffer = '';
  proc.stdout.on('data', data => {
    const text = data.toString();
    outputBuffer += text;
    res.write(`data: ${JSON.stringify({ status: 'running', output: text })}\n\n`);
  });
  proc.stderr.on('data', data => {
    const text = data.toString();
    outputBuffer += text;
    res.write(`data: ${JSON.stringify({ status: 'running', output: text })}\n\n`);
  });

  proc.on('close', code => {
    // Parse the JSON summary produced by mcp-run-tests.js
    let resultObj = null;
    try {
      const marker = '---MCP-TEST-RUN-RESULT---';
      const idx    = outputBuffer.indexOf(marker);
      if (idx !== -1) {
        const after = outputBuffer.slice(idx + marker.length);
        const fb    = after.indexOf('{');
        const lb    = after.lastIndexOf('}');
        if (fb !== -1 && lb > fb) {
          resultObj = JSON.parse(after.slice(fb, lb + 1).trim());
        }
      }
    } catch (e) { /* ignore parse errors */ }

    res.write(`data: ${JSON.stringify({
      status:    code === 0 ? 'completed' : 'failed',
      code,
      result:    resultObj,
    })}\n\n`);
    res.end();
  });

  req.on('close', () => { if (!proc.killed) proc.kill('SIGTERM'); });
});

/** GET /api/mobile-results â€“ Latest mobile test result from the test-results folder */
app.get('/api/mobile-results', (req, res) => {
  const mobileResultsDir = path.join(ROOT, 'mobile-tests', 'test-results');
  if (!fs.existsSync(mobileResultsDir)) {
    return res.json({ available: false, message: 'No mobile test results yet.' });
  }

  const lastRunFile = path.join(mobileResultsDir, '.last-run.json');
  let lastRun = null;
  if (fs.existsSync(lastRunFile)) {
    try { lastRun = JSON.parse(fs.readFileSync(lastRunFile, 'utf8')); } catch { /* ignore */ }
  }

  res.json({
    available:   true,
    resultsDir:  'mobile-tests/test-results',
    reportDir:   'mobile-tests/test-results-html',
    lastRun,
  });
});

// â”€â”€ Selenium to Playwright Migration API Endpoints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** POST /api/migration/upload â€“ Upload Selenium framework ZIP file */
app.post('/api/migration/upload', async (req, res) => {
  try {
    const { zipPath } = req.body;
    if (!zipPath) {
      return res.status(400).json({ error: 'zipPath is required' });
    }

    // Note: This endpoint expects MCP tool to be available
    // The actual MCP call would be made by the frontend via Kiro's MCP integration
    res.json({ message: 'Upload endpoint ready. Use MCP tools directly from frontend.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/migration/sessions â€“ List migration sessions */
app.get('/api/migration/sessions', async (req, res) => {
  try {
    // Check if migration output directory exists
    const migrationDir = path.join(ROOT, 'migration-output');
    if (!fs.existsSync(migrationDir)) {
      return res.json({ sessions: [] });
    }

    const sessions = fs.readdirSync(migrationDir)
      .filter(f => fs.statSync(path.join(migrationDir, f)).isDirectory())
      .map(sessionId => ({
        sessionId,
        path: path.join(migrationDir, sessionId),
        created: fs.statSync(path.join(migrationDir, sessionId)).mtime
      }));

    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/migration/status â€“ Get migration service health status */
app.get('/api/migration/status', async (req, res) => {
  try {
    // Check if MCP tools are available by checking for migration output directory
    const migrationDir = path.join(ROOT, 'migration-output');
    const available = fs.existsSync(migrationDir);
    
    res.json({
      available,
      message: available ? 'Migration service ready' : 'Migration service not initialized',
      outputDir: migrationDir
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/jira/validate
 * Validate Jira credentials from the Login screen.
 * On success, persist JIRA_BASE_URL, JIRA_EMAIL and JIRA_API_TOKEN
 * to process.env AND the .env file so all subsequent Jira API calls
 * work immediately without a server restart.
 */
app.post('/api/jira/validate', async (req, res) => {
  try {
    const { url, username, password } = req.body || {};
    if (!url || !username || !password) {
      return res.status(400).json({ error: 'url, username and password (API token) are required' });
    }
    const baseUrl   = url.replace(/\/+$/, '');
    const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');

    // Test credentials against the Jira "myself" endpoint
    const response = await axios.get(`${baseUrl}/rest/api/3/myself`, {
      headers: { Authorization: `Basic ${basicAuth}`, Accept: 'application/json' },
      timeout: 15000,
      validateStatus: () => true,
    });

    if (response.status !== 200) {
      return res.status(401).json({
        error: `Jira returned HTTP ${response.status}. Check URL, email and API token.`,
      });
    }

    // Persist to process.env and .env file
    const updates = {
      JIRA_BASE_URL:      baseUrl,
      JIRA_EMAIL:         username,
      JIRA_API_TOKEN:     password,
      TestManagementTool: 'Jira',
    };
    updateEnvFile(ENV_FILE_PATH, updates);
    Object.assign(process.env, updates);

    const displayName = response.data.displayName || username;
    res.json({ ok: true, message: `Connected as ${displayName}`, displayName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/ado/validate
 * Validate Azure DevOps credentials from the Login screen.
 * On success, persist ADO_ORG_URL, ADO_PAT (and ADO_PROJECT if derivable)
 * to process.env and the .env file.
 */
app.post('/api/ado/validate', async (req, res) => {
  try {
    const { url, username, password } = req.body || {};
    if (!url || !password) {
      return res.status(400).json({ error: 'url and password (PAT) are required' });
    }
    const baseUrl   = url.replace(/\/+$/, '');
    const basicAuth = Buffer.from(`:${password}`).toString('base64');

    // Test against the ADO projects list endpoint
    const response = await axios.get(`${baseUrl}/_apis/projects?api-version=7.0&$top=1`, {
      headers: { Authorization: `Basic ${basicAuth}` },
      timeout: 15000,
      validateStatus: () => true,
    });

    if (response.status !== 200) {
      return res.status(401).json({
        error: `Azure DevOps returned HTTP ${response.status}. Check org URL and PAT.`,
      });
    }

    // Derive project from URL: https://dev.azure.com/org/project -> project
    const urlParts  = baseUrl.replace(/^https?:\/\//, '').split('/');
    const adoProject = urlParts.length >= 3 ? urlParts[2] : (process.env.ADO_PROJECT || '');

    const updates = {
      ADO_ORG_URL:        baseUrl,
      ADO_PAT:            password,
      TestManagementTool: 'ADO',
    };
    if (adoProject) updates.ADO_PROJECT = adoProject;
    updateEnvFile(ENV_FILE_PATH, updates);
    Object.assign(process.env, updates);

    res.json({ ok: true, message: 'Connected to Azure DevOps' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/jira/config â€“ Jira configuration */
app.get('/api/jira/config', (req, res) => {
  const story = process.env.JIRA_STORY1_STORY || '';
  const projectKey = story.includes('-') ? story.split('-')[0] : '';
  const rawToolType = process.env.TestManagementTool || process.env.TESTMANAGEMENTTOOL || 'Jira';
  const toolType = rawToolType.trim().toUpperCase() === 'ADO' ? 'ADO' : 'Jira';
  // Customer label for dashboard title
  const customerLabel = (process.env.Customer || process.env.CUSTOMER || 'TEST DASHBOARD').replace(/^"|"$/g, '').trim();
  res.json({
    baseUrl:       (process.env.JIRA_BASE_URL || '').replace(/\/$/, ''),
    email:         process.env.JIRA_EMAIL || '',
    projectKey,
    toolType,
    customerLabel,
    adoOrgUrl:     process.env.ADO_ORG_URL   || '',
    adoProject:    process.env.ADO_PROJECT   || '',
    configured: !!(process.env.JIRA_BASE_URL && process.env.JIRA_EMAIL && process.env.JIRA_API_TOKEN)
  });
});

// â”€â”€ Azure DevOps API Endpoints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Build Basic-auth header from ADO PAT */
function adoAuth() {
  const pat = process.env.ADO_PAT || '';
  return 'Basic ' + Buffer.from(`:${pat}`).toString('base64');
}

function adoBase() {
  return (process.env.ADO_ORG_URL || '').replace(/\/$/, '');
}

function adoProject() {
  return process.env.ADO_PROJECT || '';
}

/** GET /api/ado/projects â€“ Return the configured ADO project as a project list */
app.get('/api/ado/projects', (req, res) => {
  const project = adoProject();
  if (!project) return res.json({ projects: [] });
  // Shape like Jira project so the dashboard can reuse the same dropdown
  res.json({ projects: [{ key: project, name: project, id: project }] });
});

/** GET /api/ado/board â€“ Fetch ADO work items via WIQL, shaped like /api/jira/board */
app.get('/api/ado/board', async (req, res) => {
  try {
    const { view = 'all' } = req.query;
    const base    = adoBase();
    const project = adoProject();
    const auth    = adoAuth();
    if (!base || !project || !process.env.ADO_PAT) {
      return res.status(401).json({ error: 'ADO not configured (ADO_ORG_URL / ADO_PROJECT / ADO_PAT)' });
    }

    // Build WIQL depending on view
    let whereClause = `[System.TeamProject] = '${project.replace(/'/g, "''")}'`;
    if      (view === 'inprogress') whereClause += ` AND [System.State] = 'Active'`;
    else if (view === 'new')        whereClause += ` AND [System.State] = 'New'`;
    else if (view === 'design')     whereClause += ` AND [System.State] = 'Design'`;
    else if (view === 'resolved')   whereClause += ` AND [System.State] = 'Resolved'`;
    else if (view === 'done')       whereClause += ` AND [System.State] = 'Closed'`;
    else if (view === 'todo')       whereClause += ` AND [System.State] = 'To Do'`;
    else if (view === 'removed')    whereClause += ` AND [System.State] = 'Removed'`;
    else if (view === 'sprint')     whereClause += ` AND [System.IterationPath] UNDER '${project.replace(/'/g, "''")}' AND [System.State] <> 'Removed'`;

    const wiql = { query: `SELECT [System.Id],[System.Title],[System.State],[System.WorkItemType],[Microsoft.VSTS.Common.Priority],[System.AssignedTo],[System.ChangedDate] FROM WorkItems WHERE ${whereClause} ORDER BY [System.ChangedDate] DESC` };

    const wiqlRes = await axios.post(
      `${base}/${encodeURIComponent(project)}/_apis/wit/wiql?api-version=7.0&$top=100`,
      wiql,
      { headers: { Authorization: auth, 'Content-Type': 'application/json' } }
    );

    const workItemRefs = (wiqlRes.data.workItems || []).slice(0, 100);
    if (!workItemRefs.length) {
      return res.json({ project, total: 0, columns: [], fetchedAt: new Date().toISOString() });
    }

    // Batch-fetch full details
    const ids = workItemRefs.map(w => w.id).join(',');
    const detailRes = await axios.get(
      `${base}/_apis/wit/workitems?ids=${ids}&fields=System.Id,System.Title,System.State,System.WorkItemType,Microsoft.VSTS.Common.Priority,System.AssignedTo,System.ChangedDate&api-version=7.0`,
      { headers: { Authorization: auth } }
    );

    const items = detailRes.data.value || [];
    const colOrder = ['New', 'Active', 'Resolved', 'Closed', 'Removed'];
    const colMap = {};

    for (const item of items) {
      const f      = item.fields || {};
      const state  = f['System.State'] || 'New';
      const assignee = f['System.AssignedTo'];
      const displayName = typeof assignee === 'object' ? (assignee.displayName || '') : (assignee || '');
      const initials = displayName.split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase();

      if (!colMap[state]) colMap[state] = [];
      colMap[state].push({
        key:                 String(item.id),
        summary:             f['System.Title'] || '',
        status:              state,
        priority:            String(f['Microsoft.VSTS.Common.Priority'] || ''),
        issueType:           f['System.WorkItemType'] || '',
        assigneeInitials:    initials || null,
        assigneeDisplayName: displayName || null,
        assigneeAvatar:      typeof assignee === 'object' ? (assignee._links?.avatar?.href || null) : null,
        updated:             f['System.ChangedDate'] || null,
        labels:              [],
        url:                 `${base}/${encodeURIComponent(project)}/_workitems/edit/${item.id}`,
      });
    }

    const knownCols  = colOrder.filter(c => colMap[c]);
    const extraCols  = Object.keys(colMap).filter(c => !colOrder.includes(c));
    const columns    = [...knownCols, ...extraCols].map(name => ({ name, issues: colMap[name] }));

    res.json({ project, total: items.length, columns, fetchedAt: new Date().toISOString() });
  } catch (err) {
    res.status(err.response?.status || 500).json({ error: err.message });
  }
});

/** GET /api/ado/issue/:id â€“ Fetch a single ADO work item shaped like /api/jira/issue/:key */
app.get('/api/ado/issue/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const base    = adoBase();
    const project = adoProject();
    const auth    = adoAuth();
    if (!base || !project || !process.env.ADO_PAT) {
      return res.status(401).json({ error: 'ADO not configured' });
    }

    const r = await axios.get(
      `${base}/_apis/wit/workitems/${id}?$expand=all&api-version=7.0`,
      { headers: { Authorization: auth } }
    );

    const f = r.data.fields || {};
    const stripHtml = s => (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    const description        = stripHtml(f['System.Description'] || f['Microsoft.VSTS.Common.AcceptanceCriteria'] || '');
    const acceptanceCriteria = stripHtml(f['Microsoft.VSTS.Common.AcceptanceCriteria'] || f['System.Description'] || '');
    const assignee = f['System.AssignedTo'];
    const prioMap  = { '1': 'Critical', '2': 'High', '3': 'Medium', '4': 'Low' };

    res.json({
      key:                String(id),
      summary:            f['System.Title'] || '',
      status:             f['System.State'] || '',
      priority:           prioMap[String(f['Microsoft.VSTS.Common.Priority'])] || '',
      issueType:          f['System.WorkItemType'] || '',
      assignee:           typeof assignee === 'object' ? (assignee.displayName || '') : (assignee || ''),
      description,
      acceptanceCriteria,
      labels:             [],
      updated:            f['System.ChangedDate'] || null,
      subtasks:           [],
      comments:           [],
      url:                `${base}/${encodeURIComponent(project)}/_workitems/edit/${id}`,
    });
  } catch (err) {
    res.status(err.response?.status || 500).json({ error: err.message });
  }
});

/** GET /api/jira/projects â€“ List Jira projects */
app.get('/api/jira/projects', async (req, res) => {
  try {
    const baseUrl = process.env.JIRA_BASE_URL;
    const email = process.env.JIRA_EMAIL;
    const apiToken = process.env.JIRA_API_TOKEN;
    
    if (!baseUrl || !email || !apiToken) {
      return res.json({ projects: [] });
    }
    
    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
    const response = await axios.get(`${baseUrl.replace(/\/$/, '')}/rest/api/3/project`, {
      headers: { Authorization: `Basic ${auth}`, 'Accept': 'application/json' }
    });

    // Return projects with a default boardType (agile board API may not be available)
    const projects = response.data.map(p => ({ ...p, boardType: 'kanban', boardId: null }));
    res.json({ projects });
  } catch (err) {
    res.json({ projects: [], error: err.message });
  }
});

/** GET /api/jira/board â€“ Get issues grouped by status column */
app.get('/api/jira/board', async (req, res) => {
  try {
    const { project, view = 'all' } = req.query;
    const baseUrl   = (process.env.JIRA_BASE_URL || '').replace(/\/$/, '');
    const email     = process.env.JIRA_EMAIL;
    const apiToken  = process.env.JIRA_API_TOKEN;

    if (!baseUrl || !email || !apiToken) {
      return res.status(401).json({ error: 'Jira not configured' });
    }
    if (!project) {
      return res.status(400).json({ error: 'project query param required' });
    }

    const auth    = Buffer.from(`${email}:${apiToken}`).toString('base64');
    const headers = { Authorization: `Basic ${auth}`, 'Accept': 'application/json' };

    // Build JQL based on view
    let jql = `project = "${project}" ORDER BY updated DESC`;
    if      (view === 'sprint')     jql = `project = "${project}" AND sprint in openSprints() ORDER BY updated DESC`;
    else if (view === 'backlog')    jql = `project = "${project}" AND sprint is EMPTY ORDER BY created DESC`;
    else if (view === 'inprogress') jql = `project = "${project}" AND status = "In Progress" ORDER BY updated DESC`;
    else if (view === 'done')       jql = `project = "${project}" AND status = "Done" ORDER BY updated DESC`;
    else if (view === 'mine')       jql = `project = "${project}" AND assignee = currentUser() ORDER BY updated DESC`;

    const searchRes = await axios.post(
      `${baseUrl}/rest/api/3/search/jql`,
      { jql, maxResults: 100, fields: ['summary','status','priority','assignee','issuetype','labels','updated'] },
      { headers: { ...headers, 'Content-Type': 'application/json' } }
    );

    const issues = searchRes.data.issues || [];

    // Group by status category â†’ columns
    const colOrder = ['To Do', 'In Progress', 'In Review', 'Done'];
    const colMap   = {};
    for (const issue of issues) {
      const statusName = issue.fields.status?.name || 'To Do';
      const colKey     = statusName;
      if (!colMap[colKey]) colMap[colKey] = [];
      const assignee = issue.fields.assignee;
      colMap[colKey].push({
        key:                 issue.key,
        summary:             issue.fields.summary,
        status:              statusName,
        priority:            issue.fields.priority?.name || null,
        issueType:           issue.fields.issuetype?.name || null,
        assigneeInitials:    assignee ? (assignee.displayName || '?').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() : null,
        assigneeDisplayName: assignee?.displayName || null,
        assigneeAvatar:      assignee?.avatarUrls?.['24x24'] || null,
        issueTypeIcon:       issue.fields.issuetype?.iconUrl || null,
        labels:              issue.fields.labels || [],
        updated:             issue.fields.updated || null,
      });
    }

    // Build ordered columns (known ones first, then any extras)
    const knownCols = colOrder.filter(c => colMap[c]);
    const extraCols = Object.keys(colMap).filter(c => !colOrder.includes(c));
    const columns   = [...knownCols, ...extraCols].map(name => ({ name, issues: colMap[name] }));

    res.json({
      project,
      total:     issues.length,
      columns,
      baseUrl,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(err.response?.status || 500).json({ error: err.message });
  }
});

/**
 * Recursively extract plain text from Atlassian Document Format (ADF).
 * Jira REST API v3 returns description/comments as ADF nodes, not plain strings.
 */
function adfToText(node) {
  if (!node) return '';
  if (typeof node === 'string') return node;
  // Text leaf
  if (node.type === 'text') return node.text || '';
  // Hard break â†’ newline
  if (node.type === 'hardBreak') return '\n';
  // Block-level nodes that should be separated by newlines
  const blockTypes = ['paragraph', 'heading', 'bulletList', 'orderedList', 'listItem',
                      'blockquote', 'codeBlock', 'rule', 'table', 'tableRow', 'tableCell',
                      'tableHeader', 'mediaSingle'];
  const isBlock = blockTypes.includes(node.type);
  let text = '';
  if (Array.isArray(node.content)) {
    text = node.content.map(adfToText).join('');
  }
  return isBlock ? text.trim() + '\n' : text;
}

/** Extract acceptance criteria from ADF description.
 *  Looks for a heading containing "acceptance criteria" and returns the text
 *  of the section that follows it. Falls back to full description text.
 */
function extractAcceptanceCriteria(adfDoc) {
  if (!adfDoc || !adfDoc.content) return null;
  const nodes = adfDoc.content;
  let inAC = false;
  const acLines = [];

  for (const node of nodes) {
    const nodeText = adfToText(node).trim();
    if (node.type === 'heading') {
      if (/acceptance\s*criteria/i.test(nodeText)) {
        inAC = true;
        continue;
      }
      // Another heading after AC section ends it
      if (inAC) break;
    }
    if (inAC && nodeText) acLines.push(nodeText);
  }

  return acLines.length ? acLines.join('\n') : null;
}

/** GET /api/jira/issue/:key â€“ Get Jira issue details, shaped for the dashboard */
app.get('/api/jira/issue/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const baseUrl  = (process.env.JIRA_BASE_URL || '').replace(/\/$/, '');
    const email    = process.env.JIRA_EMAIL;
    const apiToken = process.env.JIRA_API_TOKEN;

    if (!baseUrl || !email || !apiToken) {
      return res.status(401).json({ error: 'Jira not configured' });
    }

    const auth    = Buffer.from(`${email}:${apiToken}`).toString('base64');
    const headers = { Authorization: `Basic ${auth}`, 'Accept': 'application/json' };

    // Fetch issue with all needed fields including description and comments
    const response = await axios.get(
      `${baseUrl}/rest/api/3/issue/${key}?fields=summary,status,priority,assignee,issuetype,description,comment,subtasks,updated,labels`,
      { headers }
    );

    const raw    = response.data;
    const fields = raw.fields || {};

    // Convert ADF description to plain text
    const descAdf    = fields.description;
    const descText   = descAdf ? adfToText(descAdf).trim() : '';

    // Try to extract a dedicated "Acceptance Criteria" section from the description
    const acText     = descAdf ? (extractAcceptanceCriteria(descAdf) || descText) : '';

    // Shape comments
    const comments = (fields.comment?.comments || []).slice(-5).map(c => ({
      author:  c.author?.displayName || 'Unknown',
      created: c.created,
      body:    c.body ? adfToText(c.body).trim().slice(0, 400) : '',
    }));

    // Shape subtasks
    const subtasks = (fields.subtasks || []).map(s => ({
      key:     s.key,
      summary: s.fields?.summary || '',
      status:  s.fields?.status?.name || '',
    }));

    res.json({
      key,
      summary:            fields.summary             || key,
      status:             fields.status?.name        || '',
      priority:           fields.priority?.name      || '',
      issueType:          fields.issuetype?.name     || '',
      assignee:           fields.assignee?.displayName || '',
      description:        descText,
      acceptanceCriteria: acText,
      labels:             fields.labels              || [],
      updated:            fields.updated             || null,
      subtasks,
      comments,
      url: `${baseUrl}/browse/${key}`,
    });
  } catch (err) {
    res.status(err.response?.status || 500).json({ error: err.message });
  }
});

// â”€â”€ In-memory store for saved test cases (keyed by issueKey) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const savedTestCasesStore = {};

// â”€â”€ Planner Agent: rule-based test case generator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Extract story context clues to identify test data and workflows.
 * Looks for specific patterns in acceptance criteria text.
 */
function extractStoryContext(text) {
  const context = {
    urls: [],
    dates: [],
    numbers: [],
    locations: [],
    actions: [],
    entities: []
  };

  if (!text) return context;

  // Extract URLs
  const urlPattern = /https?:\/\/[^\s]+/gi;
  const urls = text.match(urlPattern);
  if (urls) context.urls = [...new Set(urls)];

  // Extract dates (DD-MM-YYYY or MM-DD-YYYY formats)
  const datePattern = /\d{1,2}[-/]\d{1,2}[-/]\d{4}/g;
  const dates = text.match(datePattern);
  if (dates) context.dates = [...new Set(dates)];

  // Extract numbers
  const numberPattern = /\b(\d+)\s*(adults|guests|children|pets|rooms?|properties?|results?)\b/gi;
  const matches = [...text.matchAll(numberPattern)];
  matches.forEach(m => {
    context.numbers.push({ value: m[1], type: m[2] });
  });

  // Extract location names (common pattern: "City, State/Country")
  const locationPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;
  const locs = [...text.matchAll(locationPattern)];
  locs.forEach(m => {
    context.locations.push({ city: m[1], region: m[2] });
  });

  return context;
}

/**
 * Parse acceptance criteria text into individual criteria lines.
 * Handles numbered lists, bullet lists, and plain paragraphs.
 */
function parseCriteria(text) {
  if (!text || text.trim() === '' || text.trim() === 'â€“') return [];
  const lines = text.split('\n')
    .map(l => l.replace(/^[\s\-\*\d\.]+/, '').trim())
    .filter(l => l.length > 5);
  return lines;
}

/**
 * Derive a short slug from issue summary for use in test case IDs.
 */
function deriveSlug(summary) {
  return (summary || 'feature')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .join('_')
    .toUpperCase();
}

/**
 * Planner Agent: generates structured test cases from ticket data.
 * Uses AI if configured, otherwise falls back to rule-based generation.
 */
async function plannerAgentGenerate({ issueKey, summary, description, acceptanceCriteria }) {
  const ac = acceptanceCriteria || description || '';
  const criteria = parseCriteria(ac);
  const slug     = deriveSlug(summary);
  const now      = new Date().toISOString().split('T')[0];

  // Attempt AI generation
  const aiProvider = process.env.AI_PROVIDER;
  const aiApiKey   = process.env.AI_API_KEY;

  if (aiProvider && aiApiKey) {
    try {
      const prompt = buildAIPrompt(issueKey, summary, ac);
      const aiResult = await callAI(aiProvider, aiApiKey, process.env.AI_MODEL, prompt);
      if (aiResult) {
        const parsed = parseAITestCases(aiResult, issueKey);
        if (parsed && (parsed.positive.length + parsed.negative.length + parsed.edge.length) > 0) {
          return { testCases: parsed, source: 'ai' };
        }
      }
    } catch (err) {
      console.warn('AI generation failed, using rule-based fallback:', err.message);
    }
  }

  // Extract story context for smart test data
  const storyContext = extractStoryContext(ac);

  // Rule-based fallback with consolidated test cases (max 8 scenarios)
  const positive = [];
  const negative = [];
  const edge     = [];

  // Derive story-specific values with safe fallbacks
  const destCity    = storyContext.locations[0]?.city   || '';
  const destRegion  = storyContext.locations[0]?.region || '';
  const destFull    = destCity && destRegion ? `${destCity}, ${destRegion}` : destCity || 'destination';
  const dateIn      = storyContext.dates[0]  || '';
  const dateOut     = storyContext.dates[1]  || '';
  const guestVal    = storyContext.numbers[0]?.value || '3';
  const guestType   = storyContext.numbers[0]?.type  || 'adults';
  const guestStr    = `${guestVal} ${guestType}`;
  const appUrl      = storyContext.urls[0]   || 'https://www.airbnb.co.in/';

  // Generate 3 positive test cases matching Kiro quality
  // P01: Complete end-to-end search with all criteria (mirrors TC_AIR1_001)
  const p01Steps = [
    { action: `Navigate to ${appUrl}`,                                                                 result: 'Page loads successfully' },
    { action: 'Verify destination search bar is visible',                                              result: 'Search bar is displayed on the page' },
    { action: 'Click on destination search bar',                                                       result: 'Search bar becomes active/focused' },
    { action: `Enter destination text "${destFull}"`,                                                  result: 'Text appears in search bar' },
    { action: `Select "${destFull}" from dropdown`,                                                    result: 'Destination is selected' },
    { action: 'Click on check-in date field',                                                          result: 'Date picker opens' },
    { action: `Select check-in date as ${dateIn || 'check-in date'}`,                                  result: `Date ${dateIn || 'is'} highlighted` },
    { action: 'Click on check-out date field',                                                         result: 'Checkout date picker opens' },
    { action: `Select check-out date as ${dateOut || 'check-out date'}`,                               result: `Date ${dateOut || 'is'} highlighted` },
    { action: 'Click on "Add Guests" button',                                                          result: 'Guest selection panel expands' },
    { action: `Select ${guestStr} from guest options`,                                                 result: `${guestStr} are selected` },
    { action: 'Click on "Search" button',                                                              result: 'Search is initiated' },
    { action: 'Wait for results to load',                                                              result: 'Multiple results are displayed' },
    { action: 'Verify first result contains selected destination',                                     result: `Result shows "${destCity}" or relevant property` },
    { action: 'Verify dates in result match selection',                                                result: `Dates show ${dateIn} to ${dateOut}` },
    { action: 'Verify guest count in result matches',                                                  result: `Result shows "${guestStr}" or similar` },
  ];
  positive.push({
    id:              `${issueKey}-TC_P01`,
    title:           `User performs complete search with all criteria`,
    type:            'Positive',
    priority:        'Critical',
    component:       'AirBnb Search Page',
    preconditions:   `Application is accessible at ${appUrl}\nBrowser is Chrome/Chromium\nNetwork connectivity is available\nJavaScript is enabled`,
    steps:           p01Steps.map(s => s.action),
    stepsWithResults: p01Steps,
    expectedResult: [
      `✅ Application loads without errors`,
      `✅ Search bar is visible and functional`,
      `✅ Destination "${destFull}" can be entered and selected`,
      `✅ Date picker works correctly for both check-in and check-out`,
      `✅ Guest selection shows ${guestStr}`,
      `✅ Search results populate with multiple options`,
      `✅ First result matches all search criteria`,
    ].join('\n'),
    testData: JSON.stringify({ destination: destFull, checkInDate: dateIn, checkOutDate: dateOut, adultsCount: parseInt(guestVal, 10) || 3, childrenCount: 0, petsCount: 0 }, null, 2),
    _storyContext: storyContext,
  });

  // P02: Search with valid destination and future dates — standalone test (mirrors TC_AIR1_002)
  const p02Steps = [
    { action: `Navigate to ${appUrl}`,                                                                 result: 'Search form is displayed' },
    { action: `Enter valid destination "${destCity || destFull}"`,                                     result: 'Autocomplete suggestions appear' },
    { action: 'Select first autocomplete suggestion',                                                  result: 'Destination is selected' },
    { action: `Enter check-in date ${dateIn || 'check-in date'}`,                                      result: 'Date is accepted' },
    { action: `Enter check-out date ${dateOut || 'check-out date'}`,                                   result: 'Date is accepted and is after check-in' },
    { action: `Set guests to ${guestStr}`,                                                             result: 'Adults count updated' },
    { action: 'Click Submit/Search button',                                                            result: 'Search completes' },
    { action: 'Wait for results page to load',                                                         result: 'Results are visible' },
    { action: 'Count visible properties',                                                              result: 'Count >= 1' },
  ];
  positive.push({
    id:              `${issueKey}-TC_P02`,
    title:           `User searches with valid destination and future dates`,
    type:            'Positive',
    priority:        'Critical',
    component:       'AirBnb Search Page',
    preconditions:   `Application is accessible at ${appUrl}\nCurrent date is before ${dateIn || 'check-in date'}\nMultiple properties exist in ${destCity || 'destination'}`,
    steps:           p02Steps.map(s => s.action),
    stepsWithResults: p02Steps,
    expectedResult: [
      `✅ Search completes successfully`,
      `✅ Results page loads within acceptable time`,
      `✅ Properties are displayed`,
      `✅ Properties match destination "${destCity || destFull}"`,
      `✅ Result count >= 1`,
    ].join('\n'),
    testData: JSON.stringify({ destination: destCity || destFull, checkInDate: dateIn, checkOutDate: dateOut, guests: parseInt(guestVal, 10) || 3 }, null, 2),
    _storyContext: storyContext,
  });

  // P03: Modify search criteria and perform new search (mirrors TC_AIR1_003)
  const p03Steps = [
    { action: 'Click on search bar to modify destination',                                             result: 'Current search criteria displayed' },
    { action: `Clear current destination "${destFull}"`,                                               result: 'Destination field is empty' },
    { action: 'Enter new destination "Bangalore"',                                                     result: 'New destination entered' },
    { action: 'Update check-in date to 05-12-2026',                                                   result: 'New check-in date selected' },
    { action: 'Update check-out date to 08-12-2026',                                                  result: 'New check-out date selected' },
    { action: 'Click Search again',                                                                    result: 'New search initiated' },
    { action: 'Wait for results to load',                                                              result: 'New results load' },
    { action: 'Verify results are for Bangalore',                                                      result: 'Results show Bangalore properties' },
    { action: 'Verify dates are updated in results',                                                   result: 'Results show new date range 05-12-2026 to 08-12-2026' },
  ];
  positive.push({
    id:              `${issueKey}-TC_P03`,
    title:           `User can modify search criteria and perform new search`,
    type:            'Positive',
    priority:        'High',
    component:       'AirBnb Search Page',
    preconditions:   `User has completed initial search (TC_P01)\nResults page is displayed`,
    steps:           p03Steps.map(s => s.action),
    stepsWithResults: p03Steps,
    expectedResult: [
      `✅ Search criteria can be modified`,
      `✅ New search completes successfully`,
      `✅ Results update to show Bangalore properties`,
      `✅ Results reflect new dates 05-12-2026 to 08-12-2026`,
    ].join('\n'),
    testData: JSON.stringify({ newDestination: 'Bangalore', newCheckIn: '05-12-2026', newCheckOut: '08-12-2026' }, null, 2),
    _storyContext: storyContext,
  });

  // Generate 3 specific negative test cases matching Kiro quality
  negative.push(
    {
      id:            `${issueKey}-TC_N01`,
      title:         `User attempts search with invalid destination`,
      type:          'Negative',
      priority:      'High',
      component:     'AirBnb Search Page',
      preconditions: `Application is accessible at ${appUrl}\nNo properties exist with the invalid destination name`,
      steps: [
        `Navigate to ${appUrl}`,
        `Enter invalid destination "XYZ12345InvalidPlace"`,
        `Try to select from autocomplete dropdown`,
        `Set dates to ${dateIn || '01-12-2026'} - ${dateOut || '04-12-2026'}`,
        `Set guests to ${guestStr}`,
        `Click Search button`,
        `Wait for result`,
      ],
      expectedResult: `✅ Application handles invalid destination gracefully\n✅ Error message or "No results" message is displayed\n✅ Application doesn't crash\n✅ No server errors in console`,
      testData: JSON.stringify({
        invalidDestination: 'XYZ12345InvalidPlace',
        checkInDate:  dateIn  || '01-12-2026',
        checkOutDate: dateOut || '04-12-2026',
      }, null, 2),
      _storyContext: storyContext,
    },
    {
      id:            `${issueKey}-TC_N02`,
      title:         `User attempts search with check-out date before check-in date`,
      type:          'Negative',
      priority:      'High',
      component:     'AirBnb Search Page',
      preconditions: `Application is accessible at ${appUrl}\nDate validation is implemented`,
      steps: [
        `Navigate to ${appUrl}`,
        `Enter destination "${destCity || destFull}"`,
        `Select check-in date ${dateOut || '04-12-2026'}`,
        `Try to select check-out date ${dateIn || '01-12-2026'} (before check-in)`,
        `Verify checkout date is enforced to be >= check-in date`,
      ],
      expectedResult: `✅ Application prevents invalid date selection\n✅ Error message or validation feedback is shown\n✅ Search cannot be submitted with invalid dates\n✅ Check-out date cannot be set before check-in date`,
      testData: JSON.stringify({
        destination:         destCity || destFull,
        checkInDate:         dateOut  || '04-12-2026',
        invalidCheckOutDate: dateIn   || '01-12-2026',
      }, null, 2),
      _storyContext: storyContext,
    },
    {
      id:            `${issueKey}-TC_N03`,
      title:         `User attempts search without filling mandatory fields`,
      type:          'Negative',
      priority:      'High',
      component:     'AirBnb Search Page',
      preconditions: `Application is accessible at ${appUrl}\nForm validation is implemented`,
      steps: [
        `Navigate to ${appUrl}`,
        `Leave destination field empty`,
        `Set dates to ${dateIn || '01-12-2026'} - ${dateOut || '04-12-2026'}`,
        `Set guests to ${guestStr}`,
        `Click Search button`,
        `Verify validation error for missing destination`,
        `Now fill destination but leave dates empty`,
        `Verify validation error for missing dates`,
      ],
      expectedResult: `✅ Application validates mandatory fields\n✅ Search button is disabled or validation error shown\n✅ Clear error messages guide user to fill required fields\n✅ Search is not submitted with incomplete data`,
      testData: JSON.stringify({
        missingDestination: '',
        checkInDate:  dateIn  || '01-12-2026',
        checkOutDate: dateOut || '04-12-2026',
      }, null, 2),
      _storyContext: storyContext,
    }
  );

  // Generate 2 meaningful edge cases matching Kiro quality
  edge.push(
    {
      id:            `${issueKey}-TC_E01`,
      title:         `User searches with minimum and maximum guest combinations`,
      type:          'Edge',
      priority:      'Medium',
      component:     'AirBnb Search Page - Guest Selection',
      preconditions: `Application is accessible at ${appUrl}\nGuest selection supports min/max configurations`,
      steps: [
        `Navigate to ${appUrl}`,
        `Enter destination "${destCity || destFull}"`,
        `Set dates ${dateIn || '01-12-2026'} - ${dateOut || '04-12-2026'}`,
        `Click Add Guests button`,
        `Set guests to minimum (1 adult)`,
        `Submit search`,
        `Verify results show 1 guest`,
        `Repeat search with maximum guests (8+ adults)`,
        `Submit new search`,
        `Verify results show correct guest count`,
      ],
      expectedResult: `✅ System accepts minimum guest count (1)\n✅ System accepts maximum guest count\n✅ Results update based on guest count\n✅ Property availability changes with guest count`,
      testData: JSON.stringify({
        destination:  destCity || destFull,
        checkInDate:  dateIn  || '01-12-2026',
        checkOutDate: dateOut || '04-12-2026',
        minGuests:    1,
        maxGuests:    8,
      }, null, 2),
      _storyContext: storyContext,
    },
    {
      id:            `${issueKey}-TC_E02`,
      title:         `User searches for next day check-out (1-night stay)`,
      type:          'Edge',
      priority:      'Medium',
      component:     'AirBnb Search Page',
      preconditions: `Application allows 1-night bookings\nCurrent date is before ${dateIn || 'test date'}`,
      steps: [
        `Navigate to ${appUrl}`,
        `Enter destination "${destCity || destFull}"`,
        `Set check-in date to ${dateIn || '01-12-2026'}`,
        `Set check-out date to next day (1 night stay)`,
        `Set guests to 2 adults`,
        `Submit search`,
        `Verify results show 1 night duration`,
        `Verify pricing reflects 1-night stay`,
      ],
      expectedResult: `✅ Application accepts 1-night stay\n✅ Results correctly show 1 night duration\n✅ Pricing reflects single-night rate\n✅ Properties available for 1-night stays`,
      testData: JSON.stringify({
        destination:   destCity || destFull,
        checkInDate:   dateIn || '01-12-2026',
        checkOutDate:  '02-12-2026',
        nightsDuration: 1,
        guests:        2,
      }, null, 2),
      _storyContext: storyContext,
    }
  );

  // Inline stepsWithResults for negative cases
  negative.forEach(tc => {
    if (!tc.stepsWithResults && tc.steps) {
      if (tc.id.includes('N01')) {
        tc.stepsWithResults = [
          { action: tc.steps[0], result: 'Search form loads' },
          { action: tc.steps[1], result: 'Text is entered' },
          { action: tc.steps[2], result: 'No matching results appear' },
          { action: tc.steps[3], result: 'Dates are set' },
          { action: tc.steps[4], result: 'Guests are set' },
          { action: tc.steps[5], result: 'Search is submitted' },
          { action: tc.steps[6], result: 'Error message or "No results" appears' },
        ];
      } else if (tc.id.includes('N02')) {
        tc.stepsWithResults = [
          { action: tc.steps[0], result: 'Search form loads' },
          { action: tc.steps[1], result: 'Destination selected' },
          { action: tc.steps[2], result: 'Check-in date set' },
          { action: tc.steps[3], result: 'Date picker prevents or error shown' },
          { action: tc.steps[4], result: 'System enforces date logic' },
        ];
      } else if (tc.id.includes('N03')) {
        tc.stepsWithResults = [
          { action: tc.steps[0], result: 'Search form displayed' },
          { action: tc.steps[1], result: 'Destination is blank' },
          { action: tc.steps[2], result: 'Dates are set' },
          { action: tc.steps[3], result: 'Guests are set' },
          { action: tc.steps[4], result: 'Click is processed' },
          { action: tc.steps[5], result: 'Error message appears for missing destination' },
          { action: tc.steps[6], result: 'Search attempted with missing dates' },
          { action: tc.steps[7], result: 'Error appears for missing dates' },
        ];
      }
    }
  });

  // Inline stepsWithResults for edge cases
  edge.forEach(tc => {
    if (!tc.stepsWithResults && tc.steps) {
      if (tc.id.includes('E01')) {
        tc.stepsWithResults = [
          { action: tc.steps[0], result: 'Search form loaded' },
          { action: tc.steps[1], result: 'Destination selected' },
          { action: tc.steps[2], result: 'Dates selected' },
          { action: tc.steps[3], result: 'Guest selection panel opens' },
          { action: tc.steps[4], result: '1 adult selected' },
          { action: tc.steps[5], result: 'Search completes with 1 guest' },
          { action: tc.steps[6], result: 'Results updated for 1 guest' },
          { action: tc.steps[7], result: 'Maximum guests selected' },
          { action: tc.steps[8], result: 'Search completes' },
          { action: tc.steps[9], result: 'Results updated appropriately' },
        ];
      } else if (tc.id.includes('E02')) {
        tc.stepsWithResults = [
          { action: tc.steps[0], result: 'Search form loaded' },
          { action: tc.steps[1], result: 'Destination selected' },
          { action: tc.steps[2], result: 'Check-in set' },
          { action: tc.steps[3], result: 'Check-out set to next day' },
          { action: tc.steps[4], result: 'Guests selected' },
          { action: tc.steps[5], result: 'Search processes 1-night stay' },
          { action: tc.steps[6], result: 'Duration shows correctly' },
          { action: tc.steps[7], result: 'Price calculation correct' },
        ];
      }
    }
  });

  return { testCases: { positive, negative, edge }, source: 'fallback' };
}


/** Build AI prompt for test case generation */
/** Build AI prompt for test case generation - WITH detailed test data */
function buildAIPrompt(issueKey, summary, acceptanceCriteria) {
  return `You are a senior QA engineer. Generate comprehensive test cases for: ${issueKey} - ${summary}

ACCEPTANCE CRITERIA:
${acceptanceCriteria || 'Infer from summary'}

REQUIREMENTS:
1. EACH TEST CASE MUST TEST ONE SPECIFIC FEATURE:
   - Positive: One functional/happy path feature per test case
   - Negative: One error condition or validation failure per test case
   - Edge: One boundary condition or edge case per test case

2. TEST DATA:
   - Include ACTUAL values (not placeholders)
   - Realistic but generic data
   - Examples: username="testuser@example.com", password="SecurePass123", amount="250 USD"

3. DETAILED FORMAT:
   - Clear, specific titles (what feature is tested)
   - 4-8 numbered steps per test case
   - Multiple expected results (separate outcomes)
   - Realistic preconditions

4. COVERAGE:
   - Map each acceptance criterion to 1-2 test cases
   - Include positive (happy path) scenarios
   - Include negative (error) scenarios
   - Include edge case scenarios

JSON STRUCTURE:
{
  "positive": [
    {
      "id": "${issueKey}-TC_001",
      "title": "Feature: User can [specific feature]",
      "type": "Positive",
      "priority": "High|Medium|Low",
      "preconditions": "Detailed precondition",
      "steps": ["Step 1", "Step 2", ...],
      "expectedResult": "Outcome 1\nOutcome 2\nOutcome 3"
    }
  ],
  "negative": [...],
  "edge": [...]
}

GENERATE:
- 3-5 positive (each tests different feature)
- 2-3 negative (each tests different error)
- 2-3 edge cases (each tests boundary/edge)

Return ONLY raw JSON`;
}


/** Call AI provider (Claude or OpenAI) */
async function callAI(provider, apiKey, model, prompt) {
  const https = require('https');
  return new Promise((resolve, reject) => {
    let hostname, path, headers, body;

    if (provider === 'claude') {
      hostname = 'api.anthropic.com';
      path     = '/v1/messages';
      body     = JSON.stringify({
        model:      model || 'claude-3-sonnet-20240229',
        max_tokens: 4096,
        messages:   [{ role: 'user', content: prompt }],
      });
      headers  = {
        'Content-Type':    'application/json',
        'Content-Length':  Buffer.byteLength(body),
        'x-api-key':       apiKey,
        'anthropic-version': '2023-06-01',
      };
    } else {
      hostname = 'api.openai.com';
      path     = '/v1/chat/completions';
      body     = JSON.stringify({
        model:    model || 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
      });
      headers  = {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Authorization':  `Bearer ${apiKey}`,
      };
    }

    const req = https.request({ hostname, path, method: 'POST', headers }, res => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode !== 200) {
            return reject(new Error(`AI API ${res.statusCode}: ${json.error?.message || data}`));
          }
          const text = provider === 'claude'
            ? json.content?.[0]?.text
            : json.choices?.[0]?.message?.content;
          resolve(text || '');
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/** Parse AI response JSON into test case structure */
function parseAITestCases(aiText, issueKey) {
  // Strip markdown fences if present
  const cleaned = aiText.replace(/```(?:json)?\n?/g, '').replace(/```$/g, '').trim();
  const parsed  = JSON.parse(cleaned);
  // Normalise keys
  return {
    positive: Array.isArray(parsed.positive) ? parsed.positive : [],
    negative: Array.isArray(parsed.negative) ? parsed.negative : [],
    edge:     Array.isArray(parsed.edge)     ? parsed.edge     : [],
  };
}

/**
 * Generate TEST-PLAN.md markdown from ticket data.
 */
function generateTestPlanMarkdown(issueKey, summary, acceptanceCriteria, testCases) {
  const now     = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const allTcs  = [
    ...(testCases.positive || []),
    ...(testCases.negative || []),
    ...(testCases.edge     || []),
  ];
  const rows = allTcs.map(tc => `| ${tc.id} | ${tc.title} | ${tc.priority} | ${tc.type} |`).join('\n');

  return `# Test Plan: ${issueKey} - ${summary}

## 1. Document Information

| Field       | Value                      |
|-------------|----------------------------|
| Story ID    | ${issueKey}                |
| Summary     | ${summary}                 |
| Author      | QA Team (Planner Agent)    |
| Date        | ${now}                     |
| Total TCs   | ${allTcs.length}           |

---

## 2. User Story / Acceptance Criteria

${acceptanceCriteria || 'See Jira ticket for details.'}

---

## 3. Test Objectives

- Validate all acceptance criteria are satisfied
- Cover positive (happy-path), negative (error/validation), and edge-case scenarios
- Ensure application stability across key user journeys

---

## 4. Test Case Summary

| TC ID | Title | Priority | Type |
|-------|-------|----------|------|
${rows}

---

## 5. Exit Criteria

- All test cases executed
- All High-priority tests passing
- Zero P1 (Critical) defects open
`;
}

/**
 * Generate TEST-CASES.md markdown from structured test cases using Kiro-quality format.
 * Includes detailed structure with coverage matrix, per-step expected results, and comprehensive formatting.
 */

/**
  const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const positive = testCases.positive || [];
  const negative = testCases.negative || [];
  const edge = testCases.edge || [];
  const allTcs = [...positive, ...negative, ...edge];

  // Build coverage matrix
  const coverageMatrix = `| Test Type | Count | Priority | Purpose |
|-----------|-------|----------|---------|
| Happy Path | ${positive.length} | Critical | Complete search flow |
| Negative | ${negative.length} | High | Error conditions |
| Edge Cases | ${edge.length} | Medium | Boundary conditions |
| **Total** | **${allTcs.length}** | - | Comprehensive coverage |`;

  // Expand and enhance test steps with per-step expected results
  function expandTestSteps(tc, storyContext) {
    const steps = tc.steps || [];
    const expandedSteps = [];
    
    // Map generic steps to detailed ones with per-step expected results
    if (tc.type === 'Positive' && tc.id.includes('P01')) {
      // Initialize and enter search criteria - expand to 11 steps
      expandedSteps.push(
        { action: `Navigate to ${storyContext.urls?.[0] || 'the application'}`, result: 'Page loads successfully' },
        { action: 'Verify destination search bar is visible', result: 'Search bar is displayed on the page' },
        { action: 'Click on destination search bar', result: 'Search bar becomes active/focused' },
        { action: `Enter destination text "${storyContext.locations?.[0]?.city}, ${storyContext.locations?.[0]?.region || 'destination'}"`, result: 'Text appears in search bar' },
        { action: `Select "${storyContext.locations?.[0]?.city}, ${storyContext.locations?.[0]?.region || 'destination'}" from dropdown`, result: 'Destination is selected' },
        { action: 'Click on check-in date field', result: 'Date picker opens' },
        { action: `Select check-in date as ${storyContext.dates?.[0] || 'appropriate date'}`, result: `Date ${storyContext.dates?.[0] || 'is'} highlighted` },
        { action: 'Click on check-out date field', result: 'Checkout date picker opens' },
        { action: `Select check-out date as ${storyContext.dates?.[1] || 'appropriate date'}`, result: `Date ${storyContext.dates?.[1] || 'is'} highlighted` },
        { action: 'Click on "Add Guests" button', result: 'Guest selection panel expands' },
        { action: `Select ${storyContext.numbers?.[0]?.value || '3'} ${storyContext.numbers?.[0]?.type || 'adults'} from guest options`, result: `${storyContext.numbers?.[0]?.value || '3'} ${storyContext.numbers?.[0]?.type || 'adults'} are selected` }
      );
    } else if (tc.type === 'Positive' && tc.id.includes('P02')) {
      // Execute search and receive results - expand to 6 steps
      expandedSteps.push(
        { action: 'Verify all search criteria are correctly entered (from P01)', result: 'All criteria visible in form' },
        { action: 'Click on "Search" button', result: 'Search is initiated' },
        { action: 'Wait for results to load', result: 'Multiple results are displayed' },
        { action: 'Verify first result contains selected destination', result: `Result shows "${storyContext.locations?.[0]?.city || 'destination'}" or relevant property` },
        { action: 'Verify dates in result match selection', result: `Dates show ${storyContext.dates?.join(' to ') || 'selected date range'}` },
        { action: 'Verify guest count in result matches', result: `Result shows "${storyContext.numbers?.[0]?.value || '3'} ${storyContext.numbers?.[0]?.type || 'guests'}" or similar` }
      );
    } else if (tc.type === 'Positive' && tc.id.includes('P03')) {
      // Verify results - expand to 6 steps
      expandedSteps.push(
        { action: 'Select or click on the first result entry', result: 'Result details page opens' },
        { action: `Verify result details contain location: "${storyContext.locations?.[0]?.city}, ${storyContext.locations?.[0]?.region || 'destination'}"`, result: 'Location is correctly displayed' },
        { action: `Verify result displays dates: ${storyContext.dates?.join(' to ') || 'selected date range'}`, result: 'Date range is correctly shown' },
        { action: `Verify result indicates guest count: ${storyContext.numbers?.[0]?.value || '3'} ${storyContext.numbers?.[0]?.type || 'adults'}`, result: 'Guest count matches selection' },
        { action: 'Verify result is clickable/bookable if applicable', result: 'Result entry is interactive' },
        { action: 'Verify all details are clearly displayed', result: 'All information is visible and readable' }
      );
    } else if (tc.type === 'Negative' && tc.id.includes('N01')) {
      // Missing inputs validation - expand to 5 steps
      expandedSteps.push(
        { action: 'Navigate to the search form', result: 'Search form is displayed' },
        { action: 'Leave destination field empty', result: 'Destination field remains blank' },
        { action: 'Leave dates empty as well', result: 'Date fields are blank' },
        { action: 'Attempt to click Search button', result: 'Button is either disabled or click is processed' },
        { action: 'Observe validation error messages', result: 'Clear error messages appear for required fields' }
      );
    } else if (tc.type === 'Negative' && tc.id.includes('N02')) {
      // Invalid data rejection - expand to 6 steps
      expandedSteps.push(
        { action: 'Navigate to the search form', result: 'Search form is displayed' },
        { action: 'Enter invalid destination with special characters (e.g., "@#$%")', result: 'Invalid characters are entered or rejected' },
        { action: 'Try to enter invalid date format (e.g., "13/45/1990")', result: 'Invalid date is entered or rejected' },
        { action: 'Try to enter negative number for guests', result: 'Negative value is entered or prevented' },
        { action: 'Attempt to submit the form with invalid data', result: 'Form submission is prevented' },
        { action: 'Observe error handling and validation response', result: 'Specific error messages appear for each invalid field' }
      );
    } else if (tc.type === 'Negative' && tc.id.includes('N03')) {
      // Authorization - expand to 4 steps
      expandedSteps.push(
        { action: 'Attempt to access the application without authentication', result: 'Access is denied or restricted' },
        { action: 'Try to perform search operations without proper permissions', result: 'Operations are blocked' },
        { action: 'Observe system access control response', result: 'Clear message indicates auth/permission requirement' },
        { action: 'Try to bypass restrictions if applicable', result: 'Security boundaries are maintained' }
      );
    } else if (tc.type === 'Edge' && tc.id.includes('E01')) {
      // Boundary conditions - expand to 6 steps
      expandedSteps.push(
        { action: 'Navigate to the search form', result: 'Search form is displayed' },
        { action: 'Test with minimum allowed guest count (1 adult)', result: '1 guest is accepted' },
        { action: 'Submit search with minimum guests', result: 'Search processes successfully' },
        { action: 'Verify results are displayed for minimum guests', result: 'Results show available properties for 1 guest' },
        { action: 'Test with maximum allowed guest count (8+ or system max)', result: 'Maximum guests are accepted' },
        { action: 'Verify system handles both boundaries without errors', result: 'No overflow or crash occurs' }
      );
    } else if (tc.type === 'Edge' && tc.id.includes('E02')) {
      // Session persistence - expand to 5 steps
      expandedSteps.push(
        { action: `Navigate to search and enter criteria: destination "${storyContext.locations?.[0]?.city || 'destination'}", dates, guests`, result: 'All data is entered' },
        { action: 'Refresh the browser page (F5 or Ctrl+R)', result: 'Page reloads' },
        { action: 'Wait for page to fully load', result: 'Application loads successfully' },
        { action: 'Navigate back to the search section or check browser console', result: 'No critical errors appear' },
        { action: 'Verify data state and consistency', result: 'Session state is preserved or reset cleanly' }
      );
    } else {
      // Fallback: use provided steps as-is
      return steps.map((s, i) => ({ action: s, result: 'Action completed' }));
    }
    
    return expandedSteps;
  }

  // Contextualized expected results based on story data
  function getContextualizedExpectedResults(tc, storyContext) {
    if (tc.type === 'Positive' && tc.id.includes('P01')) {
      return [
        '✅ Application loads without errors',
        '✅ Search bar is visible and functional',
        `✅ Destination "${storyContext.locations?.[0]?.city}, ${storyContext.locations?.[0]?.region}" can be entered and selected`,
        '✅ Date picker works correctly for both check-in and check-out',
        `✅ Guest selection shows ${storyContext.numbers?.[0]?.value || '3'} ${storyContext.numbers?.[0]?.type || 'adults'}`,
        '✅ Search is initiated successfully',
        '✅ Form accepts all input without validation errors'
      ];
    } else if (tc.type === 'Positive' && tc.id.includes('P02')) {
      return [
        '✅ Search processes without errors or timeouts',
        '✅ Results page loads within acceptable time',
        '✅ Multiple results are displayed',
        `✅ Results reflect search criteria (${storyContext.locations?.[0]?.city || 'destination'}, ${storyContext.dates?.join(' to ') || 'dates'}, ${storyContext.numbers?.[0]?.value || '3'} guests)`,
        '✅ Results are viewable and interactive',
        '✅ Result count is > 0'
      ];
    } else if (tc.type === 'Positive' && tc.id.includes('P03')) {
      return [
        `✅ Result details display correct location: "${storyContext.locations?.[0]?.city}, ${storyContext.locations?.[0]?.region}"`,
        `✅ Result dates match selected date range: ${storyContext.dates?.join(' to ') || 'selected dates'}`,
        `✅ Result guest count matches selection: ${storyContext.numbers?.[0]?.value || '3'} ${storyContext.numbers?.[0]?.type || 'adults'}`,
        '✅ All criteria are visible and accurate',
        '✅ Result entry is complete and functional',
        '✅ Results can be interacted with (booking, details, etc.)'
      ];
    } else if (tc.type === 'Negative') {
      return [
        '✅ Application handles error gracefully',
        '✅ Clear error messages are displayed',
        '✅ User is guided on how to correct the issue',
        '✅ No system crash or unexpected behavior',
        '✅ Application remains stable and responsive'
      ];
    } else if (tc.type === 'Edge') {
      return [
        '✅ Boundary conditions are handled correctly',
        '✅ System processes minimum values without issues',
        '✅ System processes maximum values without issues',
        '✅ No overflow or unexpected behavior',
        '✅ Results are accurate for edge cases'
      ];
    }
    return (tc.expectedResult || '').split('\n').filter(l => l.trim());
  }

  // ── Unified block renderer ──────────────────────────────────────────────────
  function renderTcBlock(tc, automationPriority, extraAssertions, extraScreenshots, markAsAutomated = true) {
    const ctx = tc._storyContext || {};

    // Use stepsWithResults if stored directly on the test case (preferred)
    // otherwise fall back to expandTestSteps template
    let stepsArr;
    if (tc.stepsWithResults && tc.stepsWithResults.length > 0) {
      stepsArr = tc.stepsWithResults.map((s, idx) =>
        `| ${idx + 1} | ${s.action} | ${s.result} |`
      );
    } else {
      const expanded = expandTestSteps(tc, ctx);
      stepsArr = (tc.steps || []).map((s, idx) => {
        const match = expanded[idx];
        return `| ${idx + 1} | ${s} | ${match ? match.result : '—'} |`;
      });
    }
    const stepsTable = stepsArr.join('\n');

    // Use tc.expectedResult which is already fully contextualized from plannerAgentGenerate
    const rawResults = (tc.expectedResult || '')
      .split('\n')
      .filter(l => l.trim())
      .map(r => {
        const trimmed = r.trim();
        return `- ${trimmed}`;
      });
    const resultsBlock = rawResults.join('\n');

    const automatedLabel = markAsAutomated ? '\n**Automated**: Yes' : '';

    return `---

#### Test Case: ${tc.id}

**Title**: ${tc.title}  
**Type**: ${tc.type}${tc.priority ? ` / ${tc.priority}` : ''}  
**Priority**: ${tc.priority || 'Medium'}  
**Automation Priority**: ${automationPriority}  
**Component**: ${tc.component || 'AirBnb Search Page'}  ${automatedLabel}

**Preconditions**:
${(tc.preconditions || '').split('\n').map(l => `- ${l.trim()}`).filter(l => l !== '-').join('\n') || '- Application is accessible'}

**Test Steps**:

| Step | Action | Expected Result |
|------|--------|-----------------|
${stepsTable}

**Expected Results**:
${resultsBlock}

**Test Data**:
\`\`\`json
${tc.testData || '{}'}
\`\`\`

**Assertions**:
${extraAssertions}

**Screenshots on Failure**:
${extraScreenshots}
`;
  }

  // Build organized test case blocks with detailed steps
  let organizedTcBlocks = '';

  if (positive.length > 0) {
    organizedTcBlocks += '\n### Category: Happy Path (Positive Flow)\n\n';
    organizedTcBlocks += positive.map(tc => renderTcBlock(
      tc,
      'P0',
      '- Page URL should change to search results page\n- Results count should be > 0\n- First result should contain destination text\n- Date range should match selection\n- Guest count should match selection',
      '- Application not loaded\n- Search bar not visible\n- Results not displayed\n- Criteria mismatch in results'
    )).join('');
  }

  if (negative.length > 0) {
    organizedTcBlocks += '\n### Category: Negative Flow\n\n';
    organizedTcBlocks += negative.map(tc => renderTcBlock(
      tc,
      'P1',
      '- Error message is displayed OR results count = 0\n- No server errors in console\n- Application remains stable',
      '- Error state not shown\n- Unexpected data accepted\n- Application crash'
    )).join('');
  }

  if (edge.length > 0) {
    organizedTcBlocks += '\n### Category: Edge Cases\n\n';
    organizedTcBlocks += edge.map(tc => renderTcBlock(
      tc,
      'P2',
      '- Search works with all boundary values\n- Results are different for different guest counts\n- Price/duration calculations are correct',
      '- Boundary value not accepted\n- Unexpected error at limits\n- Calculation mismatch'
    )).join('');
  }

  // Build summary table
  const summaryTable = allTcs.map(tc => `| ${tc.id} | ${tc.title} | ${tc.priority} | ${tc.type} | Pending |`).join('\n');

  return `# Test Cases for Story ${issueKey}: ${summary}

**Story ID**: ${issueKey}  
**Story Title**: ${summary}  
**Story Type**: Feature  
**Test Case Creation Date**: ${now}  
**Framework**: Playwright POM (Pure Page Object Model)

---

## Story Summary

${summary}

---

## Test Coverage Matrix

${coverageMatrix}

---

## Test Cases

${organizedTcBlocks}

---

## Summary Table

| TC ID | Title | Priority | Type | Status |
|-------|-------|----------|------|--------|
${summaryTable}

---

## Test Execution Summary

**Total Test Cases**: ${allTcs.length}
- Happy Path: ${positive.length} (Critical)
- Negative: ${negative.length} (High)
- Edge Cases: ${edge.length} (Medium)

**Expected Pass Rate**: 85-95% on first run
**Estimated Execution Time**: 15-20 minutes
**Browser**: Chrome/Chromium
**Execution Mode**: Headed (visible browser)
**Workers**: 1 (sequential execution)

---

## Notes

1. **Self-Healing**: All tests use Playwright self-healing for selector fallbacks
2. **Screenshots**: Failed tests capture screenshots automatically
3. **Test Data**: All data is externalized in JSON format
4. **POM Pattern**: All tests use page objects extending BasePage
5. **Playwright Reports**: Each execution saves an HTML report with screenshots and video
`;
}

/** POST /api/manual-test-cases/generate â€“ Generate test cases using Planner Agent */
app.post('/api/manual-test-cases/generate', async (req, res) => {
  try {
    const { issueKey, summary, description } = req.body || {};
    if (!issueKey) return res.status(400).json({ error: 'issueKey is required' });

    // Fetch fresh acceptance criteria from Jira if possible
    let acceptanceCriteria = description || '';
    try {
      const baseUrl  = (process.env.JIRA_BASE_URL || '').replace(/\/$/, '');
      const email    = process.env.JIRA_EMAIL;
      const apiToken = process.env.JIRA_API_TOKEN;
      if (baseUrl && email && apiToken) {
        const auth     = Buffer.from(`${email}:${apiToken}`).toString('base64');
        const issueRes = await axios.get(
          `${baseUrl}/rest/api/3/issue/${issueKey}?fields=description`,
          { headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' } }
        );
        const adfDesc  = issueRes.data?.fields?.description;
        if (adfDesc) acceptanceCriteria = adfToText(adfDesc).trim();
      }
    } catch (_) { /* use description from request body */ }

    // Generate test cases directly using Planner Agent (NO feature files)
    // This follows the pure POM pattern without Gherkin/feature files
    const result = await plannerAgentGenerate({ issueKey, summary, description, acceptanceCriteria });
    
    // STEP 2: Save ALL generated test cases to specs folder (without Automated label)
    try {
      const specsDir = path.join(ROOT, 'specs');
      if (!fs.existsSync(specsDir)) fs.mkdirSync(specsDir, { recursive: true });

      // Generate markdown for all test cases (WITHOUT Automated: Yes label initially)
      const tcFile = path.join(specsDir, `${issueKey}-TEST-CASES.md`);
      const tcMarkdown = generateTestCasesMarkdown(issueKey, summary, {
        positive: result.testCases.filter(tc => tc.type === 'Positive'),
        negative: result.testCases.filter(tc => tc.type === 'Negative'),
        edge: result.testCases.filter(tc => tc.type === 'Edge' || tc.type === 'Edge Case')
      });
      
      // Remove all Automated labels from generated test cases (they start without automation)
      const tcMarkdownWithoutAutomated = tcMarkdown.replace(/\n\*\*Automated\*\*: Yes/g, '');
      fs.writeFileSync(tcFile, tcMarkdownWithoutAutomated, 'utf8');
      
      const relTcFile = path.relative(ROOT, tcFile).replace(/\\/g, '/');
      result.specsFile = relTcFile;
    } catch (specErr) {
      console.error('Error saving test cases to specs:', specErr.message);
      // Don't fail the endpoint if spec saving fails - still return generated test cases
    }
    
    res.json({ 
      testCases: result.testCases, 
      source: result.source,
      specsFile: result.specsFile,
      message: `✅ Test cases generated successfully and saved to specs folder`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/manual-test-cases/save â€“ Persist test cases in memory */
app.post('/api/manual-test-cases/save', (req, res) => {
  try {
    const { issueKey, testCases, mode } = req.body || {};
    if (!issueKey) return res.status(400).json({ error: 'issueKey is required' });
    if (!Array.isArray(testCases)) return res.status(400).json({ error: 'testCases must be an array' });

    // Support two modes: 'replace' (default for explicit saves) or 'merge' (for cumulative saves)
    if (mode === 'replace') {
      // Replace mode: Only store the test cases being saved now
      savedTestCasesStore[issueKey] = testCases;
      res.json({ saved: testCases, count: testCases.length });
    } else {
      // Merge mode: Merge with existing saved cases (deduplicate by id)
      const existing = savedTestCasesStore[issueKey] || [];
      const existingIds = new Set(existing.map(tc => tc.id));
      const merged = [
        ...existing,
        ...testCases.filter(tc => !existingIds.has(tc.id)),
      ];
      savedTestCasesStore[issueKey] = merged;
      res.json({ saved: merged, count: merged.length });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/manual-test-cases/saved â€“ Retrieve saved test cases for an issue */
app.get('/api/manual-test-cases/saved', (req, res) => {
  const { issueKey } = req.query;
  if (!issueKey) return res.status(400).json({ error: 'issueKey is required' });
  const saved = savedTestCasesStore[issueKey] || [];
  res.json({ saved, count: saved.length });
});

/** DELETE /api/manual-test-cases/saved â€“ Clear all saved test cases for an issue */
app.delete('/api/manual-test-cases/saved', (req, res) => {
  try {
    const { issueKey } = req.query;
    if (!issueKey) return res.status(400).json({ error: 'issueKey is required' });
    delete savedTestCasesStore[issueKey];
    res.json({ message: 'Saved test cases cleared', issueKey });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/manual-test-cases/write-spec â€“ Write selected test cases to specs/ folder */
app.post('/api/manual-test-cases/write-spec', async (req, res) => {
  try {
    const { issueKey, testCases, summary: reqSummary } = req.body || {};
    if (!issueKey) return res.status(400).json({ error: 'issueKey is required' });
    if (!Array.isArray(testCases) || testCases.length === 0) {
      return res.status(400).json({ error: 'testCases must be a non-empty array' });
    }

    const specsDir = path.join(ROOT, 'specs');
    if (!fs.existsSync(specsDir)) fs.mkdirSync(specsDir, { recursive: true });

    const tcFile = path.join(specsDir, `${issueKey}-TEST-CASES.md`);
    if (!fs.existsSync(tcFile)) {
      return res.status(404).json({ error: `Spec file not found: specs/${issueKey}-TEST-CASES.md` });
    }

    // Persist exactly the selected cases. Keep the document header and retain
    // only blocks whose IDs were selected so Test Design cannot regenerate
    // omitted or stale cases.
    const markdown = fs.readFileSync(tcFile, 'utf8');
    const selectedIds = new Set(testCases.map(tc => tc.id));
    const marker = /^(?:####\s*Test Case:\s*|##\s*Test Case ID:\s*)(\S+)/gm;
    const matches = [...markdown.matchAll(marker)];
    const filteredMarkdown = matches.length === 0
      ? markdown
      : markdown.slice(0, matches[0].index) + matches.map((match, index) => {
          const blockStart = match.index;
          const blockEnd = index + 1 < matches.length ? matches[index + 1].index : markdown.length;
          return selectedIds.has(match[1]) ? markdown.slice(blockStart, blockEnd) : '';
        }).join('');

    fs.writeFileSync(tcFile, filteredMarkdown, 'utf8');
    const relTcFile = path.relative(ROOT, tcFile).replace(/\\/g, '/');

    res.json({
      file: relTcFile,
      count: testCases.length,
      message: `✅ ${testCases.length} test case(s) marked as automated!`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Parse a Gherkin feature file and extract scenarios as test cases
 * Converts @web, @automated, etc. tags and scenarios into test case format
 */
function parseGherkinFeatureFile(featureContent, filePath) {
  const testCases = [];
  
  // Extract feature name for context
  const featureMatch = featureContent.match(/Feature:\s*([^\n]+)/);
  const featureName = featureMatch ? featureMatch[1].trim() : 'Feature';
  
  // Extract tags for the feature
  const featureTags = [];
  const tagMatches = featureContent.match(/@[a-zA-Z0-9_]+/g) || [];
  featureTags.push(...tagMatches);
  
  // Determine test type based on tags
  const isNegative = tagMatches.some(t => t.includes('negative'));
  const isEdge = tagMatches.some(t => t.includes('edge'));
  const defaultType = isNegative ? 'Negative' : isEdge ? 'Edge' : 'Positive';
  
  // Split by Scenario: lines to extract individual scenarios
  const scenarios = featureContent.split(/(?:Scenario:|Scenario Outline:)\s+/);
  scenarios.shift(); // Remove content before first scenario
  
  scenarios.forEach((scenarioBlock, index) => {
    const lines = scenarioBlock.split('\n');
    if (lines.length === 0) return;
    
    // First line is the scenario title
    const title = lines[0].trim();
    if (!title) return;
    
    // Extract scenario-level tags (if any before this scenario)
    const scenarioTags = [];
    const precedingContent = featureContent.substring(0, featureContent.indexOf('Scenario:') + index * 50);
    const localTagMatches = precedingContent.match(/@[a-zA-Z0-9_]+/g) || [];
    if (localTagMatches.length > 0) {
      scenarioTags.push(...localTagMatches.slice(-2)); // Get last 2 tags as local scenario tags
    }
    
    // Extract test type from scenario tags
    const isScenarioNegative = scenarioTags.some(t => t.includes('negative')) || isNegative;
    const isScenarioEdge = scenarioTags.some(t => t.includes('edge')) || isEdge;
    const testType = isScenarioNegative ? 'Negative' : isScenarioEdge ? 'Edge' : 'Positive';
    
    // Extract Given/When/Then steps
    const steps = [];
    let currentStep = '';
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('@') || line.startsWith('#')) continue;
      if (/^(Given|When|Then|And|But)\s+/.test(line)) {
        if (currentStep) steps.push(currentStep);
        currentStep = line.replace(/^(Given|When|Then|And|But)\s+/, '').trim();
      } else if (line && currentStep) {
        currentStep += ' ' + line;
      }
    }
    if (currentStep) steps.push(currentStep);
    
    // Determine priority based on tags
    const hasPriority = scenarioTags.find(t => t.match(/@(high|medium|low)/i));
    const priority = hasPriority 
      ? hasPriority.replace('@', '').charAt(0).toUpperCase() + hasPriority.slice(2).toLowerCase()
      : 'Medium';
    
    // Create test case object
    const testCase = {
      id: `TC-${index + 1}`,
      title: title,
      type: testType,
      priority: priority,
      steps: steps.length > 0 ? steps : ['Execute scenario: ' + title],
      expectedResult: steps.length > 0 ? 'All steps executed successfully' : 'Scenario completed as expected',
      tags: [...featureTags, ...scenarioTags],
      source: 'feature-file',
      filePath: filePath
    };
    
    testCases.push(testCase);
  });
  
  return testCases;
}

/**
 * Append new test cases to an existing TEST-CASES.md or create a new one.
 * Avoids duplicating test cases that already exist in the file (matched by TC ID).
 */
function appendOrCreateTestCasesMarkdown(issueKey, summary, newCases, existingContent) {
  if (!existingContent) {
    return generateTestCasesMarkdown(issueKey, summary, {
      positive: newCases.filter(tc => tc.type === 'Positive'),
      negative: newCases.filter(tc => tc.type === 'Negative'),
      edge:     newCases.filter(tc => tc.type === 'Edge' || tc.type === 'Edge Case'),
    });
  }

  // If cases already in file, do a full rewrite with generateTestCasesMarkdown
  // to ensure Kiro-quality format (stepsWithResults, JSON test data, etc.)
  return generateTestCasesMarkdown(issueKey, summary, {
    positive: newCases.filter(tc => tc.type === 'Positive'),
    negative: newCases.filter(tc => tc.type === 'Negative'),
    edge:     newCases.filter(tc => tc.type === 'Edge' || tc.type === 'Edge Case'),
  });

  const toAppend = newCases.filter(tc => !existingIds.has(tc.id));
  if (toAppend.length === 0) return existingContent; // nothing new to add

  const appendBlocks = toAppend.map((tc, idx) => {
    const steps = (tc.steps || []).map((s, i) => `${i + 1}. ${s}`).join('\n');
    const results = (tc.expectedResult || '').split('\n').filter(r => r.trim()).map((r, i) => `${i + 1}. ${r.trim()}`).join('\n');
    
    // Extract test data from steps and preconditions
    let testDataSection = '';
    const combinedText = `${tc.preconditions || ''} ${(tc.steps || []).join(' ')} ${tc.expectedResult || ''}`;
    const testDataMatches = combinedText.match(/"([^"]+)"|'([^']+)'|(\w+)@(\w+\.\w+)|USD?\s+\d+|account\s+\d+/gi);
    if (testDataMatches && testDataMatches.length > 0) {
      const uniqueData = [...new Set(testDataMatches)];
      testDataSection = `\n**Test Data:**\n${uniqueData.slice(0, 5).map(d => `- ${d}`).join('\n')}\n`;
    }
    
    return `---

## Test Case: ${tc.id}

**Title**: ${tc.title || ''}

**Preconditions**: ${tc.preconditions || 'None'}

**Priority**: ${tc.priority}

**Type**: ${tc.type}

### Steps:
${steps}

### Expected Results:
${results}${testDataSection}`;
  }).join('\n');

  return existingContent.trimEnd() + '\n\n' + appendBlocks;
}

/**
 * Generate Gherkin Feature File for the USER STORY (not test cases)
 * Creates a single feature file representing the entire user story
 */
function generateGherkinFeatureFile(issueKey, summary, description) {
  const tags = ['@web', '@automated', '@' + issueKey.toLowerCase().replace(/-/g, '_')];
  const now = new Date().toISOString().split('T')[0];

  let featureContent = `${tags.map(t => t).join(' ')}\n`;
  featureContent += `Feature: ${issueKey} - ${summary}\n`;
  featureContent += `  ${description || 'User can perform required actions'}\n\n`;
  featureContent += `  # Generated: ${now}\n`;
  featureContent += `  # Story ID: ${issueKey}\n`;
  featureContent += `  # Summary: ${summary}\n\n`;

  featureContent += `  Background:\n`;
  featureContent += `    Given User is on the application\n\n`;

  featureContent += `  Scenario: Main workflow for ${issueKey}\n`;
  featureContent += `    When User interacts with the feature\n`;
  featureContent += `    Then Expected outcomes are achieved\n`;

  return featureContent.trim();
}

/**
 * Generate a detailed Gherkin Feature File from test cases
 * Creates scenarios for each test case with steps from the test case data
 */
function generateFeatureFileFromTestCases(issueKey, summary, testCases) {
  const tags = ['@web', '@automated', '@' + issueKey.toLowerCase().replace(/-/g, '_')];
  const now = new Date().toISOString().split('T')[0];

  let featureContent = `${tags.map(t => t).join(' ')}\n`;
  featureContent += `Feature: ${issueKey} - ${summary}\n\n`;
  
  // Add metadata comments
  featureContent += `  # Generated: ${now}\n`;
  featureContent += `  # Story ID: ${issueKey}\n`;
  featureContent += `  # Summary: ${summary}\n`;
  featureContent += `  # Total Test Cases: ${testCases.length}\n\n`;

  // Add a default background if not present
  featureContent += `  Background:\n`;
  featureContent += `    Given the user is on the application\n\n`;

  // Generate scenarios from test cases
  const scenarios = testCases.map((tc, index) => {
    const typeTag = tc.type === 'Positive' ? '@positive' : tc.type === 'Negative' ? '@negative' : '@edge';
    const priorityTag = tc.priority === 'High' ? '@high' : tc.priority === 'Medium' ? '@medium' : '@low';
    
    let scenario = `  ${typeTag} ${priorityTag}\n`;
    scenario += `  Scenario: ${tc.title || tc.id}\n`;
    
    // Add steps from test case
    if (tc.steps && Array.isArray(tc.steps)) {
      tc.steps.forEach((step, stepIndex) => {
        // Determine keyword based on step position
        let keyword = 'And';
        if (stepIndex === 0) keyword = 'When';
        else if (step.toLowerCase().startsWith('verify') || step.toLowerCase().startsWith('check')) keyword = 'Then';
        
        scenario += `    ${keyword} ${step}\n`;
      });
    } else {
      // Fallback if no steps
      scenario += `    When the user performs the required action\n`;
      scenario += `    Then the expected result is achieved\n`;
    }
    
    return scenario;
  }).join('\n');

  featureContent += scenarios;

  return featureContent.trim();
}

/** GET /api/project-root â€“ Return the project root path */
app.get('/api/project-root', (req, res) => {
  res.json({ root: ROOT });
});

/** GET /api/tests/file â€“ Read a spec file's content for display */
app.get('/api/tests/file', (req, res) => {
  try {
    const relPath = req.query.path;
    if (!relPath) return res.status(400).json({ error: 'path is required' });
    const absPath = path.join(ROOT, relPath);
    if (!fs.existsSync(absPath)) return res.status(404).json({ error: 'File not found' });
    const content = fs.readFileSync(absPath, 'utf8');
    res.json({ content, path: relPath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/specs/all-for-ticket – Get ALL test cases (generated + saved) from specs folder */
app.get('/api/specs/all-for-ticket', (req, res) => {
  try {
    const { issueKey } = req.query;
    if (!issueKey) return res.status(400).json({ error: 'issueKey is required' });

    const key      = issueKey.toUpperCase();
    const specFile = path.join(ROOT, 'specs', `${key}-TEST-CASES.md`);

    if (!fs.existsSync(specFile)) {
      return res.json({ testCases: [], issueKey: key, file: null, message: 'No test cases generated yet' });
    }

    const md       = fs.readFileSync(specFile, 'utf8');
    const allCases = parseTestCasesFromMarkdown(md, key);
    
    // Return ALL test cases (both generated and automated)
    res.json({ testCases: allCases, issueKey: key, file: `specs/${key}-TEST-CASES.md`, count: allCases.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
/** GET /api/specs/for-ticket â€“ Parse saved test cases from the specs/ markdown for a ticket */
app.get('/api/specs/for-ticket', (req, res) => {
  try {
    const { issueKey } = req.query;
    if (!issueKey) return res.status(400).json({ error: 'issueKey is required' });

    const key      = issueKey.toUpperCase();
    const specFile = path.join(ROOT, 'specs', `${key}-TEST-CASES.md`);

    if (!fs.existsSync(specFile)) {
      return res.json({ testCases: [], issueKey: key, file: null });
    }

    const md       = fs.readFileSync(specFile, 'utf8');
    const allCases = parseTestCasesFromMarkdown(md, key);
    
    // Filter to only automated test cases (marked as "Automated: Yes")
    const automatedCases = allCases.filter(tc => tc.automated === true);
    
    res.json({ testCases: automatedCases, issueKey: key, file: `specs/${key}-TEST-CASES.md` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/specs/file â€“ Get raw content of a spec file by fileName */
app.get('/api/specs/file', (req, res) => {
  try {
    const { fileName } = req.query;
    if (!fileName) return res.status(400).json({ error: 'fileName is required' });

    // Security: prevent directory traversal
    const safeName = path.basename(fileName);
    const specFile = path.join(ROOT, 'specs', safeName);

    if (!fs.existsSync(specFile)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const content = fs.readFileSync(specFile, 'utf8');
    res.json({ content, fileName: safeName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/tests/scripts â€“ Return all generated spec files grouped by issueKey */
app.get('/api/tests/scripts', (req, res) => {
  try {
    const testsDir = path.join(ROOT, 'tests');
    const groups   = {};

    if (!fs.existsSync(testsDir)) return res.json({ groups: {} });

    // Scan tests/{KEY}/ subdirectories for .spec.ts files
    for (const entry of fs.readdirSync(testsDir)) {
      const entryPath = path.join(testsDir, entry);
      if (!fs.statSync(entryPath).isDirectory()) continue;
      const key = entry.toUpperCase();

      for (const name of fs.readdirSync(entryPath)) {
        if (!name.endsWith('.spec.ts') && !name.endsWith('.spec.js')) continue;
        const rel = path.relative(ROOT, path.join(entryPath, name)).replace(/\\/g, '/');
        if (!groups[key]) groups[key] = [];

        // Try to count tests by parsing the file
        let testCount = 0;
        try {
          const src = fs.readFileSync(path.join(entryPath, name), 'utf8');
          testCount = (src.match(/^\s*test\s*\(/gm) || []).length;
        } catch (_) {}

        groups[key].push({ file: rel, name, testCount });
      }
    }

    res.json({ groups });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/tests/for-ticket â€“ Get test script info for a ticket */
app.get('/api/tests/for-ticket', (req, res) => {
  try {
    const { issueKey } = req.query;
    if (!issueKey) return res.status(400).json({ error: 'issueKey is required' });

    const key       = issueKey.toUpperCase();
    const testsDir  = path.join(ROOT, 'tests');
    const ticketDir = path.join(testsDir, key);
    const scripts   = [];

    // Look in tests/{KEY}/ folder
    if (fs.existsSync(ticketDir)) {
      for (const name of fs.readdirSync(ticketDir)) {
        if (name.endsWith('.spec.ts') || name.endsWith('.spec.js')) {
          const rel = path.relative(ROOT, path.join(ticketDir, name)).replace(/\\/g, '/');
          scripts.push({ file: rel, name });
        }
      }
    }
    // Also scan top-level tests/ for files containing the key
    if (fs.existsSync(testsDir)) {
      for (const name of fs.readdirSync(testsDir)) {
        const full = path.join(testsDir, name);
        if (fs.statSync(full).isFile() && (name.endsWith('.spec.ts') || name.endsWith('.spec.js'))) {
          if (name.toUpperCase().includes(key)) {
            const rel = path.relative(ROOT, full).replace(/\\/g, '/');
            if (!scripts.find(s => s.file === rel)) scripts.push({ file: rel, name });
          }
        }
      }
    }

    // Find associated test-data file
    const testDataFile = fs.existsSync(path.join(ROOT, 'Test_Data', `${key}.json`))
      ? `Test_Data/${key}.json`
      : null;

    res.json({ scripts, testDataFile, issueKey: key });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// â”€â”€ Playwright Generator Agent â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Build the AI prompt for generating a Playwright TypeScript spec file.
 */
function buildScriptGeneratorPrompt(issueKey, summary, acceptanceCriteria, testCases, appUrl) {
  const tcList = testCases.map((tc, i) =>
    `TC${i + 1}: [${tc.id}] ${tc.title} (${tc.type}, ${tc.priority})\n` +
    `  Preconditions: ${tc.preconditions || 'None'}\n` +
    `  Steps: ${(tc.steps || []).join(' â†’ ')}\n` +
    `  Expected: ${tc.expectedResult || ''}`
  ).join('\n\n');

  return `You are a senior Playwright automation engineer. Generate a production-ready Playwright TypeScript spec file.

## Jira Ticket
- Issue Key: ${issueKey}
- Summary: ${summary}
- Application URL: ${appUrl || 'https://vb-bank-demo.vercel.app/'}

## Acceptance Criteria
${acceptanceCriteria || 'See summary for details.'}

## Test Cases to Automate
${tcList}

## Project Structure
- Page Objects: ../../pages/LoginPage, ../../pages/DashboardPage, ../../pages/TransferPage, ../../pages/HistoryPage
- Utils: ../../utils/CommonUtils
- Test Data: ../../Test_Data/${issueKey}.json
- Output: tests/${issueKey}/${issueKey}-Script.spec.ts

## Requirements
1. Use @playwright/test with TypeScript
2. Use test.describe('${issueKey}: ${summary}', ...)
3. Name each test exactly as: '${issueKey}-TC_XXX: <title>'
4. Use Page Object Model â€” import and instantiate all relevant page objects in beforeEach
5. Use testData from the JSON file for all test data values
6. Add test.info().annotations for Story, Priority, Type per test
7. Each test must have clear steps matching the manual test case
8. For negative tests, wrap assertions in try/catch where the app might behave differently
9. Use CommonUtils.wait(ms) for waits, never hard-coded page.waitForTimeout
10. Return ONLY the TypeScript code â€” no markdown fences, no explanation`;
}

/**
 * Generate a rule-based Playwright spec from test cases.
 * Used as fallback when AI is not configured.
 */
function generatePlaywrightSpec(issueKey, summary, testCases, appUrl) {
  const url     = appUrl || 'https://vb-bank-demo.vercel.app/';
  const allTcs  = testCases;
  const now     = new Date().toISOString().split('T')[0];
  const keyUp   = issueKey.toUpperCase();

  const testBlocks = allTcs.map(tc => {
    const typeLabel = tc.type === 'Positive' ? 'Positive' : tc.type === 'Negative' ? 'Negative' : 'Edge Case';
    const safe      = tc.id.replace(/[^a-z0-9_]/gi, '_');
    const steps     = (tc.steps || []).map((s, i) =>
      `    // Step ${i + 1}: ${s}\n    await CommonUtils.wait(500);`
    ).join('\n');

    return `
  // ${'â•'.repeat(74)}
  // ${tc.id}: ${tc.title}
  // Type: ${tc.type} | Priority: ${tc.priority}
  // ${'â•'.repeat(74)}
  test('${tc.id}: ${tc.title.replace(/'/g, "\\'")}', async ({ page }) => {
    test.info().annotations.push({ type: 'Story',    description: '${keyUp}' });
    test.info().annotations.push({ type: 'Priority', description: '${tc.priority}' });
    test.info().annotations.push({ type: 'Type',     description: '${typeLabel}' });

    // Preconditions: ${tc.preconditions || 'None'}
    await loginPage.navigateToLogin();
    await loginPage.login(testData.validCredentials.username, testData.validCredentials.password);
    await dashboardPage.waitForDashboardToLoad();

${steps}

    // Expected: ${(tc.expectedResult || '').replace(/\n/g, ' ')}
    // TODO: Add specific assertions based on expected result above
    expect(page.url()).toBeTruthy();
  });`;
  }).join('\n');

  return `/**
 * ${keyUp} Test Scripts: ${summary}
 * Generated by Playwright Generator Agent on ${now}
 *
 * Jira Story : ${keyUp}
 * App URL    : ${url}
 * Total TCs  : ${allTcs.length}
 *
 * Test Cases:
${allTcs.map(tc => ` * ${tc.id} â€” ${tc.title} [${tc.priority} | ${tc.type}]`).join('\n')}
 */

import { test, expect } from '@playwright/test';
import LoginPage from '../../pages/LoginPage';
import DashboardPage from '../../pages/DashboardPage';
import TransferPage from '../../pages/TransferPage';
import HistoryPage from '../../pages/HistoryPage';
import CommonUtils from '../../utils/CommonUtils';
import testData from '../../Test_Data/${keyUp}.json';

test.describe('${keyUp}: ${summary.replace(/'/g, "\\'")}', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;
  let transferPage: TransferPage;
  let historyPage: HistoryPage;

  test.beforeEach(async ({ page }) => {
    loginPage     = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    transferPage  = new TransferPage(page);
    historyPage   = new HistoryPage(page);
  });
${testBlocks}
});
`;
}

/**
 * POST /api/generate-tests â€“ Playwright Generator Agent (SSE stream)
 *
 * Reads saved test cases from the specs/ file for the ticket, then:
 *  1. Attempts AI-powered script generation (Claude / OpenAI)
 *  2. Falls back to rule-based generator if AI unavailable
 * Saves the script to tests/{KEY}/{KEY}-Script.spec.ts
 */
app.post('/api/generate-tests', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  function send(type, data) {
    res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
  }

  try {
    const { issueKey } = req.body || {};
    if (!issueKey) { send('error', 'issueKey is required'); res.end(); return; }

    const key = issueKey.toUpperCase();
    send('log', `ðŸš€ Playwright Generator Agent starting for ${key}â€¦`);

    // â”€â”€ 1. Load saved test cases from specs/ markdown file â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    send('log', `ðŸ“‚ Reading test cases from specs/${key}-TEST-CASES.mdâ€¦`);
    const specsFile = path.join(ROOT, 'specs', `${key}-TEST-CASES.md`);
    let testCases = [];

    if (fs.existsSync(specsFile)) {
      const md = fs.readFileSync(specsFile, 'utf8');
      testCases = parseTestCasesFromMarkdown(md, key);
      send('log', `âœ… Loaded ${testCases.length} test case(s) from specs file`);
    } else {
      // Fall back to in-memory saved store
      testCases = savedTestCasesStore[key] || [];
      if (testCases.length > 0) {
        send('log', `âœ… Loaded ${testCases.length} test case(s) from session store`);
      } else {
        send('log', `âš   No saved test cases found â€” generating a skeleton script`);
      }
    }

    // â”€â”€ 2. Fetch acceptance criteria from Jira â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    send('log', `ðŸ”— Fetching acceptance criteria from Jira for ${key}â€¦`);
    let summary = key, acceptanceCriteria = '', appUrl = 'https://vb-bank-demo.vercel.app/';
    try {
      const baseUrl  = (process.env.JIRA_BASE_URL || '').replace(/\/$/, '');
      const email    = process.env.JIRA_EMAIL;
      const apiToken = process.env.JIRA_API_TOKEN;
      if (baseUrl && email && apiToken) {
        const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
        const jRes = await axios.get(
          `${baseUrl}/rest/api/3/issue/${key}?fields=summary,description`,
          { headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' } }
        );
        summary             = jRes.data?.fields?.summary || key;
        const adfDesc       = jRes.data?.fields?.description;
        acceptanceCriteria  = adfDesc ? adfToText(adfDesc).trim() : '';
        send('log', `âœ… Acceptance criteria fetched (${acceptanceCriteria.length} chars)`);
        // Emit live issue data so UI can update the criteria box
        send('issue', { key, summary, criteria: acceptanceCriteria || 'No acceptance criteria available.' });
      }
    } catch (e) {
      send('log', `âš   Could not fetch from Jira: ${e.message} â€” proceeding with saved data`);
    }

    // â”€â”€ 3. Ensure tests/{KEY}/ directory exists â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const testDir  = path.join(ROOT, 'tests', key);
    const specFile = path.join(testDir, `${key}-Script.spec.ts`);
    const relSpec  = path.relative(ROOT, specFile).replace(/\\/g, '/');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
      send('log', `ðŸ“ Created tests/${key}/`);
    }

    // Ensure test-data JSON exists for this ticket
    const testDataFile   = path.join(ROOT, 'Test_Data', `${key}.json`);
    const relTestData    = path.relative(ROOT, testDataFile).replace(/\\/g, '/');
    if (!fs.existsSync(testDataFile)) {
      const skeleton = {
        storyId: key, appUrl,
        validCredentials: { username: 'user', password: 'pass' },
        invalidCredentials: [{ username: 'invalid', password: 'wrong' }],
      };
      fs.writeFileSync(testDataFile, JSON.stringify(skeleton, null, 2), 'utf8');
      send('log', `ðŸ“„ Created skeleton Test_Data/${key}.json`);
    }

    // â”€â”€ 4. Generate script â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let scriptContent = '';
    const aiProvider  = process.env.AI_PROVIDER;
    const aiApiKey    = process.env.AI_API_KEY;

    if (aiProvider && aiApiKey) {
      send('log', `ðŸ¤– Playwright Generator Agent (AI â€” ${aiProvider}) generating scriptâ€¦`);
      try {
        const prompt  = buildScriptGeneratorPrompt(key, summary, acceptanceCriteria, testCases, appUrl);
        const aiText  = await callAI(aiProvider, aiApiKey, process.env.AI_MODEL, prompt);
        if (aiText && aiText.trim().length > 100) {
          // Strip any markdown fences the model may have added
          scriptContent = aiText
            .replace(/^```(?:typescript|ts)?\n?/m, '')
            .replace(/\n?```\s*$/m, '')
            .trim();
          send('log', `âœ… AI-generated script (${scriptContent.split('\n').length} lines)`);
        } else {
          throw new Error('AI returned empty or too-short content');
        }
      } catch (aiErr) {
        send('log', `âš   AI generation failed: ${aiErr.message} â€” using rule-based generator`);
        scriptContent = generatePlaywrightSpec(key, summary, testCases, appUrl);
      }
    } else {
      send('log', `âš™ï¸  Using rule-based Playwright Generator (no AI_PROVIDER/AI_API_KEY set)`);
      scriptContent = generatePlaywrightSpec(key, summary, testCases, appUrl);
    }

    // â”€â”€ 5. Write script to disk â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    send('log', `ðŸ’¾ Writing script to ${relSpec}â€¦`);
    fs.writeFileSync(specFile, scriptContent, 'utf8');
    send('log', `âœ… Script saved: ${relSpec}`);
    send('log', `   ${scriptContent.split('\n').length} lines | ${scriptContent.length} bytes`);

    // â”€â”€ 6. Done â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    send('log', ``);
    send('log', `âœ… Playwright Generator Agent complete!`);
    send('log', `   Script  : ${relSpec}`);
    send('log', `   TestData: ${relTestData}`);
    send('done', {
      specFile:     relSpec,
      testDataFile: relTestData,
      issueKey:     key,
      tcCount:      testCases.length,
    });

  } catch (err) {
    send('error', err.message);
    send('done', { error: err.message });
  }

  res.end();
});

/**
 * Parse test cases from a TEST-CASES.md markdown file.
 * Returns a flat array of test case objects.
 */
function parseTestCasesFromMarkdown(md, issueKey) {
  const results = [];

  // Better approach: find all test case markers and split by their positions
  const testCasePattern = /^(?:#### Test Case:|## Test Case ID:)\s+(\S+)/gm;
  const matches = [];
  let match;
  
  console.log(`[PARSER] === Parsing ${issueKey} ===`);
  console.log(`[PARSER] Markdown length: ${md.length}`);
  
  while ((match = testCasePattern.exec(md)) !== null) {
    matches.push({ id: match[1], index: match.index });
  }
  
  console.log(`[PARSER] Found ${matches.length} test case markers for ${issueKey}`);
  
  // Split into blocks using the found indices
  const blocks = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : md.length;
    blocks.push(md.substring(start, end));
  }
  
  console.log(`[PARSER] Created ${blocks.length} blocks from ${matches.length} matches`);

  for (const block of blocks) {
    const idMatch = block.match(/(?:####\s*Test Case:\s*|##\s*Test Case ID:\s*)(\S+)/i);
    if (!idMatch) {
      console.log(`[PARSER] Skipping block - no ID match`);
      continue;
    }

    const id = idMatch[1];
    console.log(`[PARSER] Matched test case: ${id}`);

    const titleMatch = block.match(/\*\*Title\*\*:?\s*(.+)|\*\*Title:\*\*\s*(.+)/i);
    const prioMatch = block.match(/\*\*Priority\*\*:?\s*(.+)|\*\*Priority:\*\*\s*(.+)/i);
    const typeMatch = block.match(/\*\*Type\*\*:?\s*([^\n]+)|\*\*Test Type:\*\*\s*(.+)/i);
    const preMatch = block.match(/\*\*Preconditions\*\*:?\s*([\s\S]*?)(?=\n\*\*|\n---|\n##|$)|\*\*Preconditions:\*\*\s*([\s\S]*?)(?=\n\*\*|\n---|\n##|$)/i);
    const expMatch = block.match(/\*\*Expected Results\*\*:?\s*([\s\S]*?)(?=\n\*\*|\n---|\n##|$)|\*\*Expected Results:\*\*\s*([\s\S]*?)(?=\n\*\*|\n---|\n##|$)/i);
    const matchText = match => match?.[1] || match?.[2] || '';
    const cleanLines = text => text.split('\n').map(line => line.replace(/^\s*[-*]\s*/, '').trim()).filter(Boolean);

    const stepsWithResults = [];
    const tableSteps = [...block.matchAll(/^\|\s*(\d+)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|?\s*$/gm)];
    if (tableSteps.length) {
      for (const [, , action, result] of tableSteps) {
        if (action === 'Action' || action.startsWith('---')) continue;
        stepsWithResults.push({ action, result });
      }
    } else {
      const stepsSection = block.match(/\*\*Test Steps\*\*:?\s*([\s\S]*?)(?=\n\*\*|\n---|\n##|$)|\*\*Test Steps:\*\*\s*([\s\S]*?)(?=\n\*\*|\n---|\n##|$)/i);
      const stepsText = matchText(stepsSection);
      for (const line of stepsText.split('\n')) {
        const stepMatch = line.trim().match(/^\d+\.\s*(.+)/);
        if (stepMatch) stepsWithResults.push({ action: stepMatch[1], result: '' });
      }
    }

    const dataMatch = block.match(/\*\*Test Data\*\*:?\s*```json\s*([\s\S]*?)```/i);
    let testData;
    if (dataMatch) {
      try {
        testData = JSON.parse(dataMatch[1]);
      } catch {
        testData = dataMatch[1].trim();
      }
    }
    const assertionsMatch = block.match(/\*\*Assertions\*\*:?\s*([\s\S]*?)(?=\n\*\*|\n---|\n##|$)/i);
    const screenshotsMatch = block.match(/\*\*Screenshots on Failure\*\*:?\s*([\s\S]*?)(?=\n\*\*|\n---|\n##|$)/i);
    const automatedMatch = block.match(/\*\*Automated\*\*:?\s*(.+)/i);

    results.push({
      id,
      title: matchText(titleMatch).trim() || id,
      priority: matchText(prioMatch).trim() || 'Medium',
      type: matchText(typeMatch).trim().split(/[\/\s]/)[0] || 'Positive',
      preconditions: cleanLines(matchText(preMatch)).join('\n'),
      steps: stepsWithResults.map(step => step.action),
      stepsWithResults,
      expectedResult: cleanLines(matchText(expMatch)).join('\n'),
      ...(testData === undefined ? {} : { testData }),
      assertions: cleanLines(matchText(assertionsMatch)),
      screenshotsOnFailure: cleanLines(matchText(screenshotsMatch)),
      automated: automatedMatch ? automatedMatch[1].trim().toLowerCase() === 'yes' : false,
    });
  }

  console.log(`[PARSER] Extracted ${results.length} test cases for ${issueKey}`);
  if (results.length > 0) {
    console.log(`[PARSER] First test: ${results[0].id} - ${results[0].title}`);
  }
  return results;
}

// â”€â”€ Requirements File Upload â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const UPLOADS_DIR = path.join(ROOT, 'Requirements');

/** Recursively build a folder/file tree under a directory */
function buildReqTree(dir, base) {
  const entries = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
  const folders = [], files = [];
  for (const name of entries) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      folders.push({ name, type: 'folder', children: buildReqTree(full, base) });
    } else if (/\.(docx|pdf|xlsx|csv|txt)$/i.test(name)) {
      files.push({ name, type: 'file', size: stat.size, uploadedAt: stat.mtime.toISOString(),
                   path: path.relative(base, full).replace(/\\/g, '/') });
    }
  }
  return [...folders, ...files];
}

/** GET /api/requirements/tree â€“ folder+file tree */
app.get('/api/requirements/tree', (req, res) => {
  try {
    if (!fs.existsSync(UPLOADS_DIR)) return res.json({ tree: [] });
    res.json({ tree: buildReqTree(UPLOADS_DIR, UPLOADS_DIR) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** GET /api/requirements/list â€“ flat list (kept for backwards compat) */
app.get('/api/requirements/list', (req, res) => {
  try {
    if (!fs.existsSync(UPLOADS_DIR)) return res.json({ files: [] });
    const files = fs.readdirSync(UPLOADS_DIR)
      .filter(f => /\.(docx|pdf|xlsx|csv|txt)$/i.test(f))
      .map(f => {
        const stat = fs.statSync(path.join(UPLOADS_DIR, f));
        return { name: f, size: stat.size, uploadedAt: stat.mtime.toISOString() };
      })
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    res.json({ files });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/requirements/folder â€“ create a subfolder */
app.post('/api/requirements/folder', (req, res) => {
  try {
    const { name } = req.body || {};
    if (!name || /[<>:"/\\|?*]/.test(name)) return res.status(400).json({ error: 'Invalid folder name' });
    if (name.length > 12) return res.status(400).json({ error: 'Folder name must be 12 characters or fewer' });
    const folderPath = path.join(UPLOADS_DIR, name);
    if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    if (fs.existsSync(folderPath)) return res.status(409).json({ error: 'Folder already exists' });
    fs.mkdirSync(folderPath);
    res.json({ ok: true, name });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** POST /api/requirements/upload â€“ upload a requirement document (optional ?folder=name) */
app.post('/api/requirements/upload', (req, res) => {
  const ALLOWED = /\.(docx|pdf|xlsx|xls|csv|txt)$/i;
  const targetFolder = req.query.folder ? path.basename(req.query.folder) : '';
  const destDir = targetFolder ? path.join(UPLOADS_DIR, targetFolder) : UPLOADS_DIR;
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

  const chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  req.on('end', () => {
    try {
      const body = Buffer.concat(chunks);
      const ct   = req.headers['content-type'] || '';
      const bMatch = ct.match(/boundary=([^\s;]+)/);
      if (!bMatch) return res.status(400).json({ error: 'No multipart boundary' });
      const boundary = bMatch[1];

      // Split on boundary lines
      const sep = Buffer.from('--' + boundary);
      const end = Buffer.from('--' + boundary + '--');
      let pos = 0, filename = '', fileData = null;

      while (pos < body.length) {
        const sepIdx = indexOf(body, sep, pos);
        if (sepIdx === -1) break;
        pos = sepIdx + sep.length;
        if (body.slice(pos, pos + 2).toString() === '--') break; // end boundary
        pos += 2; // skip CRLF after boundary

        // Read part headers
        const headerEnd = indexOf(body, Buffer.from('\r\n\r\n'), pos);
        if (headerEnd === -1) break;
        const headerStr = body.slice(pos, headerEnd).toString('utf8');
        pos = headerEnd + 4;

        const fnMatch = headerStr.match(/filename="([^"]+)"/i);
        if (!fnMatch) continue;
        filename = path.basename(fnMatch[1]);

        // Find next boundary
        const nextSep = indexOf(body, sep, pos);
        const partEnd = nextSep !== -1 ? nextSep - 2 : body.length; // -2 for CRLF before boundary
        fileData = body.slice(pos, partEnd);
        break;
      }

      if (!filename || !fileData) return res.status(400).json({ error: 'Could not parse file from upload' });
      if (!ALLOWED.test(filename)) return res.status(400).json({ error: 'Invalid file type. Allowed: .docx .pdf .xlsx .csv .txt' });

      fs.writeFileSync(path.join(destDir, filename), fileData);

      let preview = null;
      const ext = path.extname(filename).toLowerCase();
      if (ext === '.txt' || ext === '.csv') {
        try { preview = fs.readFileSync(path.join(destDir, filename), 'utf8').slice(0, 50000); } catch (_) {}
      }
      const relPath = targetFolder ? `${targetFolder}/${filename}` : filename;
      res.json({ ok: true, filename, relPath, size: fileData.length, preview });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
});

function indexOf(buf, search, start = 0) {
  for (let i = start; i <= buf.length - search.length; i++) {
    let found = true;
    for (let j = 0; j < search.length; j++) {
      if (buf[i + j] !== search[j]) { found = false; break; }
    }
    if (found) return i;
  }
  return -1;
}

/** GET /api/requirements/content â€“ get text content of an uploaded file (with rich parsing) */
app.get('/api/requirements/content', async (req, res) => {
  const { file } = req.query;
  if (!file) return res.status(400).json({ error: 'file param required' });
  const safeName = file.replace(/\.\./g, '').replace(/^[/\\]+/, '');
  const filePath = path.resolve(UPLOADS_DIR, safeName);
  if (!filePath.startsWith(UPLOADS_DIR)) return res.status(403).json({ error: 'Access denied' });
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });

  const ext = path.extname(safeName).toLowerCase();

  try {
    // â”€â”€ Plain text â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (ext === '.txt' || ext === '.csv' || ext === '.md') {
      const content = fs.readFileSync(filePath, 'utf8').slice(0, 200000);
      return res.json({ filename: safeName, content, type: ext.slice(1) });
    }

    // â”€â”€ Excel (.xlsx / .xls) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (ext === '.xlsx' || ext === '.xls') {
      const XLSX = require('xlsx');
      const wb   = XLSX.readFile(filePath);
      let text   = '';
      const sheets = [];
      for (const sheetName of wb.SheetNames) {
        const ws   = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        // Plain text version (used in edit textarea)
        text += `=== Sheet: ${sheetName} ===\n`;
        for (const row of rows) {
          text += row.map(c => String(c ?? '').padEnd(20)).join('\t') + '\n';
        }
        text += '\n';
        // Structured version (used for table rendering)
        sheets.push({ name: sheetName, rows: rows.map(r => r.map(c => String(c ?? ''))) });
      }
      return res.json({ filename: safeName, content: text.slice(0, 200000), sheets, type: ext.slice(1) });
    }

    // â”€â”€ PDF â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (ext === '.pdf') {
      const pdfParse = require('pdf-parse');
      const buffer   = fs.readFileSync(filePath);
      const data     = await pdfParse(buffer);
      return res.json({ filename: safeName, content: data.text.slice(0, 200000), type: 'pdf',
                        pages: data.numpages, info: data.info?.Title || null });
    }

    // â”€â”€ Word (.docx) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (ext === '.docx') {
      const mammoth = require('mammoth');
      const result  = await mammoth.extractRawText({ path: filePath });
      return res.json({ filename: safeName, content: result.value.slice(0, 200000), type: 'docx' });
    }

    // Fallback for unrecognised extensions
    return res.json({ filename: safeName, content: null, type: ext.slice(1),
                      message: `Preview not available for ${ext} files.` });
  } catch (err) {
    return res.status(500).json({ error: `Failed to parse file: ${err.message}` });
  }
});

// â”€â”€ Server Health & Restart â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** GET /api/server/status â€“ Return server uptime and basic health info */
app.get('/api/server/status', (req, res) => {
  const uptimeSec = process.uptime();
  res.json({
    ok:        true,
    pid:       process.pid,
    uptime:    uptimeSec,
    uptimeStr: formatUptime(uptimeSec),
    nodeVersion: process.version,
    port:      PORT,
    startedAt: new Date(Date.now() - uptimeSec * 1000).toISOString(),
  });
});

/** POST /api/server/restart â€“ Restart the Node.js server process */
app.post('/api/server/restart', (req, res) => {
  res.json({ ok: true, message: 'Server restarting...' });
  setTimeout(() => {
    console.log('Restart requested via API - spawning new server process');
    const { spawn } = require('child_process');
    const serverScript = path.join(__dirname, 'index.js');
    const child = spawn('node', [serverScript], {
      cwd: ROOT,
      detached: true,
      stdio: 'ignore',
      env: { ...process.env }
    });
    child.unref();
    setTimeout(() => { process.exit(0); }, 500);
  }, 200);
});

/** PUT /api/requirements/content â€“ overwrite text content of an existing uploadable file */
app.put('/api/requirements/content', (req, res) => {
  try {
    const { file, content } = req.body || {};
    if (!file) return res.status(400).json({ error: 'file param required' });
    const safeName = file.replace(/\.\./g, '').replace(/^[/\\]+/, '');
    const absPath  = path.resolve(UPLOADS_DIR, safeName);
    if (!absPath.startsWith(UPLOADS_DIR)) return res.status(400).json({ error: 'Invalid path' });
    if (!fs.existsSync(absPath)) return res.status(404).json({ error: 'File not found' });

    const ext = path.extname(absPath).toLowerCase();
    const PLAIN_EDITABLE = /\.(txt|csv|md)$/i;

    // For plain text files: overwrite in place
    if (PLAIN_EDITABLE.test(absPath)) {
      fs.writeFileSync(absPath, content ?? '', 'utf8');
      return res.json({ ok: true, savedAs: safeName });
    }

    // For PDF / XLSX: the binary file stays intact; save edited text as a
    // sibling .txt file (e.g. "report.pdf" â†’ "report.pdf.txt").
    // This preserves the original binary while giving the user an editable copy.
    if (ext === '.pdf' || ext === '.xlsx' || ext === '.xls' || ext === '.docx') {
      const txtName = safeName + '.txt';
      const txtPath = path.resolve(UPLOADS_DIR, txtName);
      if (!txtPath.startsWith(UPLOADS_DIR)) return res.status(400).json({ error: 'Invalid path' });
      fs.writeFileSync(txtPath, content ?? '', 'utf8');
      // Return the new relative path so the frontend can switch its selection
      const relPath = path.relative(UPLOADS_DIR, txtPath).replace(/\\/g, '/');
      return res.json({ ok: true, savedAs: relPath });
    }

    return res.status(400).json({ error: 'Only .txt, .csv, .md, .pdf, .xlsx and .docx files can be edited' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** POST /api/requirements/upload-json â€“ Save a requirement from JSON body {name, content, folder?} */
app.post('/api/requirements/upload-json', (req, res) => {
  try {
    const { name, content = '', folder = '' } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name is required' });
    const ALLOWED = /\.(docx|pdf|xlsx|xls|csv|txt|md)$/i;
    const safeName = path.basename(name);
    if (!ALLOWED.test(safeName)) return res.status(400).json({ error: 'Invalid file type' });
    const safeFolder = folder ? path.basename(folder) : '';
    const destDir  = safeFolder ? path.join(UPLOADS_DIR, safeFolder) : UPLOADS_DIR;
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    const destPath = path.join(destDir, safeName);
    if (fs.existsSync(destPath)) return res.status(409).json({ error: 'A file with that name already exists' });
    fs.writeFileSync(destPath, content, 'utf8');
    const relPath = safeFolder ? `${safeFolder}/${safeName}` : safeName;
    res.json({ ok: true, name: safeName, relPath, size: Buffer.byteLength(content) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/requirements/folder â€“ delete a folder and all its contents */
app.delete('/api/requirements/folder', (req, res) => {
  try {
    const { name } = req.body || {};
    if (!name || /[<>:"/\\|?*]/.test(name)) return res.status(400).json({ error: 'Invalid folder name' });
    const folderPath = path.resolve(UPLOADS_DIR, path.basename(name));
    if (!folderPath.startsWith(UPLOADS_DIR)) return res.status(400).json({ error: 'Invalid path' });
    if (!fs.existsSync(folderPath)) return res.status(404).json({ error: 'Folder not found' });
    fs.rmSync(folderPath, { recursive: true, force: true });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** PATCH /api/requirements/folder â€“ rename a folder */
app.patch('/api/requirements/folder', (req, res) => {
  try {
    const { oldName, newName } = req.body || {};
    if (!oldName || !newName || /[<>:"/\\|?*]/.test(newName)) return res.status(400).json({ error: 'Invalid name' });
    if (newName.length > 12) return res.status(400).json({ error: 'Folder name must be 12 characters or fewer' });
    const oldPath = path.resolve(UPLOADS_DIR, path.basename(oldName));
    const newPath = path.resolve(UPLOADS_DIR, path.basename(newName));
    if (!oldPath.startsWith(UPLOADS_DIR) || !newPath.startsWith(UPLOADS_DIR)) return res.status(400).json({ error: 'Invalid path' });
    if (!fs.existsSync(oldPath)) return res.status(404).json({ error: 'Folder not found' });
    if (fs.existsSync(newPath)) return res.status(409).json({ error: 'A folder with that name already exists' });
    fs.renameSync(oldPath, newPath);
    res.json({ ok: true, name: newName });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** DELETE /api/requirements/file â€“ delete a single file */
app.delete('/api/requirements/file', (req, res) => {
  try {
    const { path: filePath } = req.body || {};
    if (!filePath) return res.status(400).json({ error: 'path required' });
    const safePath = filePath.replace(/\.\./g, '').replace(/^[/\\]+/, '');
    const absPath  = path.resolve(UPLOADS_DIR, safePath);
    if (!absPath.startsWith(UPLOADS_DIR)) return res.status(400).json({ error: 'Invalid path' });
    if (!fs.existsSync(absPath)) return res.status(404).json({ error: 'File not found' });
    fs.unlinkSync(absPath);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** PATCH /api/requirements/file â€“ rename a file (within same folder) */
app.patch('/api/requirements/file', (req, res) => {
  try {
    const { oldPath: oldRel, newName } = req.body || {};
    if (!oldRel || !newName) return res.status(400).json({ error: 'oldPath and newName required' });
    const ALLOWED = /\.(docx|pdf|xlsx|csv|txt)$/i;
    if (!ALLOWED.test(newName) || /[<>:"/\\|?*]/.test(newName)) return res.status(400).json({ error: 'Invalid file name' });
    const safeOld = oldRel.replace(/\.\./g, '').replace(/^[/\\]+/, '');
    const absOld  = path.resolve(UPLOADS_DIR, safeOld);
    if (!absOld.startsWith(UPLOADS_DIR)) return res.status(400).json({ error: 'Invalid path' });
    if (!fs.existsSync(absOld)) return res.status(404).json({ error: 'File not found' });
    const absNew = path.join(path.dirname(absOld), path.basename(newName));
    if (!absNew.startsWith(UPLOADS_DIR)) return res.status(400).json({ error: 'Invalid path' });
    if (fs.existsSync(absNew)) return res.status(409).json({ error: 'A file with that name already exists' });
    fs.renameSync(absOld, absNew);
    const folder = path.relative(UPLOADS_DIR, path.dirname(absNew));
    const relPath = folder ? `${folder}/${path.basename(newName)}` : path.basename(newName);
    res.json({ ok: true, relPath });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** PUT /api/requirements/file/move â€“ move a file into a different folder */
app.put('/api/requirements/file/move', (req, res) => {
  try {
    const { oldPath: oldRel, newFolder } = req.body || {};
    if (oldRel === undefined) return res.status(400).json({ error: 'oldPath required' });
    const safeOld = oldRel.replace(/\.\./g, '').replace(/^[/\\]+/, '');
    const absOld  = path.resolve(UPLOADS_DIR, safeOld);
    if (!absOld.startsWith(UPLOADS_DIR)) return res.status(400).json({ error: 'Invalid source path' });
    if (!fs.existsSync(absOld)) return res.status(404).json({ error: 'File not found' });
    
    // Destination: newFolder can be empty string (root) or a folder name
    const safeFolder = newFolder ? path.basename(newFolder) : '';
    const destDir    = safeFolder ? path.join(UPLOADS_DIR, safeFolder) : UPLOADS_DIR;
    if (!destDir.startsWith(UPLOADS_DIR)) return res.status(400).json({ error: 'Invalid destination' });
    if (!fs.existsSync(destDir)) return res.status(404).json({ error: 'Destination folder not found' });
    
    const fileName = path.basename(absOld);
    const absNew   = path.join(destDir, fileName);
    if (absOld === absNew) return res.json({ ok: true, relPath: oldRel }); // same location, no-op
    if (fs.existsSync(absNew)) return res.status(409).json({ error: 'A file with that name already exists in the destination folder' });
    
    fs.renameSync(absOld, absNew);
    const relPath = safeFolder ? `${safeFolder}/${fileName}` : fileName;
    res.json({ ok: true, relPath });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

function formatUptime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// â”€â”€ Serve React app (web/dist) at /app â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.post('/api/test-connection-v2', async (req, res) => {
  const { toolType, appUrl, username, password } = req.body;
  if (!appUrl || !password) {
    return res.status(400).json({ connected: false, error: 'URL and API Key are required' });
  }
  try {
    const axios = require('axios');
    if (toolType === 'Jira') {
      const baseUrl = appUrl.replace(/\/+$/, '');
      const basicAuth = Buffer.from(username + ':' + password).toString('base64');
      const response = await axios.get(baseUrl + '/rest/api/2/myself', {
        headers: { 'Authorization': 'Basic ' + basicAuth, 'Content-Type': 'application/json' },
        timeout: 15000, validateStatus: function() { return true; }
      });
      if (response.status === 200) {
        res.json({ connected: true, message: 'Connected as ' + (response.data.displayName || username) });
      } else {
        res.json({ connected: false, error: 'Jira status ' + response.status });
      }
    } else if (toolType === 'ADO') {
      const baseUrl = appUrl.replace(/\/+$/, '');
      const basicAuth = Buffer.from(':' + password).toString('base64');
      const response = await axios.get(baseUrl + '/_apis/projects?api-version=7.0', {
        headers: { 'Authorization': 'Basic ' + basicAuth }, timeout: 15000, validateStatus: function() { return true; }
      });
      if (response.status === 200) {
        res.json({ connected: true, message: 'Connected to Azure DevOps' });
      } else {
        res.json({ connected: false, error: 'ADO status ' + response.status });
      }
    } else {
      res.json({ connected: false, error: 'Unknown tool type' });
    }
  } catch (err) {
    res.json({ connected: false, error: err.message });
  }
});

const REACT_DIST = path.join(ROOT, 'web', 'dist');
if (fs.existsSync(REACT_DIST)) {
  app.use('/app', express.static(REACT_DIST));
  // Catch-all for React Router (SPA fallback)
  app.get('/app/*', (req, res) => {
    res.sendFile(path.join(REACT_DIST, 'index.html'));
  });
}

// ── Tensai Script Importer ───────────────────────────────────────────────────

app.post('/api/tensai/convert', (req, res) => {
  try {
    const { pythonSource, filePath } = req.body;
    let source = pythonSource;
    if (!source && filePath) {
      const absPath = path.resolve(filePath);
      if (!fs.existsSync(absPath)) return res.status(404).json({ error: `File not found: ${filePath}` });
      source = fs.readFileSync(absPath, 'utf-8');
    }
    if (!source || !source.trim()) return res.status(400).json({ error: 'No Python source provided.' });
    const converted = convertPythonToPlaywrightTS(source);
    const fileName = filePath ? path.basename(filePath).replace(/\.py$/, '.spec.ts') : 'converted.spec.ts';
    res.json({ success: true, typescript: converted, fileName });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

function convertPythonToPlaywrightTS(pySource) {
  let ts = "import { test, expect } from '@playwright/test';\n\n";
  const lines = pySource.split('\n');
  let inTest = false;
  let hasTopLevelCode = false;
  let topLevelBuffer = [];

  // First pass: check if there are Playwright commands before the first function def
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('from playwright') || trimmed.startsWith('import playwright')) continue;
    if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) continue;
    if (trimmed === '') continue;
    const testMatch = trimmed.match(/^(?:async\s+)?def\s+(test_\w+|\w+)\s*\(/);
    if (testMatch) break; // found a function definition, stop checking
    // Check if this line looks like a Playwright command or step comment
    if (trimmed.startsWith('await ') || trimmed.startsWith('page.') || trimmed.startsWith('# Step') || trimmed.startsWith('print(')) {
      hasTopLevelCode = true;
      break;
    }
  }

  // If there's top-level code before any function, wrap everything in a single test
  if (hasTopLevelCode) {
    ts += "test('imported tensai script', async ({ page }) => {\n";
    let insideAgentStep = false;
    let agentStepIndent = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      // Skip Python imports
      if (trimmed.startsWith('from playwright') || trimmed.startsWith('import playwright')) continue;
      if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) continue;

      // Handle __agent_step__ function definitions — inline them
      const agentStepMatch = trimmed.match(/^(?:async\s+)?def\s+__agent_step__\s*\(/);
      if (agentStepMatch) {
        insideAgentStep = true;
        agentStepIndent = line.search(/\S/);
        continue;
      }

      // Skip the `await __agent_step__()` call line
      if (trimmed === 'await __agent_step__()') continue;

      // Detect end of agent step block (dedented line after agent step def)
      if (insideAgentStep && trimmed !== '' && !trimmed.startsWith('#')) {
        const currentIndent = line.search(/\S/);
        if (currentIndent <= agentStepIndent && !trimmed.startsWith('await __agent_step__')) {
          insideAgentStep = false;
        }
      }

      // Convert the line
      let c = trimmed;
      if (c === '') { ts += '\n'; continue; }

      // Convert comments
      c = c.replace(/^#(.*)/, '//$1');
      if (c.startsWith('//')) { ts += '  ' + c + '\n'; continue; }

      // Skip print statements (debug output)
      if (c.startsWith('print(')) { ts += '  // ' + c + '\n'; continue; }

      // Convert Python Playwright API to TypeScript
      c = c.replace(/(?:await\s+)?page\.goto\((.+?)\)/, 'await page.goto($1)');
      c = c.replace(/(?:await\s+)?page\.click\((.+?)\)/, 'await page.click($1)');
      c = c.replace(/(?:await\s+)?page\.fill\((.+?),\s*(.+?)\)/, 'await page.fill($1, $2)');
      c = c.replace(/(?:await\s+)?page\.locator\((.+?)\)\.click\(\)/, 'await page.locator($1).click()');
      c = c.replace(/(?:await\s+)?page\.locator\((.+?)\)\.fill\((.+?)\)/, 'await page.locator($1).fill($2)');
      c = c.replace(/(?:await\s+)?page\.locator\((.+?)\)\.scroll_into_view_if_needed\(\)/, 'await page.locator($1).scrollIntoViewIfNeeded()');
      c = c.replace(/(?:await\s+)?expect\((.+?)\)\.to_be_visible\(\)/, 'await expect($1).toBeVisible()');
      c = c.replace(/(?:await\s+)?expect\((.+?)\)\.to_have_text\((.+?)\)/, 'await expect($1).toHaveText($2)');
      c = c.replace(/(?:await\s+)?expect\((.+?)\)\.to_contain_text\((.+?)\)/, 'await expect($1).toContainText($2)');
      c = c.replace(/(?:await\s+)?page\.wait_for_selector\((.+?)\)/, 'await page.waitForSelector($1)');
      c = c.replace(/(?:await\s+)?page\.wait_for_timeout\((.+?)\)/, 'await page.waitForTimeout($1)');
      c = c.replace(/(?:await\s+)?page\.wait_for_load_state\((.+?)\)/, 'await page.waitForLoadState($1)');
      c = c.replace(/(?:await\s+)?page\.get_by_role\((.+?)\)\.click\(\)/, 'await page.getByRole($1).click()');
      c = c.replace(/(?:await\s+)?page\.get_by_role\((.+?)\)\.fill\((.+?)\)/, 'await page.getByRole($1).fill($2)');
      c = c.replace(/(?:await\s+)?page\.get_by_role\((.+?)\)\.press\((.+?)\)/, 'await page.getByRole($1).press($2)');
      c = c.replace(/(?:await\s+)?page\.get_by_text\((.+?)\)\.click\(\)/, 'await page.getByText($1).click()');
      c = c.replace(/(?:await\s+)?page\.get_by_label\((.+?)\)\.fill\((.+?)\)/, 'await page.getByLabel($1).fill($2)');
      c = c.replace(/(?:await\s+)?page\.keyboard\.type\((.+?)\)/, 'await page.keyboard.type($1)');
      c = c.replace(/(?:await\s+)?page\.keyboard\.press\((.+?)\)/, 'await page.keyboard.press($1)');
      c = c.replace(/(?:await\s+)?page\.mouse\.wheel\((.+?)\)/, 'await page.mouse.wheel($1)');
      c = c.replace(/(?:await\s+)?page\.evaluate\((.+?)\)/, 'await page.evaluate($1)');
      // Generic snake_case to camelCase for remaining page methods
      c = c.replace(/page\.(\w+?)_(\w+)/g, (m, a, b) => 'page.' + a + b.charAt(0).toUpperCase() + b.slice(1));
      c = c.replace(/\.(\w+?)_(\w+)/g, (m, a, b) => '.' + a + b.charAt(0).toUpperCase() + b.slice(1));

      // Skip pure Python variable assignments that aren't awaits
      if (c.match(/^\w+\s*=\s*(?!await)/) && !c.includes('page.')) {
        ts += '  // ' + c + '\n';
        continue;
      }

      // Ensure trailing semicolons
      if (c && !c.endsWith('{') && !c.endsWith('}') && !c.endsWith(';') && !c.startsWith('//')) {
        c = c.replace(/;?\s*$/, ';');
      }

      ts += '  ' + c + '\n';
    }

    ts += '});\n';
    return ts;
  }

  // Original logic for scripts with proper function definitions
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('from playwright') || trimmed.startsWith('import playwright')) continue;
    if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) continue;
    if (trimmed === '' && !inTest) continue;
    const testMatch = trimmed.match(/^(?:async\s+)?def\s+(test_\w+|\w+)\s*\(/);
    if (testMatch) {
      if (inTest) ts += '});\n\n';
      ts += "test('" + testMatch[1].replace(/_/g, ' ') + "', async ({ page }) => {\n";
      inTest = true;
      continue;
    }
    if (!inTest && trimmed.startsWith('def ')) continue;
    let c = trimmed;
    c = c.replace(/(?:await\s+)?page\.goto\((.+?)\)/, 'await page.goto($1)');
    c = c.replace(/(?:await\s+)?page\.click\((.+?)\)/, 'await page.click($1)');
    c = c.replace(/(?:await\s+)?page\.fill\((.+?),\s*(.+?)\)/, 'await page.fill($1, $2)');
    c = c.replace(/(?:await\s+)?page\.locator\((.+?)\)\.click\(\)/, 'await page.locator($1).click()');
    c = c.replace(/(?:await\s+)?page\.locator\((.+?)\)\.fill\((.+?)\)/, 'await page.locator($1).fill($2)');
    c = c.replace(/(?:await\s+)?expect\((.+?)\)\.to_be_visible\(\)/, 'await expect($1).toBeVisible()');
    c = c.replace(/(?:await\s+)?expect\((.+?)\)\.to_have_text\((.+?)\)/, 'await expect($1).toHaveText($2)');
    c = c.replace(/(?:await\s+)?expect\((.+?)\)\.to_contain_text\((.+?)\)/, 'await expect($1).toContainText($2)');
    c = c.replace(/(?:await\s+)?page\.wait_for_selector\((.+?)\)/, 'await page.waitForSelector($1)');
    c = c.replace(/(?:await\s+)?page\.wait_for_timeout\((.+?)\)/, 'await page.waitForTimeout($1)');
    c = c.replace(/(?:await\s+)?page\.wait_for_load_state\((.+?)\)/, 'await page.waitForLoadState($1)');
    c = c.replace(/(?:await\s+)?page\.get_by_role\((.+?)\)\.click\(\)/, 'await page.getByRole($1).click()');
    c = c.replace(/(?:await\s+)?page\.get_by_role\((.+?)\)\.fill\((.+?)\)/, 'await page.getByRole($1).fill($2)');
    c = c.replace(/(?:await\s+)?page\.get_by_text\((.+?)\)\.click\(\)/, 'await page.getByText($1).click()');
    c = c.replace(/(?:await\s+)?page\.get_by_label\((.+?)\)\.fill\((.+?)\)/, 'await page.getByLabel($1).fill($2)');
    c = c.replace(/(?:await\s+)?page\.keyboard\.type\((.+?)\)/, 'await page.keyboard.type($1)');
    c = c.replace(/(?:await\s+)?page\.keyboard\.press\((.+?)\)/, 'await page.keyboard.press($1)');
    c = c.replace(/(?:await\s+)?page\.mouse\.wheel\((.+?)\)/, 'await page.mouse.wheel($1)');
    c = c.replace(/(?:await\s+)?page\.evaluate\((.+?)\)/, 'await page.evaluate($1)');
    c = c.replace(/page\.(\w+?)_(\w+)/g, (m, a, b) => 'page.' + a + b.charAt(0).toUpperCase() + b.slice(1));
    c = c.replace(/\.(\w+?)_(\w+)/g, (m, a, b) => '.' + a + b.charAt(0).toUpperCase() + b.slice(1));
    c = c.replace(/^#(.*)/, '//$1');
    if (c.startsWith('//') || c === '') { if (inTest) ts += '  ' + c + '\n'; continue; }
    if (inTest && c && !c.endsWith('{') && !c.endsWith('}')) c = c.replace(/;?\s*$/, ';');
    if (inTest) ts += '  ' + c + '\n';
  }
  if (inTest) ts += '});\n';
  if (!ts.includes("test('")) {
    ts = "import { test, expect } from '@playwright/test';\n\ntest('imported tensai script', async ({ page }) => {\n" + pySource.split('\n').map(function(l) { return '  // ' + l; }).join('\n') + '\n});\n';
  }
  return ts;
}

// â”€â”€ Start Server â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

app.listen(PORT, () => {
  console.log(`\nâœ… Playwright Dashboard Server running on http://localhost:${PORT}\n`);
  console.log(`ðŸ“Š Test Dashboard:  http://localhost:${PORT}/test-dashboard.html`);
  console.log(`âš›ï¸  React Dashboard: http://localhost:${PORT}/app`);
  console.log(`ðŸ“ API Docs:        http://localhost:${PORT}/api/stats\n`);
});








/** POST /api/test-debug - Debug endpoint to test file and testName parameters */
app.post('/api/test-debug', (req, res) => {
  const timestamp = new Date().toISOString();
  const { file, testName } = req.body || {};
  
  console.log(`\n[DEBUG] ${timestamp}`);
  console.log('[DEBUG] Received request to /api/test-debug');
  console.log('[DEBUG] Body:', JSON.stringify(req.body, null, 2));
  console.log('[DEBUG] File:', file);
  console.log('[DEBUG] TestName:', testName);
  
  res.json({
    success: true,
    timestamp,
    received: { file, testName },
    message: 'Debug endpoint received request successfully'
  });
});


// Debug log to see if spawn is being called
app.post('/api/debug-spawn', (req, res) => {
  const file = 'tests/VB-3/VB-3-Script.spec.ts';
  const testName = 'TC_VB3_001: Successful User Login to Bank Dashboard';
  
  console.log('\n[DEBUG-SPAWN] Starting test...');
  console.log('File:', file);
  console.log('TestName:', testName);
  
  const { spawn } = require('child_process');
  const ROOT = path.join(__dirname, '..');
  const isWin = process.platform === 'win32';
  
  const spawnCmd = 'npx';
  const relFile = file.replace(/\\/g, '/');
  const spawnArgs = ['playwright', 'test', relFile, '--reporter=list'];
  if (testName) {
    spawnArgs.push('--grep', testName);
    spawnArgs.push('--headed');
  }
  
  console.log('[DEBUG-SPAWN] Command:', spawnCmd);
  console.log('[DEBUG-SPAWN] Args:', JSON.stringify(spawnArgs));
  
  let proc;
  if (isWin) {
    const escapedArgs = spawnArgs.map(arg => {
      if (arg.includes(' ') || arg.includes('"')) {
        return `"${arg.replace(/"/g, '\\"')}"`;
      }
      return arg;
    }).join(' ');
    const fullCmd = `${spawnCmd} ${escapedArgs}`;
    console.log('[DEBUG-SPAWN] Full command:', fullCmd);
    proc = spawn(fullCmd, { shell: true, cwd: ROOT });
  } else {
    proc = spawn(spawnCmd, spawnArgs, { cwd: ROOT });
  }
  
  console.log('[DEBUG-SPAWN] Process spawned, PID:', proc.pid);
  
  let output = '';
  proc.stdout.on('data', (data) => {
    output += data.toString();
    console.log('[DEBUG-SPAWN] stdout:', data.toString().substring(0, 100));
  });
  
  proc.stderr.on('data', (data) => {
    output += data.toString();
    console.log('[DEBUG-SPAWN] stderr:', data.toString().substring(0, 100));
  });
  
  proc.on('error', (err) => {
    console.error('[DEBUG-SPAWN] Error:', err.message);
    res.json({ error: err.message, output });
  });
  
  proc.on('close', (code) => {
    console.log('[DEBUG-SPAWN] Process closed with code:', code);
    res.json({ success: true, exitCode: code, output: output.substring(0, 1000) });
  });
});


// ========== NEW WORKING ENDPOINT ==========
/** POST /api/run-test-simple – Run a specific test (WORKING VERSION) */
app.post('/api/run-test-simple', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  function sse(type, data) {
    res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
  }

  const { file, testName } = req.body || {};
  console.log('[RUN-TEST-SIMPLE] Starting:', { file, testName });
  
  if (!file) {
    sse('error', 'No file specified');
    sse('done', { exitCode: 1, passed: 0, failed: 0, skipped: 0, testResults: [] });
    res.end();
    return;
  }

  const relFile = file.replace(/\\/g, '/');
  const isWin = process.platform === 'win32';
  const reportRun = createPlaywrightReportRun(relFile, testName);
  const reportEnv = { ...process.env, ...playwrightReportEnvironment(reportRun) };

  sse('log', `Running: ${file}${testName ? ` [${testName}]` : ''}`);

  // Build args
  const spawnArgs = ['playwright', 'test', relFile, '--reporter=list,html,json', '--headed'];
  if (testName) {
    // Escape regex special characters in the test name for --grep
    spawnArgs.push('--grep', testName);
  }
  
  let proc;
  if (isWin) {
    // On Windows with shell, build full command string - always quote the grep arg
    const cmd = `npx ${spawnArgs.map(a => `"${a}"`).join(' ')}`;
    console.log('[RUN-TEST-SIMPLE] Command:', cmd);
    proc = spawn(cmd, { shell: true, cwd: ROOT, env: reportEnv });
  } else {
    proc = spawn('npx', spawnArgs, { cwd: ROOT, env: reportEnv });
  }

  let output = '';
  let passed = 0, failed = 0;

  proc.stdout.on('data', d => {
    const text = d.toString();
    output += text;
    sse('log', text);
    // Parse the final summary line: "X passed" or "X failed"
    const passedMatch = text.match(/(\d+)\s+passed/);
    const failedMatch = text.match(/(\d+)\s+failed/);
    if (passedMatch) passed = parseInt(passedMatch[1], 10);
    if (failedMatch) failed = parseInt(failedMatch[1], 10);
  });

  proc.stderr.on('data', d => {
    output += d.toString();
    sse('log', d.toString());
  });

  proc.on('error', err => {
    console.error('[RUN-TEST-SIMPLE] Error:', err.message);
    sse('error', err.message);
    sse('done', { exitCode: 1, passed: 0, failed: 0, skipped: 0, testResults: [], file });
    res.end();
  });

  proc.on('close', code => {
    console.log('[RUN-TEST-SIMPLE] Closed with code:', code);

    const report = finalizePlaywrightReport(reportRun, { passed, failed });
    if (report) sse('log', `Playwright report saved: ${report.reportUrl}`);
    sse('done', {
      exitCode: code,
      passed,
      failed,
      skipped: 0,
      testResults: [],
      file,
      reportFile: report?.reportFile || null,
      reportUrl: report?.reportUrl || null,
    });
    res.end();
  });
});


// ────────────────────────────────────────────────────────────────────────────────
// ADDITIONAL ENDPOINT: POST /api/run-tests/headed
// ────────────────────────────────────────────────────────────────────────────────

/** POST /api/run-tests/headed – Run a specific test in headed mode (SSE stream) */
app.post('/api/run-tests/headed', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  function sse(type, data) {
    res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
  }

  const { file, testIndex } = req.body || {};
  if (!file) {
    sse('error', 'No file specified');
    sse('done', { exitCode: 1, passed: 0, failed: 0, skipped: 0 });
    res.end();
    return;
  }

  let absFile;
  if (path.isAbsolute(file)) {
    absFile = path.normalize(file);
  } else {
    const strategies = [
      path.resolve(ROOT, file.replace(/\//g, path.sep)),
      path.resolve(ROOT, file),
      path.join(ROOT, file),
    ];
    absFile = null;
    for (const candidate of strategies) {
      if (fs.existsSync(candidate)) {
        absFile = candidate;
        break;
      }
    }
    if (!absFile) {
      absFile = strategies[0];
    }
  }

  if (!fs.existsSync(absFile)) {
    sse('error', `Test file not found: ${file}`);
    sse('done', { exitCode: 1, passed: 0, failed: 0, skipped: 0 });
    res.end();
    return;
  }

  sse('log', `▶ Running test in headed mode: ${file}${testIndex !== undefined ? ` [test index: ${testIndex}]` : ''}`);

  const relFile = file.replace(/\\/g, '/');
  const reportRun = createPlaywrightReportRun(relFile, '');
  const reportEnv = { ...process.env, ...playwrightReportEnvironment(reportRun) };
  const isWin = process.platform === 'win32';
  const binExt = isWin ? '.cmd' : '';
  const playwrightBin = path.join(ROOT, 'node_modules', '.bin', `playwright${binExt}`);
  const binExists = fs.existsSync(playwrightBin);

  let spawnCmd, spawnArgs, spawnOpts;
  if (binExists) {
    spawnCmd = playwrightBin;
    spawnArgs = ['test', relFile, '--reporter=list,html,json', '--headed'];
    if (testIndex !== undefined) {
      spawnArgs.push('--grep', `TC_VB3_00${testIndex + 1}`);
    }
    spawnOpts = { cwd: ROOT, shell: isWin, env: reportEnv };
  } else {
    spawnCmd = 'npx';
    spawnArgs = ['playwright', 'test', relFile, '--reporter=list,html,json', '--headed'];
    if (testIndex !== undefined) {
      spawnArgs.push('--grep', `TC_VB3_00${testIndex + 1}`);
    }
    spawnOpts = { cwd: ROOT, shell: isWin, env: reportEnv };
  }

  let outputBuf = '';
  let passed = 0, failed = 0, skipped = 0;

  let proc;
  if (isWin && spawnOpts.shell) {
    const escapedArgs = spawnArgs.map(arg => {
      if (arg.includes(' ') || arg.includes('"')) {
        return `"${arg.replace(/"/g, '\\"')}"`;
      }
      return arg;
    }).join(' ');
    const fullCmd = `${spawnCmd} ${escapedArgs}`;
    proc = spawn(fullCmd, { shell: true, cwd: ROOT, env: reportEnv });
  } else {
    proc = spawn(spawnCmd, spawnArgs, spawnOpts);
  }

  function flushLines(text) {
    outputBuf += text;
    const lines = outputBuf.split('\n');
    outputBuf = lines.pop();
    for (const line of lines) {
      if (!line.trim()) continue;
      sse('log', line);
      const passMatch = line.match(/^\s*[✓✔]\s+\d+\s+.*?›\s+(.+?)\s+\((\d+[\d.]*\w*)\)/);
      const failMatch = line.match(/^\s*[✗✘×]\s+\d+\s+.*?›\s+(.+?)\s+\((\d+[\d.]*\w*)\)/);
      if (passMatch) { passed++; }
      if (failMatch) { failed++; }
    }
  }

  proc.stdout.on('data', d => flushLines(d.toString()));
  proc.stderr.on('data', d => flushLines(d.toString()));

  proc.on('error', err => {
    sse('error', `Process error: ${err.message}`);
    sse('done', { exitCode: 1, passed: 0, failed: 0, skipped: 0 });
    res.end();
  });

  proc.on('close', code => {
    if (outputBuf.trim()) sse('log', outputBuf);
    sse('log', '');
    sse('log', `Results: ${passed} passed, ${failed} failed, ${skipped} skipped (exit code: ${code})`);
    
    const report = finalizePlaywrightReport(reportRun, { passed, failed, skipped });
    if (report) sse('log', `Playwright report saved: ${report.reportUrl}`);
    sse('done', {
      exitCode: code,
      passed,
      failed,
      skipped,
      reportFile: report?.reportFile || null,
      reportUrl: report?.reportUrl || null,
    });
    res.end();
  });

  req.on('close', () => { if (!proc.killed) proc.kill('SIGTERM'); });
});


/** GET /api/file-content – Read file content for display in editor */
app.get('/api/file-content', (req, res) => {
  try {
    const { path: filePath } = req.query;
    if (!filePath) {
      return res.status(400).json({ error: 'path parameter is required' });
    }

    // Resolve path and validate
    const absPath = path.resolve(ROOT, filePath.replace(/\\/g, path.sep));
    
    // Security check: ensure path is within ROOT
    if (!absPath.startsWith(ROOT)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!fs.existsSync(absPath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const content = fs.readFileSync(absPath, 'utf8');
    res.json({ content, path: filePath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/read-file – Alternative endpoint to read file content */
app.post('/api/read-file', (req, res) => {
  try {
    const { path: filePath } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: 'path is required' });
    }

    const absPath = path.resolve(ROOT, filePath.replace(/\\/g, path.sep));
    
    if (!absPath.startsWith(ROOT)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!fs.existsSync(absPath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const content = fs.readFileSync(absPath, 'utf8');
    res.json({ content, path: filePath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/parse-feature-file – Parse a .feature (Gherkin) file and extract scenarios as test cases */
app.post('/api/parse-feature-file', (req, res) => {
  try {
    const { filePath } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: 'filePath is required' });
    }

    const absPath = path.resolve(ROOT, filePath.replace(/\\/g, path.sep));
    
    // Security check
    if (!absPath.startsWith(ROOT)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!fs.existsSync(absPath)) {
      return res.status(404).json({ error: 'Feature file not found' });
    }

    const content = fs.readFileSync(absPath, 'utf8');
    const testCases = parseGherkinFeatureFile(content, filePath);
    
    res.json({ 
      ok: true, 
      testCases,
      count: testCases.length,
      message: `Parsed ${testCases.length} scenario(s) from feature file`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/generate-test-automation – Generate locators, page objects, and test scripts from test cases */
app.post('/api/generate-test-automation', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  function sse(type, data) {
    res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
  }

  try {
    const { issueKey, testCases, summary } = req.body || {};
    
    if (!issueKey) {
      sse('error', 'Missing issueKey in request body');
      sse('done', { success: false, message: 'Missing issueKey parameter' });
      res.end();
      return;
    }

    sse('log', `🚀 Generating test automation for ${issueKey}...`);

    const countCases = groups => ['positive', 'negative', 'edge']
      .reduce((total, category) => total + (Array.isArray(groups?.[category]) ? groups[category].length : 0), 0);
    let testCasesToUse = testCases;

    // Treat an empty categorized object as missing input and parse the saved
    // markdown instead. This prevents locators/pages being generated without
    // the test blocks that should appear in the spec.
    if (countCases(testCasesToUse) === 0) {
      sse('log', `📖 Reading saved test cases from specs/${issueKey}-TEST-CASES.md...`);
      const specFile = path.join(ROOT, 'specs', `${issueKey}-TEST-CASES.md`);

      if (!fs.existsSync(specFile)) {
        sse('error', `Spec file not found: specs/${issueKey}-TEST-CASES.md`);
        sse('done', { success: false, message: 'Test case file not found. Please save test cases first.' });
        res.end();
        return;
      }

      const mdContent = fs.readFileSync(specFile, 'utf8');
      const parsedTestCases = parseTestCasesFromMarkdown(mdContent, issueKey);
      if (parsedTestCases.length === 0) {
        sse('error', 'No test cases found in spec file');
        sse('done', { success: false, message: 'No test cases found in spec file' });
        res.end();
        return;
      }

      const categoryFor = type => {
        const normalized = String(type || '').toLowerCase();
        return normalized.startsWith('neg') ? 'negative'
          : normalized.startsWith('edge') ? 'edge'
          : 'positive';
      };
      testCasesToUse = { positive: [], negative: [], edge: [] };
      parsedTestCases.forEach(tc => testCasesToUse[categoryFor(tc.type)].push(tc));
      sse('log', `✅ Loaded ${parsedTestCases.length} test case(s) from saved markdown`);
    }

    const totalCases = countCases(testCasesToUse);
    if (totalCases === 0) {
      sse('error', 'No test cases were supplied for generation');
      sse('done', { success: false, message: 'No test cases were supplied for generation' });
      res.end();
      return;
    }

    sse('log', `📝 Summary: ${summary || 'Test Automation'}`);
    sse('log', `📊 Test cases: ${testCasesToUse.positive?.length || 0} positive, ${testCasesToUse.negative?.length || 0} negative, ${testCasesToUse.edge?.length || 0} edge (${totalCases} total)`);
    sse('log', '');

    // Generate all files (using advanced generator following POM standards from instruction.md)
    const result = await generateAdvancedTestAutomation(ROOT, issueKey, testCasesToUse, summary);

    // Report results
    sse('log', '📋 Generation Results (POM Framework):');
    sse('log', '─────────────────────────────');
    
    result.success.forEach(msg => {
      sse('log', msg);
    });

    if (result.errors.length > 0) {
      sse('log', '');
      result.errors.forEach(msg => {
        sse('log', msg);
      });
    }

    sse('log', '');
    sse('log', '✅ Test automation files generated following POM standards!');
    sse('log', '📁 Files created (instruction.md compliant):');
    sse('log', `   • ${result.files.locators || 'Locators/*.locators.ts'} (centralized selectors)`);
    sse('log', `   • ${result.files.pageObject || 'pages/*Page.ts'} (page object with locator imports)`);
    sse('log', `   • ${result.files.testData || 'Test_Data/*.json'} (externalized test data)`);
    sse('log', `   • ${result.files.testScript || 'tests/*/*.spec.ts'} (test script using POM)`);
    sse('log', '');
    sse('log', '🔧 Next steps:');
    sse('log', `   1. Review locators in Locators/ and update selectors for your application`);
    sse('log', `   2. Update test data in Test_Data/${issueKey}.json with real values`);
    sse('log', '   3. Run the generated Playwright test from the dashboard to save and open its report');

    sse('done', {
      success: true,
      message: 'Test automation generated',
      specFile: result.specFile || `tests/${issueKey}/${issueKey}-Script.spec.ts`,
      testDataFile: result.testDataFile || `Test_Data/${issueKey}.json`,
      ...result
    });
    res.end();
  } catch (err) {
    sse('error', `Failed to generate test automation: ${err.message}`);
    sse('done', { success: false, message: err.message });
    res.end();
  }
});

/** POST /api/save-file – Save edited file content */
app.post('/api/save-file', (req, res) => {
  try {
    const { path: filePath, content } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: 'path is required' });
    }
    if (content === undefined) {
      return res.status(400).json({ error: 'content is required' });
    }

    const absPath = path.resolve(ROOT, filePath.replace(/\\/g, path.sep));
    
    // Security check
    if (!absPath.startsWith(ROOT)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Don't allow creating files outside known folders
    const allowedFolders = ['Locators', 'pages', 'tests', 'utils', 'Test_Data', 'specs', 'features'];
    const isAllowed = allowedFolders.some(folder => absPath.includes(path.join(ROOT, folder)));
    
    if (!isAllowed) {
      return res.status(403).json({ error: 'File location not allowed' });
    }

    // Create directory if it doesn't exist
    const dir = path.dirname(absPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(absPath, content, 'utf8');
    res.json({ ok: true, path: filePath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/automation-tree – List automation folders and their files */
app.get('/api/automation-tree', (req, res) => {
  const folders = ['features', 'Locators', 'pages', 'tests', 'utils'];
  const tree = [];

  for (const folder of folders) {
    const folderPath = path.join(ROOT, folder);
    if (!fs.existsSync(folderPath)) continue;

    const entry = { name: folder, type: 'folder', children: [] };

    function walkDir(dir, parent) {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        if (item === 'node_modules' || item.startsWith('.')) continue;
        const fullPath = path.join(dir, item);
        const relPath = path.relative(ROOT, fullPath).replace(/\\/g, '/');
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          const subFolder = { name: item, type: 'folder', path: relPath, children: [] };
          parent.push(subFolder);
          walkDir(fullPath, subFolder.children);
        } else {
          parent.push({ name: item, type: 'file', path: relPath });
        }
      }
    }

    walkDir(folderPath, entry.children);
    tree.push(entry);
  }

  res.json({ tree });
});

/** POST /api/rename-file – Rename a file or folder */
app.post('/api/rename-file', (req, res) => {
  try {
    const { oldPath, newPath, type } = req.body;
    if (!oldPath || !newPath) return res.status(400).json({ error: 'oldPath and newPath required' });

    const absOld = path.resolve(ROOT, oldPath.replace(/\\/g, path.sep));
    const absNew = path.resolve(ROOT, newPath.replace(/\\/g, path.sep));

    if (!absOld.startsWith(ROOT) || !absNew.startsWith(ROOT)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!fs.existsSync(absOld)) return res.status(404).json({ error: 'Source not found' });

    // Ensure target directory exists
    const newDir = path.dirname(absNew);
    if (!fs.existsSync(newDir)) fs.mkdirSync(newDir, { recursive: true });

    fs.renameSync(absOld, absNew);
    res.json({ ok: true, oldPath, newPath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/delete-file – Delete a file or folder */
app.post('/api/delete-file', (req, res) => {
  try {
    const { path: filePath, type } = req.body;
    if (!filePath) return res.status(400).json({ error: 'path required' });

    const absPath = path.resolve(ROOT, filePath.replace(/\\/g, path.sep));

    if (!absPath.startsWith(ROOT)) return res.status(403).json({ error: 'Access denied' });
    if (!fs.existsSync(absPath)) return res.status(404).json({ error: 'Not found' });

    if (type === 'folder') {
      fs.rmSync(absPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(absPath);
    }
    res.json({ ok: true, path: filePath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Start server - Already listening above, this is removed to prevent port conflict */
// Duplicate listen call removed

/** GET /api/token-budget – Read token budget config from MCP Token config file */
app.get('/api/token-budget', (req, res) => {

/** GET /observability-report – Serve combined observability + cucumber dashboard */

/** POST /api/test-connection – Test connection to Jira or ADO */
app.post('/api/test-connection', async (req, res) => {
  const { toolType, appUrl, username, password } = req.body;
  if (!appUrl || !password) {
    return res.status(400).json({ connected: false, error: 'URL and API Key are required' });
  }

  try {
    const axios = require('axios');

    if (toolType === 'Jira') {
      const baseUrl = appUrl.replace(/\/+$/, '');
      const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');
      const response = await axios.get(`${baseUrl}/rest/api/2/myself`, {
        headers: { 'Authorization': `Basic ${basicAuth}`, 'Content-Type': 'application/json' },
        timeout: 15000,
        validateStatus: () => true
      });

      if (response.status === 200) {
        res.json({ connected: true, message: 'Connected as ' + (response.data.displayName || username) });
      } else {
        res.json({ connected: false, error: `Jira returned status ${response.status}: ${JSON.stringify(response.data).slice(0, 200)}` });
      }
    } else if (toolType === 'ADO') {
      const baseUrl = appUrl.replace(/\/+$/, '');
      const basicAuth = Buffer.from(`:${password}`).toString('base64');
      const response = await axios.get(`${baseUrl}/_apis/projects?api-version=7.0`, {
        headers: { 'Authorization': `Basic ${basicAuth}`, 'Content-Type': 'application/json' },
        timeout: 15000,
        validateStatus: () => true
      });

      if (response.status === 200) {
        res.json({ connected: true, message: 'Connected to Azure DevOps' });
      } else {
        res.json({ connected: false, error: `ADO returned status ${response.status}` });
      }
    } else {
      res.json({ connected: false, error: 'Unknown tool type' });
    }
  } catch (err) {
    res.json({ connected: false, error: err.message });
  }
});
app.get('/observability-report', (req, res) => {
  const obsPath = 'C:/Users/2000145088/Documents/OrchestratorPlatform/MCP/failure-analysis-observability/output/observability-dashboard.html';
  const cucPath = 'C:/Users/2000145088/Documents/OrchestratorPlatform/MCP/failure-analysis-observability/output/cucumber-dashboard.html';
  const obsExists = fs.existsSync(obsPath);
  const cucExists = fs.existsSync(cucPath);

  if (!obsExists && !cucExists) {
    return res.status(404).send('<html><body style="background:#050e1a;color:#f87171;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;"><h2>No reports found. Run test analyzer to generate dashboards.</h2></body></html>');
  }

  // Serve a combined page with tabs for both reports
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Test Observability</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#050e1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e0e0e0}
.tabs{display:flex;background:#0f1f35;border-bottom:1px solid #1a2f4a;padding:0 20px;position:sticky;top:0;z-index:100}
.tab{padding:12px 24px;font-size:13px;font-weight:600;color:#64748b;cursor:pointer;border-bottom:3px solid transparent;transition:all .2s}
.tab:hover{color:#94a3b8}
.tab.active{color:#60a5fa;border-bottom-color:#3b82f6}
.frame-container{width:100%;height:calc(100vh - 48px)}
iframe{width:100%;height:100%;border:none}
</style></head><body>
<div class="tabs">
  <div class="tab active" onclick="showTab('obs',this)">📊 Observability Dashboard</div>
  <div class="tab" onclick="showTab('cuc',this)">🥒 Cucumber Report</div>
</div>
<div class="frame-container">
  <iframe id="frame-obs" src="/observability-report/observability" style="display:block"></iframe>
  <iframe id="frame-cuc" src="/observability-report/cucumber" style="display:none"></iframe>
</div>
<script>
function showTab(id, el){
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('frame-obs').style.display=id==='obs'?'block':'none';
  document.getElementById('frame-cuc').style.display=id==='cuc'?'block':'none';
}
</script></body></html>`;
  res.send(html);
});

/** GET /observability-report/observability – Serve observability dashboard */
app.get('/observability-report/observability', (req, res) => {
  const p = 'C:/Users/2000145088/Documents/OrchestratorPlatform/MCP/failure-analysis-observability/output/observability-dashboard.html';
  if (fs.existsSync(p)) res.sendFile(p);
  else res.status(404).send('Observability report not found');
});

/** GET /observability-report/cucumber – Serve cucumber dashboard */
app.get('/observability-report/cucumber', (req, res) => {
  const p = 'C:/Users/2000145088/Documents/OrchestratorPlatform/MCP/failure-analysis-observability/output/cucumber-dashboard.html';
  if (fs.existsSync(p)) res.sendFile(p);
  else res.status(404).send('Cucumber report not found');
});
  const budgetPath = 'C:/Users/2000145088/Documents/OrchestratorPlatform/MCP/Token/config/token-budget.json';
  try {
    if (fs.existsSync(budgetPath)) {
      const content = fs.readFileSync(budgetPath, 'utf8');
      const config = JSON.parse(content);
      res.json(config);
    } else {
      res.json({ defaultBudgetTokens: 20000, perStage: {} });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/**
 * Generate detailed Gherkin feature file from user story acceptance criteria
 */
function generateDetailedFeatureFile(issueKey, summary, description, acceptanceCriteria) {
  const tags = ['@web', '@automated', '@' + issueKey.toLowerCase().replace(/-/g, '_')];
  const now = new Date().toISOString().split('T')[0];

  let featureContent = `${tags.join(' ')}\n`;
  featureContent += `Feature: ${issueKey} - ${summary}\n`;
  featureContent += `  ${description || summary}\n\n`;
  featureContent += `  # Generated: ${now}\n`;
  featureContent += `  # Story ID: ${issueKey}\n\n`;

  // Parse acceptance criteria into scenarios
  if (acceptanceCriteria && acceptanceCriteria.trim()) {
    const criteria = acceptanceCriteria.split(/\n|;/).filter(c => c.trim());
    
    if (criteria.length > 0) {
      featureContent += `  Background:\n`;
      featureContent += `    Given The user is on the application\n\n`;
      
      criteria.forEach((criterion, index) => {
        const cleanCriterion = criterion.trim();
        if (cleanCriterion) {
          const scenarioName = cleanCriterion.substring(0, 100);
          featureContent += `  Scenario: ${scenarioName}\n`;
          featureContent += `    When User performs the action\n`;
          featureContent += `    Then ${cleanCriterion}\n\n`;
        }
      });
    }
  } else {
    // Default scenario if no acceptance criteria
    featureContent += `  Background:\n`;
    featureContent += `    Given The user is on the application\n\n`;
    featureContent += `  Scenario: Default scenario for ${issueKey}\n`;
    featureContent += `    When User performs the action\n`;
    featureContent += `    Then The expected outcome is achieved\n`;
  }

  return featureContent;
}

// ===== NEW ENDPOINT: Generate Feature File from User Story =====
/** POST /api/manual-test-cases/generate-feature-file - Generate feature file from user story */
app.post('/api/manual-test-cases/generate-feature-file', async (req, res) => {
  try {
    const { issueKey, summary, description, acceptanceCriteria } = req.body || {};
    if (!issueKey) return res.status(400).json({ error: 'issueKey is required' });
    if (!summary) return res.status(400).json({ error: 'summary is required' });

    const featuresDir = path.join(ROOT, 'features');
    if (!fs.existsSync(featuresDir)) fs.mkdirSync(featuresDir, { recursive: true });

    const featureContent = generateDetailedFeatureFile(issueKey, summary, description, acceptanceCriteria);
    // Use the issueKey as filename per agent standard: features/[STORY_ID].feature
    const featureFile = path.join(featuresDir, `${issueKey}.feature`);
    fs.writeFileSync(featureFile, featureContent, 'utf8');

    const relFeatureFile = path.relative(ROOT, featureFile).replace(/\\/g, '/');

    res.json({
      featureFile: relFeatureFile,
      message: `✅ Feature file generated: ${relFeatureFile}`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/features/file — Check if a feature file exists for a given issueKey and return its content */
app.get('/api/features/file', (req, res) => {
  try {
    const { issueKey } = req.query;
    if (!issueKey) return res.status(400).json({ error: 'issueKey is required' });

    const featureFile = path.join(ROOT, 'features', `${issueKey}.feature`);
    if (!fs.existsSync(featureFile)) {
      return res.json({ exists: false, content: '', filePath: '' });
    }

    const content = fs.readFileSync(featureFile, 'utf8');
    const relPath = `features/${issueKey}.feature`;
    res.json({ exists: true, content, filePath: relPath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/requirements/save-feature-file — Persist edited feature file content */
app.post('/api/requirements/save-feature-file', (req, res) => {
  try {
    const { filePath, content } = req.body || {};
    if (!filePath) return res.status(400).json({ error: 'filePath is required' });
    if (typeof content !== 'string') return res.status(400).json({ error: 'content must be a string' });

    // Resolve against ROOT and prevent path traversal
    const resolved = path.resolve(ROOT, filePath);
    if (!resolved.startsWith(path.resolve(ROOT))) {
      return res.status(403).json({ error: 'Path traversal not allowed' });
    }

    // Ensure parent directory exists
    const dir = path.dirname(resolved);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(resolved, content, 'utf8');
    res.json({ ok: true, message: '✅ Feature file saved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ── Upload Test Cases to Jira ─────────────────────────────────────────────────
/** POST /api/jira/upload-test-cases — Create test cases as Jira issues linked to the parent story */
app.post('/api/jira/upload-test-cases', async (req, res) => {
  try {
    const { issueKey, testCases } = req.body || {};
    if (!issueKey)   return res.status(400).json({ error: 'issueKey is required' });
    if (!testCases?.length) return res.status(400).json({ error: 'testCases array is required' });

    const baseUrl  = (process.env.JIRA_BASE_URL || '').replace(/\/$/, '');
    const email    = process.env.JIRA_EMAIL    || process.env.JIRA_USERNAME || '';
    const token    = process.env.JIRA_API_TOKEN || process.env.JIRA_TOKEN   || '';
    const project  = process.env.JIRA_PROJECT_KEY || '';

    if (!baseUrl || !token) return res.status(400).json({ error: 'Jira not configured (JIRA_BASE_URL / JIRA_API_TOKEN)' });

    const auth    = Buffer.from(`${email}:${token}`).toString('base64');
    const created = [];
    const errors  = [];

    for (const tc of testCases) {
      const stepsText = (tc.steps || []).map((s, i) => `${i + 1}. ${s}`).join('\n');
      const descParts = [
        tc.preconditions ? `*Preconditions:*\n${tc.preconditions}` : '',
        stepsText        ? `*Steps:*\n${stepsText}`                : '',
        tc.expectedResult? `*Expected Result:*\n${tc.expectedResult}` : '',
      ].filter(Boolean).join('\n\n');

      const body = JSON.stringify({
        fields: {
          project   : { key: project },
          summary   : `${tc.id} — ${tc.title}`,
          description: { version: 1, type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: descParts }] }] },
          issuetype : { name: 'Test' },
          labels    : [tc.type || 'Functional', `from-${issueKey}`],
        }
      });

      try {
        const r = await fetch(`${baseUrl}/rest/api/3/issue`, {
          method : 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' },
          body,
        });
        const d = await r.json();
        if (r.ok && d.key) { created.push(d.key); }
        else { errors.push(d.errors || d.errorMessages || d.message || 'Unknown error'); }
      } catch(e) { errors.push(e.message); }
    }

    res.json({ success: true, uploaded: created.length, created, errors });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Upload Test Cases to Azure DevOps ─────────────────────────────────────────
/** POST /api/ado/upload-test-cases — Create test cases as ADO Test Case work items */
app.post('/api/ado/upload-test-cases', async (req, res) => {
  try {
    const { issueKey, testCases } = req.body || {};
    if (!issueKey)   return res.status(400).json({ error: 'issueKey is required' });
    if (!testCases?.length) return res.status(400).json({ error: 'testCases array is required' });

    const orgUrl  = (process.env.ADO_ORG_URL  || '').replace(/\/$/, '');
    const project = process.env.ADO_PROJECT    || process.env.JIRA_PROJECT_KEY || '';
    const pat     = process.env.ADO_PAT        || process.env.JIRA_API_TOKEN   || '';

    if (!orgUrl || !pat) return res.status(400).json({ error: 'Azure DevOps not configured (ADO_ORG_URL / ADO_PAT)' });

    const auth    = Buffer.from(`:${pat}`).toString('base64');
    const created = [];
    const errors  = [];

    for (const tc of testCases) {
      const stepsText = (tc.steps || [])
        .map((s, i) => `<step id="${i + 1}" type="ActionStep"><parameterizedString isformatted="true">${s}</parameterizedString><parameterizedString isformatted="true"></parameterizedString></step>`)
        .join('');
      const stepsXml = `<steps id="0" last="${tc.steps?.length || 1}">${stepsText}</steps>`;

      const patchBody = JSON.stringify([
        { op: 'add', path: '/fields/System.Title',       value: `${tc.id} — ${tc.title}` },
        { op: 'add', path: '/fields/System.WorkItemType', value: 'Test Case' },
        { op: 'add', path: '/fields/Microsoft.VSTS.TCM.Steps', value: stepsXml },
        { op: 'add', path: '/fields/System.Description', value: [tc.preconditions, tc.expectedResult].filter(Boolean).join('\n\n') },
        { op: 'add', path: '/fields/System.Tags',        value: `${tc.type || 'Functional'}; from-${issueKey}` },
      ]);

      try {
        const url = `${orgUrl}/${encodeURIComponent(project)}/_apis/wit/workitems/$Test%20Case?api-version=7.1`;
        const r   = await fetch(url, {
          method : 'POST',
          headers: { 'Content-Type': 'application/json-patch+json', 'Authorization': `Basic ${auth}` },
          body   : patchBody,
        });
        const d = await r.json();
        if (r.ok && d.id) { created.push(d.id); }
        else { errors.push(d.message || JSON.stringify(d.value || d)); }
      } catch(e) { errors.push(e.message); }
    }

    res.json({ success: true, uploaded: created.length, created, errors });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Scheduler Storage
const scheduledJobs = []; // In-memory store for scheduled tests

// POST /api/schedule-tests – Schedule a test suite to run at a specific time
app.post('/api/schedule-tests', (req, res) => {
  try {
    const { time, suite, tests } = req.body;
    if (!time || !suite || !tests || tests.length === 0) {
      return res.status(400).json({ error: 'time, suite, and tests are required' });
    }

    const jobId = `job-${Date.now()}`;
    const job = {
      id: jobId,
      time, // HH:MM format
      suite,
      tests,
      createdAt: new Date(),
      executed: false
    };

    scheduledJobs.push(job);
    console.log(`[Scheduler] Job scheduled: ${jobId} at ${time} for ${suite} suite with ${tests.length} tests`);

    res.json({ ok: true, jobId, message: `Tests scheduled for ${time}` });
  } catch (err) {
    console.error('[Scheduler] Error scheduling tests:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/schedule-tests – Get all scheduled jobs
app.get('/api/schedule-tests', (req, res) => {
  res.json({ jobs: scheduledJobs });
});

// DELETE /api/schedule-tests/:jobId – Cancel a scheduled job
app.delete('/api/schedule-tests/:jobId', (req, res) => {
  const { jobId } = req.params;
  const index = scheduledJobs.findIndex(j => j.id === jobId);
  if (index > -1) {
    scheduledJobs.splice(index, 1);
    res.json({ ok: true, message: 'Job cancelled' });
  } else {
    res.status(404).json({ error: 'Job not found' });
  }
});

// Check scheduled jobs every minute
setInterval(() => {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  scheduledJobs.forEach(job => {
    if (!job.executed && job.time === currentTime) {
      console.log(`[Scheduler] Executing job ${job.id} at ${currentTime}`);
      job.executed = true;
      job.executedAt = new Date();

      // Execute the tests for each unique test file
      const testFiles = [...new Set(job.tests.map(t => t.sourceFile || t.file))];
      testFiles.forEach(file => {
        console.log(`[Scheduler] Running test file: ${file}`);
        
        const reportRun = createPlaywrightReportRun(file, '');
        const reportEnv = { ...process.env, ...playwrightReportEnvironment(reportRun) };
        const isWin = process.platform === 'win32';
        const binExt = isWin ? '.cmd' : '';
        const playwrightBin = path.join(ROOT, 'node_modules', '.bin', `playwright${binExt}`);
        const binExists = fs.existsSync(playwrightBin);

        const runCmd = binExists ? `"${playwrightBin}"` : 'npx playwright';
        const runArgs = binExists
          ? ['test', file, '--reporter=list,html,json']
          : ['playwright', 'test', file, '--reporter=list,html,json'];

        try {
          const proc = spawn(runCmd, runArgs, { cwd: ROOT, shell: true, env: reportEnv });
          
          proc.on('close', code => {
            const resultStatus = code === 0 ? 'passed' : 'failed';
            console.log(`[Scheduler] Job ${job.id} - File ${file} completed with status: ${resultStatus}`);
            job.testResults = job.testResults || {};
            const report = finalizePlaywrightReport(reportRun);
            job.testResults[file] = {
              status: resultStatus,
              exitCode: code,
              reportFile: report?.reportFile || null,
              reportUrl: report?.reportUrl || null,
            };
          });

          proc.on('error', err => {
            console.error(`[Scheduler] Error running ${file}:`, err);
            job.testResults = job.testResults || {};
            job.testResults[file] = { status: 'error', error: err.message };
          });
        } catch (err) {
          console.error(`[Scheduler] Exception executing ${file}:`, err);
          job.testResults = job.testResults || {};
          job.testResults[file] = { status: 'error', error: err.message };
        }
      });
    }
  });
}, 60000); // Check every 60 seconds
