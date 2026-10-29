/**
 * Advanced Test Automation Generator
 *
 * Generates contextual, story-specific POM automation files.
 * Every output is derived from the actual test case steps, test data blocks,
 * preconditions and acceptance criteria parsed from the story spec — no generic
 * login/transfer stubs are ever emitted.
 *
 * Output files:
 *   Locators/[STORY_ID]-Locators.ts          — per-section, 4-5 selector fallbacks
 *   pages/[STORY_ID]-Page.ts                  — BasePage-extending page object
 *   Test_Data/[STORY_ID]-test-data.json       — structured testCases array
 *   tests/[STORY_ID]/[STORY_ID]-Script.spec.ts — all test cases, POM pattern
 *
 * Reference examples (canonical quality bar):
 *   Locators/AIR-1-Locators.ts
 *   pages/AIR-1-Page.ts
 *   tests/AIR-1/AIR-1-Script.spec.ts
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ── helpers ──────────────────────────────────────────────────────────────────

/** Convert story-id to safe identifiers, e.g. "AIR-1" → { className:"Air1Page", … } */
function normalizeStoryId(storyId) {
  const clean = storyId.replace(/[^a-zA-Z0-9]/g, '');
  // PascalCase: each segment capitalised, e.g. "AIR1" → "Air1"
  const pascal = clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
  return {
    original:  storyId,            // "AIR-1"
    clean,                          // "AIR1"
    pascal,                         // "Air1"
    className: `${pascal}Page`,     // "Air1Page"
    locExport: `${pascal}PageLocators`, // "Air1PageLocators"
  };
}

/** Extract all URLs that appear in any step or precondition text */
function extractUrl(allCases) {
  const urlRe = /https?:\/\/[^\s),'">\]]+/gi;
  for (const tc of allCases) {
    const haystack = [
      tc.preconditions || '',
      ...(tc.steps || []),
      ...(tc.stepsWithResults || []).map(s => s.action || ''),
    ].join(' ');
    const found = haystack.match(urlRe);
    if (found && found.length) return found[0].replace(/\/$/, '') + '/';
  }
  return process.env.BASE_URL || '';
}

/**
 * Analyse every step action from every test case and build a de-duplicated map
 * of logical UI elements → selector hints.
 *
 * Returns: Map<elementKey, { label, hints[] }>
 * where hints are quoted strings/identifiers found next to the action verb.
 */
function analyseSteps(allCases) {
  const elements = new Map(); // key → { label, verbs: Set, hints: Set }

  const ensure = (key, label) => {
    if (!elements.has(key)) elements.set(key, { label, verbs: new Set(), hints: new Set() });
    return elements.get(key);
  };

  for (const tc of allCases) {
    const steps = [
      ...(tc.steps || []),
      ...(tc.stepsWithResults || []).map(s => s.action || ''),
    ];

    for (const raw of steps) {
      const step = raw.trim();
      const low  = step.toLowerCase();

      // Extract any quoted text in the step — likely a button label, field label or value
      const quoted = [...step.matchAll(/["'"""]([^"'""\n]{1,60})["'"""]/g)].map(m => m[1].trim());

      // ── Navigation ────────────────────────────────────────────────
      if (/navigate|go to|open|visit|load/.test(low)) {
        const urlM = step.match(/https?:\/\/[^\s),'">\]]+/);
        const e    = ensure('pageContainer', 'Main page container / search bar wrapper');
        e.verbs.add('navigate');
        if (urlM) e.hints.add(urlM[0]);
      }

      // ── Input / text entry ────────────────────────────────────────
      if (/enter|type|input|fill|search for|write/.test(low)) {
        quoted.forEach(q => {
          // Ignore values (long strings / numbers); capture field labels
          if (q.length < 40 && !/^\d/.test(q)) {
            const key = 'input_' + q.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
            ensure(key, `"${q}" input field`).verbs.add('fill');
            ensure(key, `"${q}" input field`).hints.add(q);
          }
        });
        // Generic destination / search field detection
        if (/destination|where|location/.test(low))  { ensure('destinationInput', 'Destination / Where input').verbs.add('fill'); }
        if (/check.?in/.test(low))                    { ensure('checkInButton',    'Check-in date button').verbs.add('click'); }
        if (/check.?out/.test(low))                   { ensure('checkOutButton',   'Check-out date button').verbs.add('click'); }
        if (/guest|adult|people|travell?er/.test(low)){ ensure('addGuestsButton',  '"Add guests" / Who button').verbs.add('click'); }
        if (/amount/.test(low))                       { ensure('amountInput',       'Amount input field').verbs.add('fill'); }
        if (/description|memo|note/.test(low))        { ensure('descriptionInput',  'Description / memo input').verbs.add('fill'); }
        if (/username|email|user/.test(low))          { ensure('usernameInput',     'Username / email input').verbs.add('fill'); }
        if (/password/.test(low))                     { ensure('passwordInput',     'Password input').verbs.add('fill'); }
      }

      // ── Click ─────────────────────────────────────────────────────
      if (/click|press|tap|select|choose|pick/.test(low)) {
        quoted.forEach(q => {
          if (q.length < 50) {
            const key = 'btn_' + q.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
            ensure(key, `"${q}" button / link`).verbs.add('click');
            ensure(key, `"${q}" button / link`).hints.add(q);
          }
        });
        if (/search/.test(low))                       { ensure('searchButton',      'Search / submit button').verbs.add('click'); }
        if (/check.?in/.test(low))                    { ensure('checkInButton',     'Check-in date button').verbs.add('click'); }
        if (/check.?out/.test(low))                   { ensure('checkOutButton',    'Check-out date button').verbs.add('click'); }
        if (/calendar|date.?picker/.test(low))        { ensure('calendar',          'Date picker / calendar panel').verbs.add('visible'); }
        if (/guest|adult|people/.test(low))           { ensure('addGuestsButton',   '"Add guests" / Who button').verbs.add('click'); }
        if (/dropdown|suggestion|autocomplete/.test(low)){ ensure('dropdown',       'Autocomplete / dropdown list').verbs.add('visible'); }
        if (/first.*(result|option|suggestion)/.test(low)){ ensure('firstOption',   'First dropdown / autocomplete option').verbs.add('click'); }
        if (/submit|confirm|proceed/.test(low))       { ensure('submitButton',      'Submit / confirm button').verbs.add('click'); }
        if (/login|sign.?in/.test(low))               { ensure('loginButton',       'Login / Sign In button').verbs.add('click'); }
        if (/logout|sign.?out/.test(low))             { ensure('logoutButton',      'Logout / Sign Out button').verbs.add('click'); }
        if (/transfer|send/.test(low))                { ensure('transferButton',    'Transfer / Send button').verbs.add('click'); }
        if (/filter|sort/.test(low))                  { ensure('filterButton',      'Filter / sort button').verbs.add('click'); }
        if (/add.*guest|increment|increase|\+/.test(low)){ ensure('incrementButton','Increment / "+" stepper button').verbs.add('click'); }
        if (/remove.*guest|decrement|decrease|−/.test(low)){ ensure('decrementButton','Decrement / "−" stepper button').verbs.add('click'); }
      }

      // ── Verify / see / assert ─────────────────────────────────────
      if (/verify|see|assert|check|confirm|ensure|should|visible/.test(low)) {
        if (/result|listing|property|card|item/.test(low)){ ensure('resultCard', 'Individual result / listing card').verbs.add('verify'); }
        if (/no result|empty|not found/.test(low))        { ensure('noResults',  '"No results" empty-state message').verbs.add('verify'); }
        if (/error|invalid|fail|wrong/.test(low))         { ensure('errorMsg',   'Error / validation message').verbs.add('verify'); }
        if (/success|complet|confirm|transfer/.test(low)) { ensure('successMsg', 'Success / confirmation message').verbs.add('verify'); }
        if (/url|redirect|page|navigat/.test(low))        { ensure('urlCheck',   'Page URL / navigation state').verbs.add('verify'); }
        if (/count|number|total|how many/.test(low))      { ensure('resultCount','Results count display').verbs.add('verify'); }
        if (/balance|amount|price/.test(low))             { ensure('priceDisplay','Price / balance display').verbs.add('verify'); }
        if (/guest|adult/.test(low))                      { ensure('guestPanel', 'Guest / adult count display').verbs.add('verify'); }
        if (/search.?bar|input.*visible|where.*field/.test(low)){ ensure('pageContainer','Main page container / search bar wrapper').verbs.add('verify'); }
      }

      // ── Wait ───────────────────────────────────────────────────────
      if (/wait|load|appear|display/.test(low)) {
        if (/result|listing|property|card/.test(low)){ ensure('resultCard', 'Individual result / listing card').verbs.add('wait'); }
        if (/page|screen|dashboard/.test(low))       { ensure('pageContainer','Main page container / search bar wrapper').verbs.add('wait'); }
      }
    }
  }

  return elements;
}

// ── selector builders ─────────────────────────────────────────────────────────

/**
 * Build 4-5 CSS selector fallbacks for a known element key.
 * Selectors are ordered: data-testid → aria → name/placeholder → class → text.
 */
function buildSelectors(key, label, hints) {
  const h = [...hints].map(s => String(s).toLowerCase());
  const hintLabel = h[0] || key;

  // Pre-mapped selectors for common element keys encountered in AirBnb / generic apps
  const MAP = {
    pageContainer: [
      '[data-testid="structured-search-input-field-query"]',
      'form[role="search"], div[role="search"]',
      '[class*="SearchBar"], [class*="searchContainer"]',
      'form[class*="search"], main[id="site-content"]',
      'header, [class*="Header"]',
    ],
    destinationInput: [
      '[data-testid="structured-search-input-field-query"]',
      'input[placeholder*="Where are you going"], input[placeholder*="Anywhere"]',
      'input[placeholder*="Search destinations"], input[placeholder*="destination"]',
      'input[name="query"], input[aria-label*="destination"]',
      'input[id*="bigsearch-query-location"]',
    ],
    checkInButton: [
      '[data-testid="structured-search-input-field-split-dates-0"]',
      'button:has-text("Check in"), div[aria-label*="Check in"]',
      'input[placeholder*="Check in"], [class*="checkIn"]',
      '[aria-label*="checkin"], [data-testid*="checkin"]',
    ],
    checkOutButton: [
      '[data-testid="structured-search-input-field-split-dates-1"]',
      'button:has-text("Check out"), div[aria-label*="Check out"]',
      'input[placeholder*="Check out"], [class*="checkOut"]',
      '[aria-label*="checkout"], [data-testid*="checkout"]',
    ],
    calendar: [
      '[data-testid="structured-search-input-field-dates-panel"]',
      'div[class*="CalendarMonth"], div[class*="DayPicker"]',
      'div[role="dialog"]:has([class*="CalendarMonth"])',
      'table[class*="calendar"], [class*="datePicker"]',
    ],
    addGuestsButton: [
      '[data-testid="structured-search-input-field-guests-button"]',
      'button:has-text("Add guests"), div[aria-label*="Guests"]',
      'input[placeholder*="Guests"], input[placeholder*="Add guests"]',
      '[data-testid*="guest"], [class*="guestButton"]',
    ],
    guestPanel: [
      '[data-testid="structured-search-input-field-guests-panel"]',
      'div[class*="guest"]:has(button[aria-label*="adult"])',
      'section[class*="guest"], div[role="dialog"]:has-text("guests")',
      '[class*="GuestPicker"], [class*="guestPanel"]',
    ],
    incrementButton: [
      'button[data-testid="stepper-adults-increase-button"]',
      'button[aria-label="increase value"], button[aria-label*="Add adult"]',
      'button[aria-label*="adults"] + button',
      '[class*="stepper"] button:last-child',
    ],
    decrementButton: [
      'button[data-testid="stepper-adults-decrease-button"]',
      'button[aria-label="decrease value"], button[aria-label*="Remove adult"]',
      'button[aria-label*="Remove"], [class*="stepper"] button:first-child',
    ],
    searchButton: [
      '[data-testid="structured-search-input-search-button"]',
      'button[aria-label="Search"], button:has-text("Search")',
      'button[type="submit"]:has([class*="search"])',
      '[class*="searchButton"], [class*="SearchButton"]',
    ],
    dropdown: [
      '[data-testid="structured-search-input-field-query-suggestions"]',
      '[role="listbox"], ul[class*="suggestion"]',
      'div[class*="autocomplete"], div[id*="suggestions"]',
      '[class*="dropdown"], [class*="Dropdown"]',
    ],
    firstOption: [
      '[data-testid="option"] span[class*="location"]',
      '[role="option"]:first-child, li[class*="suggestion"]:first-child',
      'div[class*="option"]:first-child',
      '[role="listbox"] > *:first-child',
    ],
    resultCard: [
      '[data-testid="listing-card-title"]',
      'div[itemprop="itemListElement"], div[class*="listingCard"]',
      'a[class*="listing"], div[role="group"]',
      '[class*="propertyCard"], [class*="PropertyCard"]',
    ],
    noResults: [
      'div:has-text("No results"), p:has-text("No exact matches")',
      '[class*="empty-state"], h2:has-text("No results")',
      '[class*="noResults"], [data-testid*="no-results"]',
      'p:has-text("0 results"), div:has-text("no matches")',
    ],
    errorMsg: [
      'div[role="alert"], [class*="error"]',
      '[class*="toast-error"], [class*="alert-danger"]',
      '[class*="error-msg"], span[class*="invalid"]',
      '.field-error, [class*="fieldError"]',
    ],
    successMsg: [
      '[class*="success"], [role="alert"]:has-text("success")',
      '.toast-success, [class*="toast-success"]',
      '[class*="alert-success"], [class*="successMessage"]',
      'p:has-text("success"), div:has-text("completed")',
    ],
    submitButton: [
      'button[type="submit"]',
      'button:has-text("Submit"), button:has-text("Confirm")',
      'button:has-text("Save"), button:has-text("Proceed")',
      '[class*="submitBtn"], [class*="SubmitButton"]',
    ],
    loginButton: [
      'button:has-text("Login"), button:has-text("Sign In")',
      'button[type="submit"], input[type="submit"]',
      '[data-testid*="login"], [class*="loginButton"]',
      '[aria-label*="Login"], [aria-label*="Sign In"]',
    ],
    logoutButton: [
      'button:has-text("Logout"), button:has-text("Sign Out")',
      '[aria-label*="logout" i], [data-testid*="logout"]',
      '[class*="logoutBtn"], a:has-text("Logout")',
    ],
    usernameInput: [
      'input[name="username"], input[name="email"]',
      'input[placeholder*="username" i], input[placeholder*="email" i]',
      'input[type="email"], input[id*="username"]',
      'input[aria-label*="username" i]',
    ],
    passwordInput: [
      'input[type="password"]',
      'input[name="password"], input[id*="password"]',
      'input[placeholder*="password" i]',
      'input[aria-label*="password" i]',
    ],
    amountInput: [
      'input[type="number"], input[name="amount"]',
      'input[placeholder*="amount" i], input[aria-label*="amount" i]',
      'input[id*="amount"], input[class*="amount"]',
    ],
    descriptionInput: [
      'textarea, input[name="description"]',
      'input[placeholder*="description" i], input[placeholder*="memo" i]',
      'textarea[placeholder*="note" i], input[aria-label*="description" i]',
    ],
    transferButton: [
      'button:has-text("Transfer"), button:has-text("Send")',
      'button[type="submit"], [data-testid*="transfer"]',
      '[class*="transferBtn"], [aria-label*="Transfer"]',
    ],
    filterButton: [
      'button:has-text("Filter"), button:has-text("Sort")',
      '[data-testid*="filter"], [class*="filterBtn"]',
      '[aria-label*="filter" i], button[class*="filter"]',
    ],
    resultCount: [
      '[data-testid*="result-count"], [class*="resultCount"]',
      'span:has-text("result"), div:has-text("properties")',
      '[aria-label*="results"], [class*="totalResults"]',
    ],
    priceDisplay: [
      'span[aria-label*="per night"], [class*="price"]',
      '[data-testid*="price"], span[class*="_tyxjp1"]',
      'div[class*="pricing"], [class*="nightlyPrice"]',
    ],
    guestPanel_count: [
      '[data-testid="stepper-adults-value"]',
      'span[class*="stepper"]:near(div:has-text("Adults"))',
      'div:has-text("Adults") ~ div span',
    ],
    urlCheck: [
      // Pseudo-locator: not a real selector, handled in spec as page.url()
    ],
  };

  if (MAP[key] && MAP[key].length) return MAP[key];

  // Fallback: derive selectors from the hints (quoted strings from step text)
  const selectors = [];
  if (h.length) {
    selectors.push(`[data-testid*="${hintLabel}"]`);
    selectors.push(`[aria-label*="${hintLabel}" i]`);
    selectors.push(`input[placeholder*="${hintLabel}" i], button:has-text("${h[0]}")`);
    selectors.push(`[name*="${hintLabel}"], [id*="${hintLabel}"]`);
    selectors.push(`[class*="${hintLabel}"]`);
  } else {
    selectors.push(`[data-testid*="${key}"]`);
    selectors.push(`[aria-label*="${key}" i]`);
    selectors.push(`[class*="${key}"]`);
  }
  return selectors;
}

// ── section grouping ──────────────────────────────────────────────────────────

/**
 * Group element keys into logical UI sections.
 * The returned object maps section-name → [ elementKey, … ]
 */
function groupIntoSections(elementKeys) {
  const order = [
    'SEARCH_BAR',
    'DATE_PICKER',
    'GUESTS',
    'SEARCH_CONTROLS',
    'RESULTS',
    'VALIDATION',
  ];

  const RULES = {
    SEARCH_BAR:      k => /pageContainer|destinationInput|dropdown|firstOption/.test(k),
    DATE_PICKER:     k => /checkIn|checkOut|calendar/.test(k),
    GUESTS:          k => /guest|increment|decrement/.test(k),
    SEARCH_CONTROLS: k => /searchButton|submitButton|transferButton|loginButton|logoutButton|filterButton/.test(k),
    RESULTS:         k => /resultCard|noResults|resultCount|priceDisplay|urlCheck/.test(k),
    VALIDATION:      k => /errorMsg|successMsg/.test(k),
  };

  const sections = {};
  for (const sec of order) sections[sec] = [];
  sections.OTHER = [];

  for (const key of elementKeys) {
    let placed = false;
    for (const sec of order) {
      if (RULES[sec](key)) { sections[sec].push(key); placed = true; break; }
    }
    if (!placed) sections.OTHER.push(key);
  }

  // Drop empty sections
  for (const sec of Object.keys(sections)) {
    if (!sections[sec].length) delete sections[sec];
  }
  return sections;
}

// ── page method builder ───────────────────────────────────────────────────────

/** Derive page-object method names from the set of element keys */
function derivePageMethods(elementMap, storyId, appUrl) {
  const keys   = [...elementMap.keys()];
  const methods = [];

  const has = (...ks) => ks.some(k => keys.includes(k));

  // Navigation
  methods.push({
    name: `open${appUrl.includes('airbnb') ? 'Airbnb' : 'App'}`,
    params: 'url: string',
    returnType: 'Promise<void>',
    section: 'Navigation',
    doc: `Navigate to the application homepage and wait for the main container to load.\n   * @param url Application URL from test data`,
    waitLocator: 'pageContainer',
    waitDesc: 'Main container',
    body: `    this.log('Opening app: ' + url);\n    await this.navigateTo(url);\n    await this.waitForElement(Locators.pageContainer, { description: 'Main container', timeout: 30000 });\n    this.log('App loaded');`,
  });

  // Search-bar visibility check
  if (has('pageContainer', 'destinationInput')) {
    methods.push({
      name: 'isSearchBarVisible',
      params: '',
      returnType: 'Promise<boolean>',
      section: 'Search Bar',
      doc: 'Returns true when the main search / input bar is visible on the page.',
      body: `    return this.isVisible(Locators.destinationInput || Locators.pageContainer, { description: 'Search bar' });`,
    });
  }

  // Destination selection
  if (has('destinationInput', 'dropdown', 'firstOption')) {
    methods.push({
      name: 'selectDestination',
      params: 'destination: string',
      returnType: 'Promise<void>',
      section: 'Destination',
      doc: `Click the destination input, type the destination text, wait for autocomplete\n   * dropdown, then select the first matching suggestion.\n   * @param destination e.g. "Chennai, Tamil Nadu"`,
      body: `    this.log('Selecting destination: ' + destination);
    await this.click(Locators.destinationInput, { description: 'Destination input', force: true });
    await this.adaptiveWait(300, 800);
    await this.fill(Locators.destinationInput, destination, { description: 'Destination input' });
    await this.adaptiveWait(800, 1500);
    await this.waitForElement(Locators.dropdown, { description: 'Destination dropdown', timeout: 10000 });
    await this.click(Locators.firstOption, { description: 'First destination option' });
    await this.adaptiveWait(500, 1000);
    this.log('Destination selected');`,
    });
  }

  // Check-in date
  if (has('checkInButton', 'calendar')) {
    methods.push({
      name: 'selectCheckInDate',
      params: 'dateStr: string',
      returnType: 'Promise<void>',
      section: 'Dates',
      doc: `Click the check-in button to open the calendar, then click the target day.\n   * @param dateStr "DD-MM-YYYY"`,
      body: `    this.log('Selecting check-in date: ' + dateStr);
    await this.click(Locators.checkInButton, { description: 'Check-in button', force: true });
    await this.waitForElement(Locators.calendar, { description: 'Calendar', timeout: 10000 });
    await this._clickCalendarDay(dateStr);
    await this.adaptiveWait(400, 800);
    this.log('Check-in date selected');`,
    });
  }

  // Check-out date
  if (has('checkOutButton', 'calendar')) {
    methods.push({
      name: 'selectCheckOutDate',
      params: 'dateStr: string',
      returnType: 'Promise<void>',
      section: 'Dates',
      doc: `Click the check-out day in the already-open calendar.\n   * @param dateStr "DD-MM-YYYY"`,
      body: `    this.log('Selecting check-out date: ' + dateStr);
    await this._clickCalendarDay(dateStr);
    await this.adaptiveWait(400, 800);
    this.log('Check-out date selected');`,
    });
  }

  // Guest selection
  if (has('addGuestsButton', 'guestPanel', 'incrementButton')) {
    methods.push({
      name: 'selectGuests',
      params: 'adults: number',
      returnType: 'Promise<void>',
      section: 'Guests',
      doc: `Open the guest panel and increment adults to the required count.\n   * @param adults Total number of adults required`,
      body: `    this.log('Selecting ' + adults + ' adult(s)');
    await this.click(Locators.addGuestsButton, { description: 'Add Guests button', force: true });
    await this.waitForElement(Locators.guestPanel, { description: 'Guest panel', timeout: 8000 });
    const increments = Math.max(0, adults - 1);
    for (let i = 0; i < increments; i++) {
      await this.click(Locators.incrementButton, { description: 'Adults increment (+)' });
      await this.adaptiveWait(200, 400);
    }
    this.log(adults + ' adult(s) selected');`,
    });
  }

  // Submit / Search
  if (has('searchButton', 'submitButton')) {
    const btnKey = has('searchButton') ? 'searchButton' : 'submitButton';
    methods.push({
      name: 'clickSearch',
      params: '',
      returnType: 'Promise<void>',
      section: 'Search',
      doc: 'Click the Search / submit button to trigger the search.',
      body: `    this.log('Clicking Search button');
    await this.click(Locators.${btnKey}, { description: 'Search button' });
    await this.adaptiveWait(1000, 2000);
    this.log('Search submitted');`,
    });
  }

  // Wait for results
  if (has('resultCard')) {
    methods.push({
      name: 'waitForSearchResults',
      params: '',
      returnType: 'Promise<void>',
      section: 'Results',
      doc: 'Wait until at least one result card is visible, or a "no results" banner appears.',
      body: `    this.log('Waiting for search results');
    try {
      await this.waitForElement(Locators.resultCard, { description: 'Result card', timeout: 30000 });
    } catch {
      await this.waitForElement(Locators.noResults, { description: 'No results message', timeout: 10000 });
    }
    this.log('Search results loaded');`,
    });

    methods.push({
      name: 'getResultsCount',
      params: '',
      returnType: 'Promise<number>',
      section: 'Results',
      doc: 'Return the number of result / listing cards currently visible.',
      body: `    const count = await this.getPage().locator(Locators.resultCard).count();
    this.log('Results count: ' + count);
    return count;`,
    });

    methods.push({
      name: 'areResultsVisible',
      params: '',
      returnType: 'Promise<boolean>',
      section: 'Results',
      doc: 'True if at least one result card is visible.',
      body: `    return this.isVisible(Locators.resultCard, { description: 'Result card' });`,
    });
  }

  if (has('noResults')) {
    methods.push({
      name: 'isNoResultsVisible',
      params: '',
      returnType: 'Promise<boolean>',
      section: 'Results',
      doc: 'True if the "No results" / empty-state banner is shown.',
      body: `    return this.isVisible(Locators.noResults, { description: 'No results message' });`,
    });
  }

  // URL getter
  methods.push({
    name: 'getUrl',
    params: '',
    returnType: 'Promise<string>',
    section: 'Results',
    doc: 'Return the current browser URL.',
    body: `    return this.getCurrentUrl();`,
  });

  // Error visibility
  if (has('errorMsg')) {
    methods.push({
      name: 'isErrorVisible',
      params: '',
      returnType: 'Promise<boolean>',
      section: 'Validation',
      doc: 'True if any error message or alert is currently visible.',
      body: `    return this.isVisible(Locators.errorMsg, { description: 'Error message' });`,
    });
  }

  // Success visibility
  if (has('successMsg')) {
    methods.push({
      name: 'isSuccessVisible',
      params: '',
      returnType: 'Promise<boolean>',
      section: 'Validation',
      doc: 'True if a success / confirmation message is currently visible.',
      body: `    return this.isVisible(Locators.successMsg, { description: 'Success message' });`,
    });
  }

  // Login
  if (has('usernameInput', 'passwordInput', 'loginButton')) {
    methods.push({
      name: 'login',
      params: 'username: string, password: string',
      returnType: 'Promise<void>',
      section: 'Authentication',
      doc: `Enter credentials and submit the login form.\n   * @param username Username from test data\n   * @param password Password from test data`,
      body: `    this.log('Logging in as: ' + username);
    await this.fill(Locators.usernameInput, username, { description: 'Username input' });
    await this.fill(Locators.passwordInput, password, { description: 'Password input' });
    await this.click(Locators.loginButton, { description: 'Login button' });
    await this.adaptiveWait(1000, 2000);
    this.log('Login submitted');`,
    });
  }

  // Transfer
  if (has('amountInput', 'transferButton')) {
    methods.push({
      name: 'performTransfer',
      params: 'recipientAccount: string, amount: string, description: string',
      returnType: 'Promise<void>',
      section: 'Transfer',
      doc: 'Fill in and submit a money transfer form.',
      body: `    this.log('Performing transfer of ' + amount);
    await this.fill(Locators.amountInput, amount, { description: 'Amount input' });
    if (Locators.descriptionInput) {
      await this.fill(Locators.descriptionInput, description, { description: 'Description input' }).catch(() => {});
    }
    await this.click(Locators.transferButton, { description: 'Transfer button' });
    await this.adaptiveWait(1000, 2000);
    this.log('Transfer submitted');`,
    });
  }

  // Print healing summary
  methods.push({
    name: 'printHealingSummary',
    params: '',
    returnType: 'void',
    section: 'Diagnostics',
    doc: 'Print a healing diagnostics summary to the console after test completion.',
    body: `    this.log('=== ${storyId} Page Healing Summary ===');\n    super.printHealingSummary();`,
    override: true,
  });

  return methods;
}

// ── calendarDay helper detection ──────────────────────────────────────────────

function needsCalendarHelper(methods) {
  return methods.some(m => m.body && m.body.includes('_clickCalendarDay'));
}

// ── file generators ───────────────────────────────────────────────────────────

function generateLocatorsFile(storyId, testCases) {
  const { original } = normalizeStoryId(storyId);
  const allCases     = [...(testCases.positive || []), ...(testCases.negative || []), ...(testCases.edge || [])];
  const appUrl       = extractUrl(allCases);
  const elementMap   = analyseSteps(allCases);
  const sections     = groupIntoSections([...elementMap.keys()]);

  // Always include these core sections/elements
  const ALWAYS = ['pageContainer','destinationInput','dropdown','firstOption',
                  'checkInButton','checkOutButton','calendar',
                  'addGuestsButton','guestPanel','incrementButton','decrementButton',
                  'searchButton','resultCard','noResults','errorMsg','successMsg'];
  for (const k of ALWAYS) {
    if (!elementMap.has(k)) elementMap.set(k, { label: k, verbs: new Set(), hints: new Set() });
  }
  // Re-group with added keys
  const allSections = groupIntoSections([...elementMap.keys()]);

  let out = `/**
 * ${original} Page Locators
 * File: Locators/${original}-Locators.ts
 *
 * Story: ${original}
 * Application: ${appUrl || '<application-url>'}
 *
 * Multiple CSS selector fallbacks per element for self-healing.
 * Selectors ordered: data-testid → aria-label → name/placeholder → class → text.
 * Organized by functional UI section.
 */\n\n`;

  const exportKeys = [];

  for (const [section, keys] of Object.entries(allSections)) {
    if (!keys.length) continue;
    const bar = '─'.repeat(Math.max(0, 76 - section.length));
    out += `// ── ${section} ${bar}\n`;
    out += `const ${section} = {\n`;

    for (const key of keys) {
      if (key === 'urlCheck') continue; // pseudo-element, not a real selector
      const entry    = elementMap.get(key) || { label: key, hints: new Set() };
      const selectors = buildSelectors(key, entry.label, entry.hints)
                          .filter(Boolean)
                          .slice(0, 5);
      if (!selectors.length) continue;

      out += `  /** ${entry.label} */\n`;
      if (selectors.length === 1) {
        out += `  ${key}:\n    '${selectors[0]}',\n\n`;
      } else {
        out += `  ${key}:\n`;
        selectors.forEach((sel, i) => {
          const suffix = i < selectors.length - 1 ? ' +\n' : ',\n';
          out += `    '${sel}'${suffix}`;
        });
        out += '\n';
      }
    }

    out += `};\n\n`;
    exportKeys.push(section);
  }

  // Determine the export const name: e.g. "Air1PageLocators"
  const { locExport } = normalizeStoryId(storyId);
  out += `// ── EXPORT ${'─'.repeat(68)}\n`;
  out += `export const ${locExport} = {\n`;
  exportKeys.forEach(s => { out += `  ...${s},\n`; });
  out += `};\n`;

  return out;
}

// ─────────────────────────────────────────────────────────────────────────────

function generatePageObjectFile(storyId, testCases) {
  const { original, className, locExport } = normalizeStoryId(storyId);
  const allCases  = [...(testCases.positive || []), ...(testCases.negative || []), ...(testCases.edge || [])];
  const appUrl    = extractUrl(allCases);
  const elementMap = analyseSteps(allCases);

  // Add always-needed keys
  const ALWAYS = ['pageContainer','destinationInput','dropdown','firstOption',
                  'checkInButton','checkOutButton','calendar',
                  'addGuestsButton','guestPanel','incrementButton',
                  'searchButton','resultCard','noResults','errorMsg','successMsg'];
  for (const k of ALWAYS) {
    if (!elementMap.has(k)) elementMap.set(k, { label: k, verbs: new Set(), hints: new Set() });
  }

  const methods       = derivePageMethods(elementMap, original, appUrl);
  const needsCalendar = needsCalendarHelper(methods);

  let out = `import { Page } from '@playwright/test';
import { BasePage } from './BasePage_latest';
import { ${locExport} as Locators } from '../Locators/${original}-Locators';

/**
 * ${className} — Page Object for ${original}
 *
 * Story: ${original}
 * Application: ${appUrl || '<application-url>'}
 *
 * Extends BasePage for automatic self-healing selector fallbacks.
 * All interactions use BasePage methods — no direct page.locator() calls.
 * NO assertions in this file; assertions belong in the test spec.
 */
export class ${className} extends BasePage {
  constructor(page: Page) {
    super(page);
    this.setPageName('${className}');
  }
\n`;

  // Group methods by section
  const sectionOrder = ['Navigation','Search Bar','Destination','Dates','Guests',
                        'Authentication','Transfer','Search','Results','Validation','Diagnostics'];
  const grouped = {};
  for (const m of methods) {
    const sec = m.section || 'Other';
    if (!grouped[sec]) grouped[sec] = [];
    grouped[sec].push(m);
  }

  for (const sec of [...sectionOrder, ...Object.keys(grouped).filter(s => !sectionOrder.includes(s))]) {
    if (!grouped[sec] || !grouped[sec].length) continue;
    const bar = '─'.repeat(Math.max(0, 76 - sec.length));
    out += `  // ── ${sec} ${bar}\n\n`;

    for (const m of grouped[sec]) {
      out += `  /**\n   * ${m.doc}\n   */\n`;
      if (m.override) {
        out += `  ${m.name}(${m.params}): ${m.returnType} {\n`;
      } else {
        out += `  async ${m.name}(${m.params}): ${m.returnType} {\n`;
      }
      out += `${m.body}\n  }\n\n`;
    }
  }

  // Calendar day helper (private)
  if (needsCalendar) {
    out += `  // ── Internal Helpers ${'─'.repeat(57)}\n\n`;
    out += `  /**
   * Click a specific calendar day identified by its aria-label, data-testid,
   * or visible day number text — whichever selector resolves first.
   * @param dateStr "DD-MM-YYYY"
   */
  private async _clickCalendarDay(dateStr: string): Promise<void> {
    const parts     = dateStr.split('-');
    const day       = parseInt(parts[0], 10);
    const month     = parseInt(parts[1], 10);
    const year      = parseInt(parts[2], 10);
    const months    = ['January','February','March','April','May','June',
                       'July','August','September','October','November','December'];
    const monthName = months[month - 1];
    const ariaLabel = \`\${monthName} \${day}, \${year}\`;
    const paddedMM  = String(month).padStart(2, '0');
    const paddedDD  = String(day).padStart(2, '0');

    const aria    = \`[aria-label="\${ariaLabel}"], td[aria-label="\${ariaLabel}"], button[aria-label="\${ariaLabel}"]\`;
    const testId  = \`[data-testid="\${year}-\${paddedMM}-\${paddedDD}"]\`;
    const text    = \`td:has-text("\${day}"), button[class*="CalendarDay"]:has-text("\${day}")\`;

    await this.click(\`\${aria}, \${testId}, \${text}\`,
      { description: \`Calendar day \${day} \${monthName} \${year}\` });
  }
\n`;
  }

  out += `}\n`;
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────

function generateTestDataFile(storyId, testCases, summary) {
  const { original } = normalizeStoryId(storyId);
  const allCases     = [...(testCases.positive || []), ...(testCases.negative || []), ...(testCases.edge || [])];
  const appUrl       = extractUrl(allCases);

  // Build one testCases entry per parsed test case, using testData from markdown
  const cases = allCases.map(tc => {
    // tc.testData may be an object parsed from the ```json block in the spec
    let rawData = tc.testData || {};
    if (typeof rawData === 'string') {
      try {
        rawData = JSON.parse(rawData);
      } catch {
        rawData = { input: rawData };
      }
    }
    if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) rawData = {};
    if (Object.keys(rawData).length === 0) {
      const steps = (tc.steps || []).filter(step => !/password|secret|token/i.test(step));
      const inputs = [...new Set(steps.flatMap(step =>
        [...step.matchAll(/["']([^"'\\n]{1,100})["']/g)].map(match => match[1].trim())
      ))];
      rawData = {
        ...(appUrl ? { url: appUrl } : {}),
        ...(inputs.length ? { inputs } : {}),
        ...(!appUrl && !inputs.length ? { scenario: tc.title || tc.id } : {}),
      };
    }
    return {
      testCaseId: tc.id,
      label:      `${tc.id} — ${tc.title}`,
      title:      tc.title,
      type:       tc.type || 'Positive',
      data:       rawData,
    };
  });

  const positive = (testCases.positive || []).length;
  const negative = (testCases.negative || []).length;
  const edge     = (testCases.edge     || []).length;

  return JSON.stringify({
    storyId:   original,
    summary:   summary || original,
    generatedOn: new Date().toISOString(),
    baseUrl:   appUrl || (process.env.BASE_URL || ''),
    testCases: cases,
    metadata:  {
      generatedOn: new Date().toISOString(),
      totalCases:  allCases.length,
      positive, negative, edge,
    },
  }, null, 2);
}

// ─────────────────────────────────────────────────────────────────────────────

function generateTestScriptFile(storyId, summary, testCases) {
  const { original, className, locExport } = normalizeStoryId(storyId);
  const allCases   = [...(testCases.positive || []), ...(testCases.negative || []), ...(testCases.edge || [])];
  const positive   = testCases.positive || [];
  const negative   = testCases.negative || [];
  const edge       = testCases.edge     || [];
  const pageVar    = className.charAt(0).toLowerCase() + className.slice(1);

  // Collect all test case IDs for the header
  const allIds = allCases.map(tc => tc.id).join(', ');

  let out = `/**
 * ${original} — ${summary || 'Test Automation'}
 * =====================================================================
 * Story      : ${original} — ${summary || 'Test Automation'}
 * Application: (see Test_Data/${original}-test-data.json → baseUrl)
 * Framework  : Playwright + Pure POM (Page Object Model)
 *
 * Test Cases (${allCases.length} total):
 *   ${allIds}
 *
 * Artifacts:
 *   Page Object : pages/${original}-Page.ts
 *   Locators    : Locators/${original}-Locators.ts
 *   Test Data   : Test_Data/${original}-test-data.json
 *   Spec        : specs/${original}-TEST-CASES.md
 * =====================================================================
 */

import { test, expect } from '@playwright/test';
import { ${className} } from '../../pages/${original}-Page';
import testData from '../../Test_Data/${original}-test-data.json';

// ─── helper ──────────────────────────────────────────────────────────────────

/** Look up the data block for a given test case ID */
function td(id: string): Record<string, any> {
  const tc = (testData as any).testCases?.find((c: any) => c.testCaseId === id);
  if (!tc) throw new Error(\`Test data not found for: \${id}\`);
  return tc.data as Record<string, any>;
}

const BASE_URL = (testData as any).baseUrl as string;

// ─── suite ────────────────────────────────────────────────────────────────────

test.describe('${original}: ${summary || 'Test Automation'}', () => {
  let ${pageVar}: ${className};

  test.beforeEach(async ({ page }) => {
    ${pageVar} = new ${className}(page);
    page.setDefaultTimeout(30_000);
  });

  test.afterEach(async ({}, testInfo) => {
    if (testInfo.status !== 'passed') {
      const safeName = testInfo.title.replace(/[^a-zA-Z0-9]/g, '_');
      await ${pageVar}.takeScreenshot(\`FAILED_\${safeName}\`);
    }
    ${pageVar}.printHealingSummary();
  });

`;

  // ── section builder ──────────────────────────────────────────────────────
  const banner = (label) =>
    `  // ${'═'.repeat(74)}\n  // ${label}\n  // ${'═'.repeat(74)}\n\n`;

  const buildTest = (tc, typeLabel) => {
    const severity = typeLabel === 'POSITIVE' ? 'Critical' : typeLabel === 'NEGATIVE' ? 'High' : 'Medium';
    const testType = typeLabel === 'POSITIVE' ? 'Positive' : typeLabel === 'NEGATIVE' ? 'Negative' : 'Edge';
    const component = (tc.preconditions || '').match(/https?:\/\/[^\s]+/)
      ? 'Application Page' : 'Application Page';

    // Build test.step blocks from stepsWithResults (parsed spec table rows)
    const steps = tc.stepsWithResults || tc.steps?.map(s => ({ action: s, result: '' })) || [];
    let stepBlock = '';

    // Derive the navigate method name from URL or class name
    // e.g. "https://www.airbnb.co.in/" → "openAirbnb", generic → "openApp"
    const appUrl = extractUrl([tc]);
    const appNameRaw = appUrl
      ? appUrl.replace(/https?:\/\/(www\.)?/, '').split(/[.\/]/)[0]   // e.g. "airbnb"
      : '';
    const openMethodName = appNameRaw
      ? `open${appNameRaw.charAt(0).toUpperCase() + appNameRaw.slice(1)}`  // e.g. "openAirbnb"
      : 'openApp';

    if (steps.length) {
      // Each spec table row becomes its own test.step with an inline comment above it.
      // Steps that perform the same logical action are grouped (max 3 per block) for
      // readability — matching the pattern in AIR-1-Script_latest.spec.ts.
      let i = 0;
      while (i < steps.length) {
        const group = steps.slice(i, Math.min(i + 3, steps.length));
        const stepNums = group.length === 1
          ? `Step ${i + 1}`
          : `Steps ${i + 1}-${i + group.length}`;

        // Inline comment: uses the first action in the group as the description
        const commentDesc = group[0].action;
        // Step label: same description, trimmed to 120 chars for readability
        const labelDesc   = group.length === 1
          ? group[0].action.slice(0, 120)
          : group.map(s => s.action).join('; ').slice(0, 120);

        const isNegative  = group.some(s => s.action && /invalid|empty|wrong|incorrect|before|without|no /i.test(s.action));
        const catchSuffix = isNegative ? '.catch(() => {})' : '';

        // Map each step action to the appropriate page-object method call
        const calls = group.map(s => {
          const a = (s.action || '').toLowerCase();
          if (/navigate|go to|open|visit/.test(a))              return `await ${pageVar}.${openMethodName}(BASE_URL);`;
          if (/enter.*destination|select.*destination|destination.*text|type.*destination/.test(a)) return `await ${pageVar}.selectDestination(data.destination || data.newDestination || data.initialDestination)${catchSuffix};`;
          if (/check.?in/.test(a))                              return `await ${pageVar}.selectCheckInDate(data.checkInDate || data.newCheckIn || data.initialCheckIn)${catchSuffix};`;
          if (/check.?out/.test(a))                             return `await ${pageVar}.selectCheckOutDate(data.checkOutDate || data.newCheckOut || data.invalidCheckOutDate)${catchSuffix};`;
          if (/guest|adult/.test(a) && /add|select|set|click/.test(a)) return `await ${pageVar}.selectGuests(data.adultsCount || data.guests || data.minGuests || 1)${catchSuffix};`;
          if (/click.*search|submit.*search|search.*button|click.*search/.test(a)) return `await ${pageVar}.clickSearch()${catchSuffix};`;
          if (/wait.*result|result.*load|results.*load/.test(a)) return `await ${pageVar}.waitForSearchResults();`;
          if (/login|sign.?in/.test(a))                          return `await ${pageVar}.login(data.username, data.password)${catchSuffix};`;
          if (/verify|check|confirm|see|assert|visible|should/.test(a)) {
            if (/search.?bar|input.*visible|bar.*visible/.test(a)) return `const visible = await ${pageVar}.isSearchBarVisible();\n        expect(visible, 'Search bar should be visible').toBe(true);`;
            if (/result|propert|listing|card|populated/.test(a))   return `const count = await ${pageVar}.getResultsCount();\n        expect(count, 'Search results count should be > 0').toBeGreaterThan(0);\n\n        const url = await ${pageVar}.getUrl();\n        expect(url, 'URL should reflect search results page').toContain('${appNameRaw || 'app'}');`;
            if (/url|page|redirect|navigat/.test(a))               return `const url = await ${pageVar}.getUrl();\n        expect(url, 'URL should reflect results page').toContain('${appNameRaw || 'app'}');`;
            if (/no.?result|empty|not found/.test(a))              return `const noResults = await ${pageVar}.isNoResultsVisible();\n        const errorShown = await ${pageVar}.isErrorVisible();\n        const count = await ${pageVar}.getResultsCount();\n        expect(\n          noResults || errorShown || count === 0,\n          'Application should gracefully handle this scenario'\n        ).toBe(true);`;
            if (/error|invalid|validation|fail/.test(a))           return `const errorVisible = await ${pageVar}.isErrorVisible();\n        const url = await ${pageVar}.getUrl();\n        expect(\n          errorVisible || !url.includes('/s/'),\n          'System should show error or prevent navigation'\n        ).toBe(true);`;
            return `// Verify: ${s.result || s.action}`;
          }
          return `// ${s.action}`;
        }).join('\n        ');

        // Emit: inline comment THEN test.step — exactly as in _latest.spec.ts reference
        stepBlock += `      // ${stepNums}: ${commentDesc}\n`;
        stepBlock += `      await test.step('${stepNums} — ${labelDesc}', async () => {\n        ${calls}\n      });\n\n`;
        i += group.length;
      }
    } else {
      // Fallback when no steps are parsed from the spec
      stepBlock  = `      // Step 1: Navigate to the application\n`;
      stepBlock += `      await test.step('Step 1 — Navigate to the application', async () => {\n        await ${pageVar}.${openMethodName}(BASE_URL);\n      });\n\n`;
    }

    return `  // ──────────────────────────────────────────────────────────────────────────

  test('${tc.id} — ${tc.title.replace(/'/g, "\\'")}', async () => {
    test.info().annotations.push({ type: 'severity',  description: '${severity}' });
    test.info().annotations.push({ type: 'testType',  description: '${testType}' });
    test.info().annotations.push({ type: 'component', description: '${component}' });

    const data = td('${tc.id}');

    try {
${stepBlock}    } catch (error) {
      await ${pageVar}.takeScreenshot('${tc.id}-FAILED');
      throw error;
    }
  });\n\n`;
  };

  // Positive
  if (positive.length) {
    out += banner('POSITIVE — Happy Path');
    positive.forEach(tc => { out += buildTest(tc, 'POSITIVE'); });
  }

  // Negative
  if (negative.length) {
    out += banner('NEGATIVE');
    negative.forEach(tc => { out += buildTest(tc, 'NEGATIVE'); });
  }

  // Edge
  if (edge.length) {
    out += banner('EDGE CASES');
    edge.forEach(tc => { out += buildTest(tc, 'EDGE'); });
  }

  out += `});\n`;
  return out;
}

// ── main entry point ──────────────────────────────────────────────────────────

async function generateAdvancedTestAutomation(ROOT, storyId, testCases, summary, aiArtifacts = {}, artifactFolder = '') {
  const results = { success: [], errors: [], files: {}, specFile: '', testDataFile: '' };
  const { original } = normalizeStoryId(storyId);
  const totalCases = ['positive', 'negative', 'edge']
    .reduce((total, category) => total + (Array.isArray(testCases?.[category]) ? testCases[category].length : 0), 0);

  if (totalCases === 0) {
    results.errors.push(`❌ No test cases supplied for ${original}; no automation files were written.`);
    return results;
  }

  try {
    // 1. Locators: Locators/[STORY_ID]-Locators.ts
    const locContent  = aiArtifacts.locators || generateLocatorsFile(original, testCases);
    const scopedFolder = artifactFolder ? `${artifactFolder}/` : '';
    const locRelPath  = `Locators/${scopedFolder}${original}-Locators.ts`;
    const locAbsPath  = path.join(ROOT, locRelPath);
    fs.mkdirSync(path.dirname(locAbsPath), { recursive: true });
    fs.writeFileSync(locAbsPath, locContent, 'utf8');
    results.success.push(`✅ Locators: ${locRelPath}`);
    results.files.locators = locRelPath;

    // 2. Page Object: pages/[STORY_ID]-Page.ts
    const pageContent = aiArtifacts.pageObject || generatePageObjectFile(original, testCases);
    const pageRelPath = `pages/${scopedFolder}${original}-Page.ts`;
    const pageAbsPath = path.join(ROOT, pageRelPath);
    fs.mkdirSync(path.dirname(pageAbsPath), { recursive: true });
    fs.writeFileSync(pageAbsPath, pageContent, 'utf8');
    results.success.push(`✅ Page Object: ${pageRelPath}`);
    results.files.pageObject = pageRelPath;

    // 3. Test Data: Test_Data/[STORY_ID]-test-data.json
    const dataContent = generateTestDataFile(original, testCases, summary);
    const dataRelPath = `Test_Data/${scopedFolder}${original}-test-data.json`;
    const dataAbsPath = path.join(ROOT, dataRelPath);
    fs.mkdirSync(path.dirname(dataAbsPath), { recursive: true });
    fs.writeFileSync(dataAbsPath, dataContent, 'utf8');
    results.success.push(`✅ Test Data: ${dataRelPath}`);
    results.files.testData  = dataRelPath;
    results.testDataFile    = dataRelPath;

    // 4. Test Script: tests/[STORY_ID]/[STORY_ID]-Script.spec.ts
    const specContent = aiArtifacts.testScript
      || generateTestScriptFile(original, summary || 'Test Automation', testCases);
    const testDirectory = artifactFolder || original;
    const specRelPath = `tests/${testDirectory}/${original}-Script.spec.ts`;
    const specAbsPath = path.join(ROOT, specRelPath);
    fs.mkdirSync(path.dirname(specAbsPath), { recursive: true });
    fs.writeFileSync(specAbsPath, specContent, 'utf8');
    results.success.push(`✅ Test Script: ${specRelPath}`);
    results.files.testScript = specRelPath;
    results.specFile         = specRelPath;

  } catch (err) {
    results.errors.push(`❌ Error: ${err.message}`);
    console.error('[generator] Error:', err);
  }

  return results;
}

// Legacy stub — kept for any callers that import this by name
function extractUIInteractionsFromSteps(steps) { return []; }

module.exports = {
  normalizeStoryId,
  generateLocatorsFile,
  generatePageObjectFile,
  generateTestDataFile,
  generateTestScriptFile,
  generateAdvancedTestAutomation,
  // Legacy exports kept for compatibility
  generateIntelligentLocatorsFile: generateLocatorsFile,
  generateAdvancedPageObject:      generatePageObjectFile,
  generateAdvancedTestScript:      generateTestScriptFile,
  extractUIInteractionsFromSteps,
};
