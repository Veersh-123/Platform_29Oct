/**
 * Test Automation Generator
 * Handles creation of locators, page objects, and test scripts
 * when the "Generate Test Scripts" button is clicked from the dashboard
 */

const fs = require('fs');
const path = require('path');

/**
 * Normalize story ID to camelCase and PascalCase versions
 * e.g., "VB-2" -> { camelCase: "vb2", PascalCase: "VB2", original: "VB-2" }
 */
function normalizeStoryId(storyId) {
  const clean = storyId.replace(/[^a-zA-Z0-9]/g, '');
  return {
    original: storyId,
    normalized: clean,
    camelCase: clean.toLowerCase(),
    PascalCase: clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase(),
  };
}

/**
 * Extract UI elements and locators from test case steps
 */
function extractLocatorsFromTestCases(testCases) {
  const locators = {
    login: {},
    dashboard: {},
    menu: {},
    transfer: {},
    history: {},
    common: {}
  };

  // Analyze all test steps to identify UI elements
  const allCases = [...(testCases.positive || []), ...(testCases.negative || [])];
  const allSteps = allCases.flatMap(tc => tc.steps || []).join(' ').toLowerCase();

  // Extract dynamic locators based on test content
  if (allSteps.includes('username') && allSteps.includes('login')) {
    locators.login.usernameInput = 'input[type="text"]:has-text("username"), input[placeholder*="username"]';
    locators.login.passwordInput = 'input[type="password"]';
    locators.login.loginButton = 'button:has-text("Login"), button[type="submit"]';
    locators.login.errorMessage = '[role="alert"], .error, [class*="error"]';
  }

  if (allSteps.includes('dashboard') || allSteps.includes('account balance')) {
    locators.dashboard.balanceDisplay = 'text=$ >> visible=true';
    locators.dashboard.welcomeMessage = 'h1';
  }

  if (allSteps.includes('transfer')) {
    locators.transfer.recipientAccountInput = 'input[placeholder*="account"], input[placeholder*="recipient"]';
    locators.transfer.amountInput = 'input[type="number"], input[placeholder*="amount"]';
    locators.transfer.descriptionInput = 'textarea, input[placeholder*="description"]';
    locators.transfer.transferButton = 'button:has-text("Transfer"), button[type="submit"]';
    locators.transfer.successMessage = 'text=success >> visible=true';
    locators.transfer.errorMessage = '[role="alert"], .error';
  }

  if (allSteps.includes('history') || allSteps.includes('transaction')) {
    locators.history.expenseFilter = 'button:has-text("Expense")';
    locators.history.incomeFilter = 'button:has-text("Income")';
    locators.history.searchInput = 'input[type="search"], input[placeholder*="search"]';
    locators.history.searchButton = 'button:has-text("Search")';
    locators.history.transactionTable = 'table';
  }

  if (allSteps.includes('menu')) {
    locators.menu.transferMenuItem = 'a:has-text("Transfer"), button:has-text("Transfer")';
    locators.menu.historyMenuItem = 'a:has-text("History"), button:has-text("History")';
  }

  return locators;
}

/**
 * Generate locators file content
 */
function generateLocatorsContent(storyId, testCases) {
  const { PascalCase } = normalizeStoryId(storyId);
  const extractedLocators = extractLocatorsFromTestCases(testCases);
  
  let locatorContent = `/**
 * Locators for ${storyId} - ${extractSummaryFromCases(testCases)}
 * File: Locators/${PascalCase}.locators.ts
 * Auto-generated from test cases. Modify selectors based on actual UI structure.
 */

export const ${PascalCase}Locators = {`;

  // Add login locators if they exist
  if (Object.keys(extractedLocators.login).length > 0) {
    locatorContent += `
  login: {`;
    Object.entries(extractedLocators.login).forEach(([key, value]) => {
      locatorContent += `
    ${key}: '${value}',`;
    });
    locatorContent += `
  },`;
  }

  // Add dashboard locators
  if (Object.keys(extractedLocators.dashboard).length > 0) {
    locatorContent += `
  dashboard: {`;
    Object.entries(extractedLocators.dashboard).forEach(([key, value]) => {
      locatorContent += `
    ${key}: '${value}',`;
    });
    locatorContent += `
  },`;
  }

  // Add menu locators
  if (Object.keys(extractedLocators.menu).length > 0) {
    locatorContent += `
  menu: {`;
    Object.entries(extractedLocators.menu).forEach(([key, value]) => {
      locatorContent += `
    ${key}: '${value}',`;
    });
    locatorContent += `
  },`;
  }

  // Add transfer locators
  if (Object.keys(extractedLocators.transfer).length > 0) {
    locatorContent += `
  transfer: {`;
    Object.entries(extractedLocators.transfer).forEach(([key, value]) => {
      locatorContent += `
    ${key}: '${value}',`;
    });
    locatorContent += `
  },`;
  }

  // Add history locators
  if (Object.keys(extractedLocators.history).length > 0) {
    locatorContent += `
  history: {`;
    Object.entries(extractedLocators.history).forEach(([key, value]) => {
      locatorContent += `
    ${key}: '${value}',`;
    });
    locatorContent += `
  },`;
  }

  locatorContent += `
  common: {
    loader: '.spinner, [class*="loader"]',
    pageTitle: 'h1, h2',
  },
};
`;

  return locatorContent;
}

/**
 * Generate page object methods from test case steps
 */
function generatePageObjectMethods(testCases) {
  let methods = '';
  const { PascalCase: pageNameShort } = normalizeStoryId('Page');
  const pageName = 'page';

  // Analyze test cases to determine which methods to generate
  const allSteps = [...(testCases.positive || []), ...(testCases.negative || [])].flatMap(tc => tc.steps || []);

  // Generate login method
  if (allSteps.some(step => step.toLowerCase().includes('login'))) {
    methods += `
  /**
   * Login with provided credentials
   */
  async login(username: string, password: string): Promise<void> {
    await this.page.fill('input[type="text"]', username);
    await this.page.fill('input[type="password"]', password);
    await this.page.click('button:has-text("Login"), button[type="submit"]');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);
  }

  async verifyLoginSuccess(): Promise<boolean> {
    try {
      await this.page.waitForSelector('h1', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async getLoginError(): Promise<string> {
    try {
      const error = await this.page.textContent('[role="alert"], .error, [class*="error"]');
      return error || '';
    } catch {
      return '';
    }
  }
`;
  }

  // Generate transfer methods
  if (allSteps.some(step => step.toLowerCase().includes('transfer'))) {
    methods += `
  /**
   * Navigate to transfer screen
   */
  async goToTransfer(): Promise<void> {
    await this.page.click('a:has-text("Transfer"), button:has-text("Transfer")');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);
  }

  /**
   * Complete a transfer
   */
  async performTransfer(recipientAccount: string, amount: string, description: string): Promise<void> {
    const inputs = await this.page.$$('input');
    if (inputs.length > 0) {
      await inputs[0].fill(recipientAccount);
    }
    if (inputs.length > 1) {
      await inputs[1].fill(amount);
    }
    const textareas = await this.page.$$('textarea');
    if (textareas.length > 0) {
      await textareas[0].fill(description);
    }
    await this.page.click('button:has-text("Transfer"), button[type="submit"]');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);
  }

  async verifyTransferSuccess(): Promise<boolean> {
    try {
      const successText = await this.page.textContent('text=success, text=completed, text=transferred');
      return !!successText;
    } catch {
      return false;
    }
  }

  async getTransferError(): Promise<string> {
    try {
      const error = await this.page.textContent('[role="alert"], .error');
      return error || '';
    } catch {
      return '';
    }
  }
`;
  }

  // Generate history methods
  if (allSteps.some(step => step.toLowerCase().includes('history'))) {
    methods += `
  /**
   * Navigate to transaction history
   */
  async goToHistory(): Promise<void> {
    await this.page.click('a:has-text("History"), button:has-text("History")');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);
  }

  /**
   * Apply expense filter
   */
  async applyExpenseFilter(): Promise<void> {
    await this.page.click('button:has-text("Expense")');
    await this.page.waitForTimeout(500);
  }

  /**
   * Search transactions
   */
  async searchTransaction(keyword: string): Promise<void> {
    await this.page.fill('input[type="search"], input[placeholder*="search"]', keyword);
    await this.page.click('button:has-text("Search")');
    await this.page.waitForTimeout(1000);
  }

  async verifyTransactionFound(): Promise<boolean> {
    try {
      const rows = await this.page.$$('table tr');
      return rows.length > 1; // More than header row
    } catch {
      return false;
    }
  }
`;
  }

  // Common methods
  methods += `
  /**
   * Get current balance
   */
  async getBalance(): Promise<string> {
    try {
      const balanceText = await this.page.textContent('text=/\\$.*\\d/');
      return balanceText || '';
    } catch {
      return '';
    }
  }

  /**
   * Verify dashboard loaded
   */
  async isDashboardLoaded(): Promise<boolean> {
    try {
      await this.page.waitForSelector('h1, h2', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Take screenshot
   */
  async takeScreenshot(name: string): Promise<void> {
    const dir = './screenshots';
    if (!require('fs').existsSync(dir)) {
      require('fs').mkdirSync(dir, { recursive: true });
    }
    await this.page.screenshot({ path: \`\${dir}/\${name}.png\` });
  }
`;

  return methods;
}

/**
 * Generate page object file content
 */
function generatePageObjectContent(storyId, testCases) {
  const { PascalCase } = normalizeStoryId(storyId);
  const methods = generatePageObjectMethods(testCases);
  
  return `/**
 * Page Object for ${storyId}
 * Auto-generated from test cases
 * File: pages/${PascalCase}Page.ts
 */

import { Page } from '@playwright/test';
import { ${PascalCase}Locators } from '../Locators/${PascalCase}.locators';

export class ${PascalCase}Page {
  constructor(private page: Page) {}

  /**
   * Navigate to application
   */
  async navigateTo(url: string = 'https://vb-bank-demo.vercel.app/'): Promise<void> {
    await this.page.goto(url, { waitUntil: 'networkidle' });
  }
${methods}
}
`;
}

/**
 * Generate test script file content using test cases and page objects
 */
function generateTestScriptContent(storyId, summary, testCases) {
  const { original, PascalCase } = normalizeStoryId(storyId);
  const now = new Date().toISOString().split('T')[0];
  const pageVarName = PascalCase.charAt(0).toLowerCase() + PascalCase.slice(1);

  let scriptContent = `/**
 * ${original} Test Scripts
 * Auto-generated from test cases on ${now}
 *
 * Story   : ${original}
 * URL     : https://vb-bank-demo.vercel.app/
 * Cases   : ${testCases.positive?.length || 0} positive, ${testCases.negative?.length || 0} negative
 */

import { test, expect } from '@playwright/test';
import { ${PascalCase}Page } from '../../pages/${PascalCase}Page';
import testData from '../../Test_Data/${original}.json';

test.describe('${original}: ${summary}', () => {
  let ${pageVarName}: ${PascalCase}Page;

  test.beforeEach(async ({ page }) => {
    ${pageVarName} = new ${PascalCase}Page(page);
  });

`;

  // Generate positive test cases
  const positives = testCases.positive || [];
  positives.forEach((tc, index) => {
    const tcId = `${original}-TC_${String(index + 1).padStart(3, '0')}`;
    scriptContent += `  test('${tcId}: ${tc.title}', async () => {
    test.info().annotations.push({ type: 'Story', description: '${original}' });
    test.info().annotations.push({ type: 'Type', description: 'Positive' });
    test.info().annotations.push({ type: 'Priority', description: '${tc.priority || 'High'}' });

    // Preconditions
    await ${pageVarName}.navigateTo();
    await ${pageVarName}.login(testData.validCredentials.username, testData.validCredentials.password);
    await expect(${pageVarName}.page).toHaveTitle(/dashboard|account|welcome/i);

    // Verify expected result
    const isDashboardReady = await ${pageVarName}.isDashboardLoaded();
    expect(isDashboardReady).toBe(true);

    // Test completed
    await ${pageVarName}.takeScreenshot('${tcId}_pass');
  });

`;
  });

  // Generate negative test cases with specific error handling
  const negatives = testCases.negative || [];
  negatives.forEach((tc, index) => {
    const tcId = `${original}-TC_N${String(index + 1).padStart(2, '0')}`;
    let testSteps = '';

    if (tc.title.toLowerCase().includes('wrong password') || tc.title.toLowerCase().includes('incorrect')) {
      testSteps = `    // Attempt login with wrong password
    await ${pageVarName}.navigateTo();
    await ${pageVarName}.login(testData.validCredentials.username, testData.invalidPassword);
    
    // Verify login failure
    const error = await ${pageVarName}.getLoginError();
    expect(error).toBeTruthy();
    expect(error.toLowerCase()).toContain('invalid');`;
    } else if (tc.title.toLowerCase().includes('insufficient balance')) {
      testSteps = `    // Setup: login and navigate to transfer
    await ${pageVarName}.navigateTo();
    await ${pageVarName}.login(testData.validCredentials.username, testData.validCredentials.password);
    await ${pageVarName}.goToTransfer();
    
    // Attempt transfer with more than balance
    await ${pageVarName}.performTransfer(testData.recipientAccount, '9999', testData.transferDescription);
    
    // Verify error for insufficient balance
    const error = await ${pageVarName}.getTransferError();
    expect(error).toBeTruthy();
    expect(error.toLowerCase()).toContain('balance|insufficient');`;
    } else if (tc.title.toLowerCase().includes('invalid account')) {
      testSteps = `    // Setup: login and navigate to transfer
    await ${pageVarName}.navigateTo();
    await ${pageVarName}.login(testData.validCredentials.username, testData.validCredentials.password);
    await ${pageVarName}.goToTransfer();
    
    // Attempt transfer with invalid account
    await ${pageVarName}.performTransfer('invalid123', '100', testData.transferDescription);
    
    // Verify error for invalid account
    const error = await ${pageVarName}.getTransferError();
    expect(error).toBeTruthy();
    expect(error.toLowerCase()).toContain('invalid|account');`;
    } else if (tc.title.toLowerCase().includes('empty') || tc.title.toLowerCase().includes('mandatory')) {
      testSteps = `    // Setup: login and navigate to transfer
    await ${pageVarName}.navigateTo();
    await ${pageVarName}.login(testData.validCredentials.username, testData.validCredentials.password);
    await ${pageVarName}.goToTransfer();
    
    // Attempt transfer without required field
    await ${pageVarName}.performTransfer('', '100', testData.transferDescription);
    
    // Verify validation error
    const error = await ${pageVarName}.getTransferError();
    expect(error).toBeTruthy();`;
    } else if (tc.title.toLowerCase().includes('negative amount') || tc.title.toLowerCase().includes('invalid amount')) {
      testSteps = `    // Setup: login and navigate to transfer
    await ${pageVarName}.navigateTo();
    await ${pageVarName}.login(testData.validCredentials.username, testData.validCredentials.password);
    await ${pageVarName}.goToTransfer();
    
    // Attempt transfer with invalid amount
    await ${pageVarName}.performTransfer(testData.recipientAccount, '-100', testData.transferDescription);
    
    // Verify validation error
    const error = await ${pageVarName}.getTransferError();
    expect(error).toBeTruthy();
    expect(error.toLowerCase()).toContain('amount|positive|valid');`;
    } else {
      testSteps = `    // Generic negative test
    await ${pageVarName}.navigateTo();
    const loaded = await ${pageVarName}.isDashboardLoaded();
    expect(loaded).toBeDefined();`;
    }

    scriptContent += `  test('${tcId}: ${tc.title}', async () => {
    test.info().annotations.push({ type: 'Story', description: '${original}' });
    test.info().annotations.push({ type: 'Type', description: 'Negative' });
    test.info().annotations.push({ type: 'Priority', description: '${tc.priority || 'High'}' });

${testSteps}

    // Test completed
    await ${pageVarName}.takeScreenshot('${tcId}_fail');
  });

`;
  });

  scriptContent += `});
`;

  return scriptContent;
}

/**
 * Generate test data JSON with data extracted from test cases
 */
function generateTestDataContent(storyId, testCases) {
  const testData = {
    storyId,
    appUrl: 'https://vb-bank-demo.vercel.app/',
    validCredentials: {
      username: 'john.doe',
      password: 'user123',
    },
    invalidPassword: 'wrongpassword',
    recipientAccount: '3456789012',
    transferAmount: '250',
    transferDescription: 'Towards trip to Orlando',
    searchKeyword: 'Orlando',
    testCasesGenerated: testCases.positive?.length || 0,
    negativeTestCases: testCases.negative?.length || 0,
  };

  // Extract specific test data from test cases
  if (testCases.positive && testCases.positive.length > 0) {
    const firstPositive = testCases.positive[0];
    if (firstPositive.steps) {
      // Try to extract account number from steps
      const accountMatch = firstPositive.steps.join(' ').match(/account\s*(?:number|#)?\s*[":'"']?(\d{10})/i);
      if (accountMatch) testData.recipientAccount = accountMatch[1];

      // Try to extract amount
      const amountMatch = firstPositive.steps.join(' ').match(/\$?\s*(\d+)/);
      if (amountMatch) testData.transferAmount = amountMatch[1];

      // Try to extract description
      const descMatch = firstPositive.steps.join(' ').match(/description[^.]*[":'"']([^"']+)[":'"']/i);
      if (descMatch) testData.transferDescription = descMatch[1];
    }
  }

  return JSON.stringify(testData, null, 2);
}

/**
 * Extract summary from test cases
 */
function extractSummaryFromCases(testCases) {
  if (testCases.positive && testCases.positive.length > 0) {
    return testCases.positive[0].summary || 'Bank Transfer Application';
  }
  return 'Test Automation';
}

/**
 * Main function: Generate all automation files for a story
 */
async function generateTestAutomation(ROOT, storyId, testCases, summary) {
  const results = {
    success: [],
    errors: [],
  };

  const { original, PascalCase } = normalizeStoryId(storyId);

  try {
    // 1. Generate Locators
    const locatorsContent = generateLocatorsContent(original, testCases);
    const locatorsPath = path.join(ROOT, 'Locators', `${PascalCase}.locators.ts`);
    const locatorsDir = path.dirname(locatorsPath);
    if (!fs.existsSync(locatorsDir)) fs.mkdirSync(locatorsDir, { recursive: true });
    fs.writeFileSync(locatorsPath, locatorsContent, 'utf8');
    results.success.push(`✅ Created Locators/${PascalCase}.locators.ts`);

    // 2. Generate Page Object
    const pageObjectContent = generatePageObjectContent(original, testCases);
    const pageObjectPath = path.join(ROOT, 'pages', `${PascalCase}Page.ts`);
    const pageObjectDir = path.dirname(pageObjectPath);
    if (!fs.existsSync(pageObjectDir)) fs.mkdirSync(pageObjectDir, { recursive: true });
    fs.writeFileSync(pageObjectPath, pageObjectContent, 'utf8');
    results.success.push(`✅ Created pages/${PascalCase}Page.ts`);

    // 3. Generate Test Script
    const testScriptContent = generateTestScriptContent(original, summary || 'Test Automation', testCases);
    const testScriptPath = path.join(ROOT, 'tests', original, `${original}-Script.spec.ts`);
    const testScriptDir = path.dirname(testScriptPath);
    if (!fs.existsSync(testScriptDir)) fs.mkdirSync(testScriptDir, { recursive: true });
    fs.writeFileSync(testScriptPath, testScriptContent, 'utf8');
    results.success.push(`✅ Created tests/${original}/${original}-Script.spec.ts`);

    // 4. Generate Test Data
    const testDataContent = generateTestDataContent(original, testCases);
    const testDataPath = path.join(ROOT, 'Test_Data', `${original}.json`);
    const testDataDir = path.dirname(testDataPath);
    if (!fs.existsSync(testDataDir)) fs.mkdirSync(testDataDir, { recursive: true });
    fs.writeFileSync(testDataPath, testDataContent, 'utf8');
    results.success.push(`✅ Created Test_Data/${original}.json`);

  } catch (err) {
    results.errors.push(`❌ Error: ${err.message}`);
  }

  return results;
}

module.exports = {
  normalizeStoryId,
  generateLocatorsContent,
  generatePageObjectContent,
  generateTestScriptContent,
  generateTestDataContent,
  generateTestAutomation,
};
