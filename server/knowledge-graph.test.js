'use strict';

const assert = require('node:assert/strict');
const http = require('node:http');
const { after, before, test } = require('node:test');
const { exploreApplication, formatKnowledgeGraphMarkdown, parseExploreInput } = require('./knowledge-graph');

let fixture;
let baseUrl;
let authenticated = false;
const submittedCredentials = [];

before(async () => {
  fixture = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/login') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        const form = new URLSearchParams(body);
        submittedCredentials.push(form.get('username'), form.get('password'));
        authenticated = form.get('username') === 'qa-user' && form.get('password') === 'private-pass';
        res.writeHead(303, { Location: '/' });
        res.end();
      });
      return;
    }

    if (req.url === '/') {
      res.setHeader('Content-Type', 'text/html');
      if (authenticated) {
        res.end('<html><head><title>Accounts</title></head><body><main><h1>Accounts</h1><nav><a href="/profile">Profile</a></nav><button>View balance</button></main></body></html>');
        return;
      }
      res.end('<html><head><title>Sign in</title></head><body><main><h1>Sign in</h1><form action="/login" method="post"><label>Username<input name="username" autocomplete="username"></label><label>Password<input name="password" type="password" autocomplete="current-password"></label><button type="submit">Sign in</button></form></main></body></html>');
      return;
    }

    if (req.url === '/profile') {
      res.setHeader('Content-Type', 'text/html');
      res.end('<html><head><title>Profile</title></head><body><main><h1>Profile</h1><form><label>Email<input type="email" required></label><button type="submit">Save profile</button></form></main></body></html>');
      return;
    }

    res.writeHead(404);
    res.end('Not found');
  });
  await new Promise(resolve => fixture.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${fixture.address().port}/`;
});

after(async () => {
  await new Promise((resolve, reject) => fixture.close(error => error ? reject(error) : resolve()));
});

test('parses URL-only exploration input', () => {
  assert.deepEqual(parseExploreInput('https://example.test/path'), {
    url: 'https://example.test/path',
    username: null,
    password: null,
    authenticationRequired: false,
  });
});

test('parses pipe-delimited sign-in credentials without putting them in the URL', () => {
  const parsed = parseExploreInput('https://example.test/ | qa-user | private-pass');
  assert.equal(parsed.url, 'https://example.test/');
  assert.equal(parsed.username, 'qa-user');
  assert.equal(parsed.password, 'private-pass');
  assert.equal(parsed.authenticationRequired, true);
});

test('rejects malformed, non-HTTP, URL-embedded, and incomplete credentials', () => {
  for (const value of ['', 'not-a-url', 'file:///tmp/app', 'https://user:pass@example.test', 'https://example.test | user']) {
    assert.throws(() => parseExploreInput(value));
  }
});

test('explores authorized pages and records UI context without persisting credentials', async () => {
  authenticated = false;
  submittedCredentials.length = 0;

  const graph = await exploreApplication(`${baseUrl} | qa-user | private-pass`);

  assert.equal(graph.authenticationRequired, true);
  assert.ok(graph.pages.some(page => page.title === 'Accounts'), JSON.stringify(graph.pages.map(page => ({ url: page.url, title: page.title, headings: page.headings }))));
  assert.ok(graph.pages.some(page => page.title === 'Profile'));
  assert.ok(graph.pages.some(page => page.elements.some(element => element.label === 'View balance')));
  assert.ok(graph.businessFlows.some(flow => flow.name.includes('Profile')));
  assert.deepEqual(submittedCredentials, ['qa-user', 'private-pass']);
  assert.equal(JSON.stringify(graph).includes('private-pass'), false);
  assert.equal(JSON.stringify(graph).includes('qa-user'), false);
});

test('writes complete Markdown context for pages, controls, actions, and business flows', () => {
  const markdown = formatKnowledgeGraphMarkdown({
    baseUrl: 'https://app.example.test/',
    exploredAt: '2026-10-04T10:00:00.000Z',
    authenticationRequired: true,
    limits: { maxPages: 20 },
    pages: [{
      url: 'https://app.example.test/',
      title: 'Dashboard',
      headings: ['Overview'],
      components: [{ type: 'main', name: 'Dashboard content' }],
      elements: [{ tag: 'button', type: 'button', label: 'View report', locator: '[data-testid="report"]', required: false }],
      actions: ['Activate View report'],
      forms: [{
        name: 'Report filter',
        fields: [{ label: 'Date range', type: 'select', required: true }],
        submitActions: ['Apply filter'],
      }],
    }],
    edges: [{ from: 'https://app.example.test/', to: 'https://app.example.test/reports', label: 'Reports' }],
    businessFlows: [{
      name: 'Filter reports',
      sourceUrl: 'https://app.example.test/',
      steps: ['Complete required Date range', 'Submit using Apply filter'],
    }],
  });

  for (const expected of [
    '## Navigation relationships',
    '## Business flows',
    'Filter reports',
    '## Pages and application elements',
    '### Components',
    'Dashboard content',
    '### Interactive elements',
    'View report',
    'Activate View report',
    '### Form: Report filter',
    'Date range (select, required)',
    'Submit using Apply filter',
  ]) {
    assert.ok(markdown.includes(expected), `Markdown is missing ${expected}`);
  }
  assert.equal(markdown.includes('private-pass'), false);
});

test('can explore the same app repeatedly without reusing prior browser state', async () => {
  authenticated = false;
  const first = await exploreApplication(baseUrl);
  const second = await exploreApplication(baseUrl);

  assert.equal(first.baseUrl, second.baseUrl);
  assert.ok(first.pages.length > 0);
  assert.ok(second.pages.length > 0);
  assert.notEqual(first.exploredAt, second.exploredAt);
});
