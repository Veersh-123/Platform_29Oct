'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const MAX_SOURCE_FILES = 40;
const PREVIOUS_SOURCE_MARKER = '// --- Previous version preserved by Dry Run repair ---';
const ACTIVE_SOURCE_MARKER = '// --- Active repaired version ---';

function preservePreviousSource(original, candidate) {
  const activeMarker = original.lastIndexOf(ACTIVE_SOURCE_MARKER);
  const previousActiveSource = activeMarker >= 0
    ? original.slice(activeMarker + ACTIVE_SOURCE_MARKER.length).replace(/^\r?\n/, '')
    : original;
  const commentedOriginal = previousActiveSource.split(/\r?\n/)
    .map(line => line ? `// ${line}` : '//')
    .join('\n');
  const result = `${PREVIOUS_SOURCE_MARKER}\n${commentedOriginal}\n${ACTIVE_SOURCE_MARKER}\n${candidate}`;
  if (result.length > 200000) {
    throw new Error('Preserving the previous source would exceed the 200 KB file limit.');
  }
  return result;
}

function writeRepairs(repairs, expectedContents) {
  for (const item of repairs) {
    const original = expectedContents.get(item.absolutePath);
    if (original === undefined || fs.readFileSync(item.absolutePath, 'utf8') !== original) {
      throw new Error(`The file changed during repair analysis; refusing to overwrite it: ${item.file}`);
    }
  }
  for (const item of repairs) {
    fs.writeFileSync(item.absolutePath, item.content, 'utf8');
  }
}

function resolveSupportingRepairs(root, sources, updatedFiles) {
  if (updatedFiles === undefined) return [];
  if (!Array.isArray(updatedFiles)) {
    throw new Error('The AI repair updatedFiles field must be an array.');
  }
  const importedFiles = new Set(sources.map(source => source.file.replace(/\\/g, '/')));
  const repairs = [];
  const seen = new Set();

  for (const update of updatedFiles) {
    if (!update || typeof update.file !== 'string' || typeof update.content !== 'string') {
      throw new Error('Each supporting-file repair must include a file path and complete content.');
    }
    const relativeFile = update.file.replace(/\\/g, '/').replace(/^\.\//, '');
    if (!importedFiles.has(relativeFile)) {
      throw new Error(`The repair attempted to update a file that is not imported by this test: ${relativeFile}`);
    }
    if (!/\.(?:ts|tsx|js|jsx|mjs|cjs)$/i.test(relativeFile) || /\.spec\.(?:ts|js)$/i.test(relativeFile)) {
      throw new Error(`Only imported JavaScript or TypeScript support files may be updated: ${relativeFile}`);
    }
    if (seen.has(relativeFile.toLowerCase())) {
      throw new Error(`The repair returned the same supporting file more than once: ${relativeFile}`);
    }
    if (!update.content.trim() || update.content.length > 100000) {
      throw new Error(`The repaired supporting file is empty or exceeds the 100 KB safety limit: ${relativeFile}`);
    }

    const absolutePath = path.resolve(root, relativeFile);
    const relativePath = path.relative(root, absolutePath);
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      throw new Error('A supporting-file repair path must stay inside the workspace.');
    }
    const original = sources.find(source => source.file.replace(/\\/g, '/') === relativeFile);
    if (!original || update.content === original.content) {
      throw new Error(`The repair did not change the imported supporting file: ${relativeFile}`);
    }
    let content = update.content;
    if (/(?:^|[/_-])locators?(?:[/_.-]|$)/i.test(relativeFile)) {
      const propertyPattern = /^(\s*)([A-Za-z_$][\w$]*)\s*:\s*(.+?)(,?)\s*$/;
      const originalProperties = new Map();
      for (const line of original.content.split(/\r?\n/)) {
        const match = line.match(propertyPattern);
        if (match) originalProperties.set(match[2], `${match[3].trim()}${match[4]}`);
      }

      const updatedLines = content.split(/\r?\n/);
      const preservedComments = [];
      for (let index = 0; index < updatedLines.length; index++) {
        const match = updatedLines[index].match(propertyPattern);
        if (!match) continue;
        const previousValue = originalProperties.get(match[2]);
        const updatedValue = `${match[3].trim()}${match[4]}`;
        if (!previousValue || previousValue === updatedValue) continue;

        const commentedOldValue = `${match[1]}// ${match[2]}: ${previousValue}`;
        if (updatedLines[index - 1]?.trim() === commentedOldValue.trim()) continue;
        preservedComments.push({ index, line: commentedOldValue });
      }
      for (const comment of preservedComments.reverse()) {
        updatedLines.splice(comment.index, 0, comment.line);
      }
      content = updatedLines.join('\n');
    } else {
      content = preservePreviousSource(original.content, content);
    }
    seen.add(relativeFile.toLowerCase());
    repairs.push({ file: relativeFile, absolutePath, content });
  }
  return repairs;
}

function resolveSpecPath(root, file) {
  if (typeof file !== 'string' || !file.trim()) {
    throw new Error('A test spec file is required.');
  }

  const specPath = path.resolve(root, file);
  const relativePath = path.relative(path.resolve(root), specPath);
  if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error('Only test spec files inside the workspace can be repaired.');
  }
  if (!/\.spec\.(?:ts|js)$/i.test(specPath)) {
    throw new Error('Only Playwright .spec.ts and .spec.js files can be repaired.');
  }
  if (relativePath.split(path.sep).some(part => ['node_modules', 'test-results', 'playwright-reports'].includes(part.toLowerCase()))) {
    throw new Error('Test specs inside generated or dependency directories cannot be repaired.');
  }
  if (!fs.existsSync(specPath) || !fs.statSync(specPath).isFile()) {
    throw new Error(`Test spec file does not exist: ${file}`);
  }
  return specPath;
}

function readPlaywrightFailureContext(root, reportsRoot, runId, file, testName) {
  if (typeof runId !== 'string' || !/^[\w-]+$/.test(runId)) {
    throw new Error('A valid Playwright run ID is required to read failure context.');
  }

  const reportDirectory = path.resolve(reportsRoot, runId);
  const reportRelativePath = path.relative(path.resolve(reportsRoot), reportDirectory);
  if (!reportRelativePath || reportRelativePath.startsWith('..') || path.isAbsolute(reportRelativePath)) {
    throw new Error('The Playwright report path is outside the reports directory.');
  }
  const reportPath = path.join(reportDirectory, 'playwright-results.json');
  if (!fs.existsSync(reportPath) || !fs.statSync(reportPath).isFile()) return '';

  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const requestedFile = String(file || '').replace(/\\/g, '/').replace(/^\.\//, '').toLowerCase();
  const matchingAttachments = [];
  function visitSuites(suites) {
    for (const suite of suites || []) {
      const suiteFile = String(suite.title || '').replace(/\\/g, '/').toLowerCase();
      for (const spec of suite.specs || []) {
        const fullName = [suite.title, spec.title].filter(Boolean).join(' › ');
        if (testName && spec.title !== testName && fullName !== testName) continue;
        const requestedFromTestDir = requestedFile.replace(/^tests\//, '');
        const requestedBasename = path.posix.basename(requestedFile);
        if (requestedFile && suiteFile
          && !suiteFile.endsWith(requestedFile)
          && !suiteFile.endsWith(requestedFromTestDir)
          && !suiteFile.endsWith(requestedBasename)) continue;
        for (const test of spec.tests || []) {
          if (test.status !== 'unexpected') continue;
          const result = [...(test.results || [])].reverse().find(item => item.status === 'failed');
          const attachment = result?.attachments?.find(item => item.name === 'error-context' && typeof item.path === 'string');
          if (attachment) matchingAttachments.push(attachment.path);
        }
      }
      visitSuites(suite.suites);
    }
  }
  visitSuites(report.suites);

  if (matchingAttachments.length !== 1) return '';
  const attachmentPath = path.resolve(matchingAttachments[0]);
  const attachmentRelativePath = path.relative(path.resolve(root), attachmentPath);
  if (attachmentRelativePath.startsWith('..') || path.isAbsolute(attachmentRelativePath)
    || path.basename(attachmentPath).toLowerCase() !== 'error-context.md'
    || !fs.existsSync(attachmentPath) || !fs.statSync(attachmentPath).isFile()) {
    throw new Error('The Playwright failure attachment is outside the workspace or is not an error-context file.');
  }
  if (fs.statSync(attachmentPath).size > 100000) {
    throw new Error('The Playwright failure context exceeds the 100 KB safety limit.');
  }
  return fs.readFileSync(attachmentPath, 'utf8');
}

function extractTestCaseFlow(source, testName) {
  const declarations = [...source.matchAll(/\btest(?:\.(?:only|skip))?\s*\(\s*(['"`])([^'"`]+)\1/g)];
  const selected = testName
    ? declarations.filter(match => match[2] === testName)
    : declarations;

  if (testName && selected.length !== 1) return null;

  return selected.map(declaration => {
    const nextDeclaration = declarations.find(match => match.index > declaration.index);
    const block = source.slice(declaration.index, nextDeclaration?.index ?? source.length);
    const steps = [...block.matchAll(/\btest\.step\s*\(\s*(['"`])([^'"`]+)\1/g)]
      .map(match => match[2]);
    return { name: declaration[2], steps };
  });
}

function resolveLocalImport(root, sourcePath, importPath) {
  if (!importPath.startsWith('.')) return null;
  const basePath = path.resolve(path.dirname(sourcePath), importPath);
  const candidates = path.extname(basePath)
    ? /\.(?:ts|tsx|js|jsx|mjs|cjs)$/i.test(basePath) ? [basePath] : []
    : ['.ts', '.tsx', '.js', '.jsx', '.mjs'].map(extension => `${basePath}${extension}`)
      .concat(path.join(basePath, 'index.ts'), path.join(basePath, 'index.js'));
  for (const candidate of candidates) {
    const relativePath = path.relative(root, candidate);
    if (!relativePath.startsWith('..') && !path.isAbsolute(relativePath)
      && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

function collectAutomationSources(root, specPath) {
  const sources = [];
  const pending = [specPath];
  const seen = new Set();

  while (pending.length && sources.length < MAX_SOURCE_FILES) {
    const sourcePath = pending.shift();
    if (seen.has(sourcePath)) continue;
    seen.add(sourcePath);
    const content = fs.readFileSync(sourcePath, 'utf8');
    sources.push({ file: path.relative(root, sourcePath).replace(/\\/g, '/'), content });

    const imports = content.matchAll(/(?:from\s*|require\s*\()\s*['"]([^'"]+)['"]/g);
    for (const match of imports) {
      const localPath = resolveLocalImport(root, sourcePath, match[1]);
      if (localPath && !seen.has(localPath)) pending.push(localPath);
    }
  }
  if (sources.length >= MAX_SOURCE_FILES && pending.some(sourcePath => !seen.has(sourcePath))) {
    throw new Error(`The test imports more than ${MAX_SOURCE_FILES} local source files; no partial repair workspace was created.`);
  }
  return sources;
}

function isWebUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}

function resolveInspectionUrl(root, sources, env = process.env) {
  const configuredUrl = env.BASE_URL || env.APP_URL || env.TEST_APP_URL;
  if (configuredUrl) {
    if (!isWebUrl(configuredUrl)) {
      throw new Error('BASE_URL, APP_URL, or TEST_APP_URL must be a valid http:// or https:// URL without credentials.');
    }
    return configuredUrl;
  }

  for (const source of sources) {
    const matches = source.content.matchAll(/\.goto\s*\(\s*(['"`])(https?:\/\/[^'"`]+)\1/g);
    for (const match of matches) {
      if (isWebUrl(match[2])) return match[2];
    }
  }

  // Page objects often keep the application URL in a field, for example
  // `private readonly baseUrl = 'https://...'` or `const baseUrl = "https://..."`.
  for (const source of sources) {
    const matches = source.content.matchAll(/\bbase_?[Uu]rl\b\s*(?::\s*[^=\n]+)?=\s*(['"`])(https?:\/\/[^'"`]+)\1/g);
    for (const match of matches) {
      if (isWebUrl(match[2])) return match[2];
    }
  }

  const configPath = path.join(root, 'playwright.config.ts');
  if (fs.existsSync(configPath)) {
    const config = fs.readFileSync(configPath, 'utf8');
    const configuredBaseUrl = config.match(/\bbaseURL\s*:\s*(['"`])(https?:\/\/[^'"`]+)\1/);
    if (configuredBaseUrl && isWebUrl(configuredBaseUrl[2])) return configuredBaseUrl[2];
  }
  throw new Error('Could not determine the application URL. Set BASE_URL or add a page.goto("https://...") entry point to the test page object.');
}

async function inspectApplication(url, options = {}) {
  const browser = await chromium.launch({ headless: process.env.HEALER_HEADLESS !== 'false' });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.setDefaultNavigationTimeout(20000);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    try {
      await page.waitForLoadState('networkidle', { timeout: 3000 });
    } catch (error) {
      if (error.name !== 'TimeoutError') throw error;
    }
    const readSnapshot = targetPage => targetPage.evaluate(hints => {
      const visible = element => {
        const style = getComputedStyle(element);
        const bounds = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden'
          && bounds.width > 0 && bounds.height > 0;
      };
      const label = element => element.getAttribute('aria-label')
        || element.getAttribute('placeholder')
        || element.getAttribute('title')
        || element.innerText
        || element.textContent
        || element.getAttribute('name')
        || element.id
        || '';
      const safeHref = element => {
        if (!element.href) return '';
        const href = new URL(element.href);
        href.username = '';
        href.password = '';
        href.hash = '';
        for (const key of [...href.searchParams.keys()]) {
          if (/token|secret|password|passwd|auth|session|code|key/i.test(key)) {
            href.searchParams.set(key, '[redacted]');
          }
        }
        return href.toString();
      };
      const controls = [...document.querySelectorAll(
        'button, a[href], input:not([type="hidden"]), select, textarea, [role="button"], [role="tab"], [onclick], [tabindex]'
      )].filter(visible).slice(0, 100).map(element => ({
        tag: element.tagName.toLowerCase(),
        type: element.getAttribute('type') || element.getAttribute('role') || '',
        label: label(element).replace(/\s+/g, ' ').trim().slice(0, 120),
        id: element.id || '',
        name: element.getAttribute('name') || '',
        testId: element.getAttribute('data-testid') || '',
        role: element.getAttribute('role') || '',
        cursor: getComputedStyle(element).cursor,
        tabIndex: element.getAttribute('tabindex') || '',
        hasClickHandler: typeof element.onclick === 'function' || element.hasAttribute('onclick'),
        href: safeHref(element),
        target: element.getAttribute('target') || '',
        rel: element.getAttribute('rel') || '',
      }));
      const currentUrl = new URL(location.href);
      currentUrl.username = '';
      currentUrl.password = '';
      currentUrl.hash = '';
      for (const key of [...currentUrl.searchParams.keys()]) {
        if (/token|secret|password|passwd|auth|session|code|key/i.test(key)) {
          currentUrl.searchParams.set(key, '[redacted]');
        }
      }
      return {
        title: document.title,
        url: currentUrl.toString(),
        headings: [...document.querySelectorAll('h1, h2, h3')].filter(visible)
          .map(element => element.innerText.trim()).filter(Boolean).slice(0, 30),
        controls,
        hintedElements: hints.flatMap(hint => [...document.querySelectorAll('body *')]
          .filter(element => element.children.length === 0
            && (element.textContent || '').trim().toLowerCase().includes(hint.toLowerCase()))
          .slice(0, 10)
          .map(element => {
            const bounds = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            const actionableCandidates = [];
            for (let candidate = element, depth = 0; candidate && depth < 6; candidate = candidate.parentElement, depth++) {
              const candidateStyle = getComputedStyle(candidate);
              const candidateBounds = candidate.getBoundingClientRect();
              const visibleCandidate = candidateStyle.display !== 'none'
                && candidateStyle.visibility !== 'hidden'
                && candidateBounds.width > 0 && candidateBounds.height > 0;
              const hasClickHandler = typeof candidate.onclick === 'function' || candidate.hasAttribute('onclick');
              const isActionable = visibleCandidate && (
                ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'].includes(candidate.tagName)
                || ['button', 'option', 'menuitem', 'tab'].includes(candidate.getAttribute('role'))
                || hasClickHandler
                || candidate.hasAttribute('tabindex')
                || candidateStyle.cursor === 'pointer'
              );
              if (!isActionable) continue;
              actionableCandidates.push({
                tag: candidate.tagName.toLowerCase(),
                id: candidate.id || '',
                className: typeof candidate.className === 'string' ? candidate.className.slice(0, 160) : '',
                role: candidate.getAttribute('role') || '',
                label: label(candidate).replace(/\s+/g, ' ').trim().slice(0, 120),
                cursor: candidateStyle.cursor,
                tabIndex: candidate.getAttribute('tabindex') || '',
                hasClickHandler,
                testId: candidate.getAttribute('data-testid') || '',
                depth,
              });
            }
            return {
              hint,
              tag: element.tagName.toLowerCase(),
              text: (element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120),
              id: element.id || '',
              className: typeof element.className === 'string' ? element.className.slice(0, 120) : '',
              visible: style.display !== 'none' && style.visibility !== 'hidden'
                && bounds.width > 0 && bounds.height > 0,
              display: style.display,
              actionableCandidates,
            };
          })),
      };
    }, options.hints || []);

    const snapshot = await readSnapshot(page);
    if (options.probePopup) {
      const applyNow = page.getByRole('link', { name: /apply now/i }).first();
      if (!(await applyNow.count())) {
        snapshot.popupProbe = { opened: false, reason: 'No visible Apply Now link was found on the inspected page.' };
      } else {
        const target = await applyNow.getAttribute('target');
        if (target?.toLowerCase() !== '_blank') {
          snapshot.popupProbe = {
            opened: false,
            target: target || '',
            reason: 'The Apply Now link is not configured to open a separate tab; it was not clicked during inspection.',
          };
        } else {
          try {
            const [popup] = await Promise.all([
              page.waitForEvent('popup', { timeout: 10000 }),
              applyNow.click({ timeout: 10000 }),
            ]);
            try {
              await popup.waitForLoadState('domcontentloaded', { timeout: 20000 });
            } catch (error) {
              if (error.name !== 'TimeoutError') throw error;
            }
            snapshot.popupProbe = {
              opened: true,
              page: await readSnapshot(popup),
            };
            await popup.close();
          } catch (error) {
            snapshot.popupProbe = {
              opened: false,
              target,
              reason: error.message.slice(0, 500),
            };
          }
        }
      }
    }
    return snapshot;
  } finally {
    await browser.close();
  }
}

function redactScriptSecrets(source) {
  const secrets = [];
  const script = source.replace(
    /((?:['"]?(?:password|passwd|token|api[_-]?key|secret|authorization|email|phone|ssn|social.?security|birth|dob|address|account|username)['"]?)\s*[:=]\s*)(['"`])([^'"`]*)\2/gi,
    (match, assignment, quote, value) => {
      const marker = `__SCRIPT_REPAIR_SECRET_${secrets.length}__`;
      secrets.push({ marker, literal: `${quote}${value}${quote}` });
      return `${assignment}${quote}${marker}${quote}`;
    },
  );
  return { script, secrets };
}

function redactFailureEvidence(source) {
  return redactScriptSecrets(String(source || ''))
    .script
    .replace(/(\bvalue\s*=\s*)(["'])(.*?)\2/gi, '$1$2[REDACTED]$2')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED_EMAIL]')
    .replace(/\b(?:\+?\d[\d .()-]{7,}\d)\b/g, '[REDACTED_NUMBER]')
    .replace(/([?&](?:token|api[_-]?key|secret|password|authorization)=)[^&#\s]+/gi, '$1[REDACTED]');
}

function restoreScriptSecrets(candidate, secrets) {
  let restored = candidate;
  for (const { marker, literal } of secrets) {
    const quotedMarkers = [`'${marker}'`, `"${marker}"`, `\`${marker}\``];
    const replacement = quotedMarkers.find(value => restored.includes(value));
    if (!replacement) {
      throw new Error('The AI repair did not preserve a redacted secret placeholder.');
    }
    restored = restored.replace(replacement, literal);
  }
  return restored;
}

function parseRepairResponse(response) {
  const text = String(response || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('The AI repair response did not contain a JSON object.');
  let parsed;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch (error) {
    throw new Error(`The AI repair response was not valid JSON: ${error.message}`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('The AI repair response must be a JSON object.');
  }
  return parsed;
}

function isAccessDeniedPopup(snapshot) {
  const popup = snapshot?.popupProbe?.page;
  return Boolean(snapshot?.popupProbe?.opened && popup
    && /access denied|access forbidden|not authorized|request blocked/i.test(
      [popup.title, ...(popup.headings || [])].join(' '),
    ));
}

function isBlockedApplication(snapshot) {
  return /sorry, you have been blocked|you are unable to access|attention required\s*\|\s*cloudflare/i.test(
    [snapshot?.title, ...(snapshot?.headings || [])].filter(Boolean).join(' '),
  );
}

function validateRepair(original, candidate) {
  if (typeof candidate !== 'string' || !candidate.trim()) {
    throw new Error('The AI repair response did not include an updatedScript.');
  }
  if (candidate === original) throw new Error('The AI repair did not change the test script.');

  const testNames = source => [...source.matchAll(/\btest(?:\.only|\.skip)?\s*\(\s*(['"`])([^'"`]+)\1/g)]
    .map(match => match[2]).sort();
  if (JSON.stringify(testNames(original)) !== JSON.stringify(testNames(candidate))) {
    throw new Error('The repair changed the test case names; the original test cases must be preserved.');
  }

  const assertionCount = source => (source.match(/\bexpect\s*\(|\bassert\.(?:strictEqual|deepStrictEqual|ok|equal|notEqual)\s*\(/g) || []).length;
  if (assertionCount(candidate) < assertionCount(original)) {
    throw new Error('The repair removed test assertions; test expectations must be preserved.');
  }
}

module.exports = {
  collectAutomationSources,
  extractTestCaseFlow,
  inspectApplication,
  isAccessDeniedPopup,
  isBlockedApplication,
  parseRepairResponse,
  readPlaywrightFailureContext,
  preservePreviousSource,
  redactScriptSecrets,
  redactFailureEvidence,
  resolveSupportingRepairs,
  restoreScriptSecrets,
  resolveInspectionUrl,
  resolveSpecPath,
  validateRepair,
  writeRepairs,
};
