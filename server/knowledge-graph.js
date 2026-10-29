'use strict';

const { chromium } = require('playwright');

const MAX_PAGES = 20;
const MAX_ELEMENTS_PER_PAGE = 100;
const MAX_LINKS_PER_PAGE = 50;

function parseExploreInput(input) {
  if (typeof input !== 'string' || !input.trim()) {
    throw new Error('Enter an application URL to explore.');
  }

  const fields = input.split('|').map(value => value.trim());
  if (fields.length !== 1 && fields.length !== 3) {
    throw new Error('For sign-in, use: app URL | username | password.');
  }

  const rawUrl = fields[0];
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('Enter a valid application URL using http:// or https://.');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Only http:// and https:// application URLs are supported.');
  }
  if (url.username || url.password) {
    throw new Error('Do not put credentials in the URL. Use app URL | username | password.');
  }
  if (fields.length === 3 && (!fields[1] || !fields[2])) {
    throw new Error('Both username and password are required after the pipe symbols.');
  }

  url.hash = '';
  return {
    url: url.toString(),
    username: fields.length === 3 ? fields[1] : null,
    password: fields.length === 3 ? fields[2] : null,
    authenticationRequired: fields.length === 3,
  };
}

function sanitizeUrl(value) {
  const url = new URL(value);
  url.username = '';
  url.password = '';
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) {
    if (/token|secret|password|passwd|auth|session|code|key/i.test(key)) {
      url.searchParams.set(key, '[redacted]');
    }
  }
  return url.toString();
}

function normalizePageUrl(value) {
  const url = new URL(value);
  url.username = '';
  url.password = '';
  url.hash = '';
  return url.toString();
}

function toMarkdownList(items, format) {
  return items.length ? items.map(item => `- ${format(item)}`).join('\n') : '- None identified';
}

function formatKnowledgeGraphMarkdown(graph) {
  const pages = Array.isArray(graph.pages) ? graph.pages : [];
  const edges = Array.isArray(graph.edges) ? graph.edges : [];
  const businessFlows = Array.isArray(graph.businessFlows) ? graph.businessFlows : [];

  const pageSections = pages.map((page, index) => {
    const components = page.components || [];
    const elements = page.elements || [];
    const actions = page.actions || [];
    const forms = page.forms || [];
    const formDetails = forms.length
      ? forms.map(form => [
        `### Form: ${form.name}`,
        '',
        '**Fields**',
        toMarkdownList(form.fields || [], field =>
          `${field.label || field.type} (${field.type}${field.required ? ', required' : ''})`),
        '',
        '**Submit actions**',
        toMarkdownList(form.submitActions || [], action => action),
      ].join('\n')).join('\n\n')
      : 'No forms identified.';

    return [
      `## ${index + 1}. ${page.title || new URL(page.url).pathname || page.url}`,
      '',
      `- URL: ${page.url}`,
      '',
      '### Headings',
      toMarkdownList(page.headings || [], heading => heading),
      '',
      '### Components',
      toMarkdownList(components, component =>
        `${component.type}${component.name ? ` — ${component.name}` : ''}`),
      '',
      '### Interactive elements',
      toMarkdownList(elements, element =>
        `${element.label || element.tag} — \`${element.locator || element.tag}\` (${element.type || element.tag}${element.required ? ', required' : ''})`),
      '',
      '### Action hints',
      toMarkdownList(actions, action => action),
      '',
      '### Forms',
      formDetails,
    ].join('\n');
  }).join('\n\n');

  const flowSections = businessFlows.map((flow, index) => [
    `### ${index + 1}. ${flow.name}`,
    '',
    `- Source page: ${flow.sourceUrl || 'Unknown'}`,
    '',
    ...(flow.steps || []).map((step, stepIndex) => `${stepIndex + 1}. ${step}`),
  ].join('\n')).join('\n\n');

  return [
    '# Application Knowledge Graph',
    '',
    `- Application: ${graph.baseUrl || 'Unknown'}`,
    `- Last explored: ${graph.exploredAt || 'Unknown'}`,
    `- Sign-in supplied: ${graph.authenticationRequired ? 'Yes' : 'No'}`,
    `- Pages visited: ${pages.length}`,
    `- Navigation links: ${edges.length}`,
    `- Business flows: ${businessFlows.length}`,
    `- Crawl limits: ${graph.limits?.maxPages ?? 'Unknown'} pages maximum; same-origin only`,
    '',
    '## Navigation relationships',
    '',
    toMarkdownList(edges, edge => `${edge.from} → ${edge.to}${edge.label ? ` (${edge.label})` : ''}`),
    '',
    '## Business flows',
    '',
    flowSections || 'No business flows identified.',
    '',
    '## Pages and application elements',
    '',
    pageSections || 'No pages were captured.',
    '',
  ].join('\n');
}

async function signIn(page, credentials, initialOrigin) {
  const passwordInput = page.locator('input[type="password"]:visible').first();
  if (!(await passwordInput.count())) {
    throw new Error('Sign-in was requested, but no visible password field was found.');
  }

  if (new URL(page.url()).origin !== initialOrigin) {
    throw new Error('The sign-in page redirected to another origin; credentials were not submitted.');
  }

  const usernameSelectors = [
    'input[autocomplete="username"]',
    'input[type="email"]',
    'input[name*="user" i]',
    'input[id*="user" i]',
    'input[name*="email" i]',
    'input[id*="email" i]',
    'input[type="text"]',
    'input:not([type])',
  ];
  let usernameInput;
  for (const selector of usernameSelectors) {
    const candidate = page.locator(`${selector}:visible`).first();
    if (await candidate.count()) {
      usernameInput = candidate;
      break;
    }
  }
  if (!usernameInput) {
    throw new Error('Sign-in was requested, but no visible username or email field was found.');
  }

  await usernameInput.fill(credentials.username);
  await passwordInput.fill(credentials.password);

  const form = passwordInput.locator('xpath=ancestor::form[1]');
  let submitButton = form.locator('button[type="submit"], input[type="submit"]').first();
  if (!(await submitButton.count())) {
    submitButton = form.getByRole('button').first();
  }
  if (!(await submitButton.count())) {
    submitButton = page.getByRole('button', { name: /sign in|log in|login|continue|submit/i }).first();
  }
  if (!(await submitButton.count())) {
    throw new Error('Sign-in was requested, but no submit button was found.');
  }

  await submitButton.click({ timeout: 5000 });
  try {
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
  } catch (error) {
    if (error.name !== 'TimeoutError') throw error;
  }
  await page.waitForTimeout(750);
}

async function inspectPage(page) {
  return page.evaluate(({ maxElements, maxLinks }) => {
    const text = element => (element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim();
    const labelFor = element => {
      const ariaLabel = element.getAttribute('aria-label');
      if (ariaLabel) return ariaLabel;
      if (element.id) {
        const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
        if (label) return text(label);
      }
      return element.getAttribute('title') || element.getAttribute('placeholder') || text(element).slice(0, 120);
    };
    const locatorHint = element => {
      const testId = element.getAttribute('data-testid');
      if (testId) return `[data-testid="${testId}"]`;
      const name = element.getAttribute('name');
      if (name) return `${element.tagName.toLowerCase()}[name="${name}"]`;
      const id = element.id;
      if (id && !/^[0-9]|[a-f0-9]{8,}/i.test(id)) return `#${id}`;
      return element.tagName.toLowerCase();
    };

    const visible = element => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const controls = [...document.querySelectorAll(
      'button, a[href], input:not([type="hidden"]), select, textarea, [role="button"], [role="link"], [role="tab"], [onclick]'
    )].filter(visible).slice(0, maxElements);
    const elements = controls.map(element => ({
      tag: element.tagName.toLowerCase(),
      type: element.getAttribute('type') || element.getAttribute('role') || '',
      label: labelFor(element),
      locator: locatorHint(element),
      required: element.required === true || element.getAttribute('aria-required') === 'true',
    }));
    const actions = controls.map(element => {
      const tag = element.tagName.toLowerCase();
      const role = element.getAttribute('role');
      const label = labelFor(element) || tag;
      if (tag === 'input' || tag === 'textarea') return `Enter ${label}`;
      if (tag === 'select') return `Choose ${label}`;
      if (tag === 'a' || role === 'link') return `Navigate using ${label}`;
      if (element.type === 'submit' || element.closest('form')) return `Submit ${label}`;
      return `Activate ${label}`;
    });
    const links = [...document.querySelectorAll('a[href]')]
      .filter(visible)
      .map(anchor => ({
        url: anchor.href,
        label: labelFor(anchor) || anchor.href,
      }))
      .slice(0, maxLinks);
    const forms = [...document.forms].filter(visible).map((form, index) => ({
      name: form.getAttribute('aria-label') || form.name || form.id || `Form ${index + 1}`,
      fields: [...form.querySelectorAll('input:not([type="hidden"]), select, textarea')]
        .filter(visible)
        .map(field => ({
          label: labelFor(field),
          type: field.type || field.tagName.toLowerCase(),
          required: field.required === true || field.getAttribute('aria-required') === 'true',
        })),
      submitActions: [...form.querySelectorAll('button[type="submit"], input[type="submit"]')]
        .filter(visible)
        .map(button => labelFor(button) || 'Submit'),
    }));
    const components = [...document.querySelectorAll(
      'header, nav, main, aside, footer, section, [role="navigation"], [role="main"], [role="dialog"], [role="tablist"]'
    )].filter(visible).map(element => ({
      type: element.getAttribute('role') || element.tagName.toLowerCase(),
      name: element.getAttribute('aria-label') || element.getAttribute('aria-labelledby') || '',
    })).slice(0, 50);

    return {
      title: document.title || '',
      headings: [...document.querySelectorAll('h1, h2, h3')].filter(visible).map(text).filter(Boolean).slice(0, 30),
      components,
      elements,
      actions: [...new Set(actions)].slice(0, maxElements),
      links,
      forms,
    };
  }, { maxElements: MAX_ELEMENTS_PER_PAGE, maxLinks: MAX_LINKS_PER_PAGE });
}

async function waitForPageContent(page) {
  try {
    await page.waitForLoadState('networkidle', { timeout: 3000 });
  } catch (error) {
    if (error.name !== 'TimeoutError') throw error;
  }
  await page.waitForTimeout(300);
}

async function exploreApplication(input) {
  const parsed = parseExploreInput(input);
  const initialUrl = new URL(parsed.url);
  const browser = await chromium.launch({ headless: true });
  const pages = [];
  const edges = [];
  const seen = new Set();
  const queue = [{ url: normalizePageUrl(parsed.url), parent: null, label: 'Application entry' }];
  const deadline = Date.now() + 90000;

  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(20000);
    await page.goto(parsed.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await waitForPageContent(page);

    if (parsed.authenticationRequired) {
      await signIn(page, parsed, initialUrl.origin);
      await waitForPageContent(page);
    }

    while (queue.length && pages.length < MAX_PAGES && Date.now() < deadline) {
      const next = queue.shift();
      if (seen.has(next.url)) continue;
      seen.add(next.url);

      if (new URL(next.url).origin !== initialUrl.origin) continue;
      if (page.url() !== next.url) {
        await page.goto(next.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await waitForPageContent(page);
      }
      const inspected = await inspectPage(page);
      const pageUrl = sanitizeUrl(page.url());
      pages.push({
        url: pageUrl,
        title: inspected.title,
        headings: inspected.headings,
        components: inspected.components,
        elements: inspected.elements,
        actions: inspected.actions,
        forms: inspected.forms,
      });

      if (next.parent) {
        edges.push({ from: sanitizeUrl(next.parent), to: pageUrl, type: 'navigation', label: next.label });
      }

      for (const link of inspected.links) {
        let target;
        try {
          target = new URL(link.url);
        } catch {
          continue;
        }
        if (target.origin !== initialUrl.origin) continue;
        target.hash = '';
        target.username = '';
        target.password = '';
        const targetUrl = normalizePageUrl(target.toString());
        if (!seen.has(targetUrl) && !queue.some(item => item.url === targetUrl)) {
          queue.push({ url: targetUrl, parent: next.url, label: link.label });
        }
      }
    }
  } finally {
    await browser.close();
  }

  if (!pages.length) {
    throw new Error('The application did not expose any pages to inspect.');
  }

  const businessFlows = pages.flatMap(page => {
    const formFlows = page.forms.map(form => ({
      name: `${form.name} on ${page.title || new URL(page.url).pathname}`,
      steps: [
        ...form.fields.map(field => `${field.required ? 'Complete required' : 'Enter'} ${field.label || field.type}`),
        ...form.submitActions.map(action => `Submit using ${action}`),
      ],
      sourceUrl: page.url,
    }));
    const navigationFlows = page.actions
      .filter(action => action.startsWith('Navigate using '))
      .map(action => ({
        name: `${page.title || new URL(page.url).pathname}: ${action}`,
        steps: [action],
        sourceUrl: page.url,
      }));
    return [...formFlows, ...navigationFlows];
  }).slice(0, 100);

  return {
    version: 1,
    baseUrl: sanitizeUrl(parsed.url),
    exploredAt: new Date().toISOString(),
    authenticationRequired: parsed.authenticationRequired,
    loginAttempted: parsed.authenticationRequired,
    limits: { maxPages: MAX_PAGES, pagesVisited: pages.length, sameOriginOnly: true },
    pages,
    edges,
    businessFlows,
  };
}

module.exports = { exploreApplication, formatKnowledgeGraphMarkdown, parseExploreInput };
