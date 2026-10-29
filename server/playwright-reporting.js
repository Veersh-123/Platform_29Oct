'use strict';

const fs = require('fs');
const path = require('path');

const PLAYWRIGHT_REPORTS_DIR = path.resolve(__dirname, '..', 'playwright-reports');

function safeReportToken(value, fallback) {
  const token = String(value || '').replace(/[^a-zA-Z0-9-]+/g, '_').replace(/^_+|_+$/g, '');
  return token || fallback;
}

function createPlaywrightReportRun(file, testName) {
  const normalizedFile = String(file || '').replace(/\\/g, '/');
  const basename = path.posix.basename(normalizedFile).replace(/\.spec\.[^.]+$/i, '');
  const testCaseMatch = `${testName || ''} ${normalizedFile}`.match(/\b(TC[_-](?:[A-Z]\d+|\d+))\b/i);
  const storyFromTest = String(testName || '').match(/^([A-Z][A-Z0-9-]*)[-_ ]+TC[_-]/i)?.[1];
  const storyFromFile = basename.replace(/[-_](?:Script|Tests?)$/i, '');
  const directories = normalizedFile.split('/').filter(Boolean);
  let storyFromDirectory = directories.length > 1 ? directories[directories.length - 2] : '';
  if (storyFromDirectory.toLowerCase() === 'localhost' && directories.length > 2) {
    storyFromDirectory = directories[directories.length - 3];
  }
  const story = safeReportToken(storyFromTest || storyFromFile || storyFromDirectory, 'Story');
  const testCase = safeReportToken(testCaseMatch?.[1]?.replace('-', '_').toUpperCase(), 'AllTests');
  const now = new Date();
  const dateTime = [
    String(now.getDate()).padStart(2, '0'),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getFullYear()).slice(-2),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
  ].join('-');
  const reportFile = `${story}_${testCase}_${dateTime}.html`;
  const runId = `${path.basename(reportFile, '.html')}-${now.getTime()}`;
  const reportDir = path.join(PLAYWRIGHT_REPORTS_DIR, runId);
  fs.mkdirSync(reportDir, { recursive: true });

  return {
    reportDir,
    reportFile,
    runId,
    startedAt: now.toISOString(),
    jsonOutput: path.join(reportDir, 'playwright-results.json'),
    reportUrl: `/playwright-reports/${encodeURIComponent(runId)}/${encodeURIComponent(reportFile)}`,
  };
}

function playwrightReportEnvironment(reportRun) {
  return {
    PLAYWRIGHT_HTML_OUTPUT_DIR: reportRun.reportDir,
    PLAYWRIGHT_HTML_OPEN: 'never',
    PLAYWRIGHT_JSON_OUTPUT_NAME: reportRun.jsonOutput,
  };
}

function summarizePlaywrightJson(reportPath) {
  if (!fs.existsSync(reportPath)) return null;
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const cases = [];

  function visitSuites(suites) {
    for (const suite of suites || []) {
      const parents = suite.title ? [suite.title] : [];
      for (const spec of suite.specs || []) {
        for (const test of spec.tests || []) {
          const lastResult = test.results?.[test.results.length - 1];
          const status = test.status === 'skipped' || lastResult?.status === 'skipped'
            ? 'skipped'
            : test.status === 'unexpected' || ['failed', 'timedOut', 'interrupted'].includes(lastResult?.status)
              ? 'failed'
              : 'passed';
          cases.push({
            name: [...parents, spec.title, test.title].filter(Boolean).join(' › '),
            status,
            time: (lastResult?.duration || 0) / 1000,
            failureMessage: lastResult?.errors?.map(error => error.message).filter(Boolean).join('\n') || null,
          });
        }
      }
      visitSuites(suite.suites);
    }
  }

  visitSuites(report.suites);
  return {
    total: cases.length,
    passed: cases.filter(test => test.status === 'passed').length,
    failed: cases.filter(test => test.status === 'failed').length,
    skipped: cases.filter(test => test.status === 'skipped').length,
    cases,
  };
}

function finalizePlaywrightReport(reportRun, counts = {}) {
  const reportIndex = path.join(reportRun.reportDir, 'index.html');
  if (!fs.existsSync(reportIndex)) {
    console.error(`[PLAYWRIGHT-REPORT] HTML report was not generated at ${reportIndex}`);
    return null;
  }

  fs.copyFileSync(reportIndex, path.join(reportRun.reportDir, reportRun.reportFile));
  let summary = null;
  try {
    summary = summarizePlaywrightJson(reportRun.jsonOutput);
  } catch (error) {
    console.error(`[PLAYWRIGHT-REPORT] Could not parse JSON results: ${error.message}`);
  }
  if (!summary) {
    const total = Number(counts.passed || 0) + Number(counts.failed || 0) + Number(counts.skipped || 0);
    summary = { total, passed: Number(counts.passed || 0), failed: Number(counts.failed || 0), skipped: Number(counts.skipped || 0), cases: [] };
  }

  const suiteName = path.basename(reportRun.reportFile, '.html');
  const savedSummary = {
    ...summary,
    suites: [{
      name: suiteName,
      tests: summary.total,
      failures: summary.failed,
      skipped: summary.skipped,
      time: Math.max(0, (Date.now() - Date.parse(reportRun.startedAt)) / 1000),
      cases: summary.cases,
    }],
    lastRun: Date.now(),
    startedAt: reportRun.startedAt,
    reportFile: reportRun.reportFile,
    reportUrl: reportRun.reportUrl,
  };
  fs.writeFileSync(path.join(reportRun.reportDir, 'summary.json'), JSON.stringify(savedSummary, null, 2), 'utf8');
  return { reportFile: reportRun.reportFile, reportUrl: reportRun.reportUrl, summary: savedSummary };
}

function parsePlaywrightResults() {
  if (!fs.existsSync(PLAYWRIGHT_REPORTS_DIR)) return null;
  const summaries = [];
  for (const entry of fs.readdirSync(PLAYWRIGHT_REPORTS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const summaryPath = path.join(PLAYWRIGHT_REPORTS_DIR, entry.name, 'summary.json');
    if (!fs.existsSync(summaryPath)) continue;
    try { summaries.push(JSON.parse(fs.readFileSync(summaryPath, 'utf8'))); }
    catch (error) { console.error(`[PLAYWRIGHT-REPORT] Could not read ${summaryPath}: ${error.message}`); }
  }
  return summaries.sort((a, b) => (b.lastRun || 0) - (a.lastRun || 0))[0] || null;
}

module.exports = {
  PLAYWRIGHT_REPORTS_DIR,
  createPlaywrightReportRun,
  finalizePlaywrightReport,
  parsePlaywrightResults,
  playwrightReportEnvironment,
};
