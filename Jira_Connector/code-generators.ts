/**
 * Code Generators - AI Response Parsing & Code Generation
 * 
 * Converts Claude AI responses into production-ready TypeScript code
 */

import * as fs from 'fs';
import * as path from 'path';
import * as winston from 'winston';
import { createLogger } from './logger';

export class PageObjectGenerator {
  private logger: winston.Logger;

  constructor() {
    this.logger = createLogger('page-object-generator');
  }

  /**
   * Parse Claude response and generate page object TypeScript code
   */
  async generatePageObjectFromAI(
    aiResponse: string,
    pageName: string,
    testCases: string,
    outputDir: string = 'pages'
  ): Promise<string> {
    this.logger.info(`Generating page object for: ${pageName}`);

    // Extract code from markdown code blocks if present
    let code = this.extractCodeFromResponse(aiResponse);

    // If Claude provided structured response, clean it up
    if (!code.includes('export class')) {
      // Try to parse as structured response
      code = this.buildPageObjectTemplate(pageName, testCases);
    }

    // Ensure proper imports
    code = this.ensureImports(code);

    // Validate TypeScript syntax
    this.validateTypeScript(code);

    // Save to file
    const filepath = await this.savePageObject(code, pageName, outputDir);

    this.logger.info(`✓ Page object saved: ${filepath}`);
    return filepath;
  }

  /**
   * Extract code from markdown code blocks
   */
  private extractCodeFromResponse(response: string): string {
    const match = response.match(/```(?:typescript|ts)?\n([\s\S]*?)```/);
    if (match && match[1]) {
      return match[1].trim();
    }
    return response;
  }

  /**
   * Build page object template if AI response needs structure
   */
  private buildPageObjectTemplate(pageName: string, testCases: string): string {
    // Extract test case methods from test cases markdown
    const methodNames = this.extractMethodNamesFromTestCases(testCases);

    let code = `/**
 * ${pageName} - Page Object with Self-Healing
 * 
 * This page object extends BasePage for automatic self-healing capabilities.
 * All interactions use self-healing methods for resilience to UI changes.
 */

import { Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { ${pageName}Locators as Locators } from '../locators';

/**
 * Page Object for ${pageName}
 * 
 * Business-level action methods for user interactions on this page.
 * All methods use self-healing for automatic locator adaptation.
 */
export class ${pageName} extends BasePage {
  constructor(page: Page) {
    super(page);
    this.pageName = '${pageName}';
  }

`;

    // Generate method stubs from test cases
    methodNames.forEach((methodName) => {
      code += `  /**
   * ${methodName}
   * 
   * TODO: Implement business-level action method
   */
  async ${methodName}(): Promise<void> {
    this.log('${methodName} called');
    // TODO: Implement method using self-healing locators
    // Example: await this.click(Locators.submitButton);
  }

`;
    });

    code += `  /**
   * Get healing logs for diagnostics
   */
  getHealingLogs(): string[] {
    return super.getHealingLogs();
  }
}

export default ${pageName};
`;

    return code;
  }

  /**
   * Extract method names from test cases
   */
  private extractMethodNamesFromTestCases(testCases: string): string[] {
    const methods = new Set<string>();
    const lines = testCases.split('\n');
    
    lines.forEach((line) => {
      // Look for patterns like "User fills login form" and convert to camelCase
      const match = line.match(/(?:Step|Action):\s*(.+?)(?:\(|$)/);
      if (match) {
        const action = match[1]
          .toLowerCase()
          .replace(/\s+/g, ' ')
          .split(' ')
          .map((word, idx) =>
            idx === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
          )
          .join('');
        
        if (action.length > 2) {
          methods.add(action);
        }
      }
    });

    return Array.from(methods).slice(0, 10); // Limit to 10 methods
  }

  /**
   * Ensure proper imports
   */
  private ensureImports(code: string): string {
    const requiredImports = [
      "import { Page } from '@playwright/test';",
      'import { BasePage } from \'./BasePage\';',
    ];

    let finalCode = code;
    
    requiredImports.forEach((importStatement) => {
      if (!finalCode.includes(importStatement) && !finalCode.includes('import')) {
        finalCode = `${importStatement}\n\n${finalCode}`;
      }
    });

    return finalCode;
  }

  /**
   * Validate TypeScript syntax (basic check)
   */
  private validateTypeScript(code: string): void {
    const errors: string[] = [];

    // Check for matching braces
    const openBraces = (code.match(/{/g) || []).length;
    const closeBraces = (code.match(/}/g) || []).length;
    if (openBraces !== closeBraces) {
      errors.push(`Brace mismatch: ${openBraces} opening, ${closeBraces} closing`);
    }

    // Check for matching parentheses
    const openParens = (code.match(/\(/g) || []).length;
    const closeParens = (code.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      errors.push(`Parenthesis mismatch: ${openParens} opening, ${closeParens} closing`);
    }

    if (errors.length > 0) {
      this.logger.warn(`TypeScript validation warnings: ${errors.join(', ')}`);
    }
  }

  /**
   * Save page object to file
   */
  private async savePageObject(
    code: string,
    pageName: string,
    outputDir: string
  ): Promise<string> {
    const filename = `${pageName}.ts`;
    const filepath = path.join(outputDir, filename);

    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(filepath, code, 'utf-8');

    return filepath;
  }
}

export class TestScriptGenerator {
  private logger: winston.Logger;

  constructor() {
    this.logger = createLogger('test-script-generator');
  }

  /**
   * Generate test script from AI response
   */
  async generateTestScriptFromAI(
    aiResponse: string,
    storyId: string,
    pageName: string,
    testCases: string,
    testDataFile: string,
    outputDir: string = 'tests'
  ): Promise<string> {
    this.logger.info(`Generating test script for: ${storyId}`);

    // Extract code from markdown
    let code = this.extractCodeFromResponse(aiResponse);

    // If not valid, build template
    if (!code.includes('test.describe')) {
      code = this.buildTestScriptTemplate(storyId, pageName, testCases, testDataFile);
    }

    // Ensure proper imports
    code = this.ensureImports(code, pageName, testDataFile);

    // Validate syntax
    this.validateTypeScript(code);

    // Save to file
    const filepath = await this.saveTestScript(code, storyId, outputDir);

    this.logger.info(`✓ Test script saved: ${filepath}`);
    return filepath;
  }

  /**
   * Extract code from markdown
   */
  private extractCodeFromResponse(response: string): string {
    const match = response.match(/```(?:typescript|ts)?\n([\s\S]*?)```/);
    if (match && match[1]) {
      return match[1].trim();
    }
    return response;
  }

  /**
   * Build test script template
   */
  private buildTestScriptTemplate(
    storyId: string,
    pageName: string,
    testCases: string,
    testDataFile: string
  ): string {
    // Extract test case names from markdown
    const testNames = this.extractTestCaseNamesFromMarkdown(testCases);

    let code = `/**
 * ${storyId} - Automated Test Script
 * 
 * Auto-generated test script using Page Object Model (POM) pattern.
 * All tests use self-healing page objects for resilience.
 */

import { test, expect } from '@playwright/test';
import { ${pageName} } from '../../pages/${pageName}';
import testData from '../../Test_Data/${testDataFile}';

/**
 * Test Suite: ${storyId}
 */
test.describe('${storyId}: Test Suite', () => {
  let page: ${pageName};

  test.beforeEach(async ({ page: playwrightPage }) => {
    page = new ${pageName}(playwrightPage);
    playwrightPage.setDefaultTimeout(45000);
    playwrightPage.setDefaultNavigationTimeout(60000);
  });

  test.afterEach(async ({ page: playwrightPage }) => {
    try {
      // Cleanup if needed
    } catch (e) {
      // Ignore cleanup errors
    }
  });

`;

    // Generate test cases
    testNames.forEach((testName, idx) => {
      const testId = `TC_${storyId}_${String(idx + 1).padStart(3, '0')}`;
      
      code += `  /**
   * ${testId} - ${testName}
   */
  test('${testId} - ${testName}', async ({ page: playwrightPage }) => {
    test.info().annotations.push({
      type: 'severity',
      description: 'High',
    });
    test.info().annotations.push({
      type: 'testType',
      description: 'Positive',
    });

    try {
      await test.step('Execute test', async () => {
        // TODO: Implement test steps
        // Example: await page.navigateTo(testData.baseUrl);
      });

      await test.step('Verify results', async () => {
        // TODO: Add assertions
        // Example: expect(result).toBe(true);
      });
    } catch (error) {
      await page.captureScreenshot('${testId}-FAILED');
      throw error;
    }
  });

`;
    });

    code += `});

export default {};
`;

    return code;
  }

  /**
   * Extract test case names from markdown
   */
  private extractTestCaseNamesFromMarkdown(markdown: string): string[] {
    const names: string[] = [];
    const lines = markdown.split('\n');

    lines.forEach((line) => {
      if (line.startsWith('## Test Case:') || line.includes('**Title**:')) {
        const title = line
          .replace(/^## Test Case:|**Title**:|^[\s*]+/g, '')
          .trim();
        
        if (title.length > 3) {
          names.push(title);
        }
      }
    });

    return names.slice(0, 10); // Limit to 10 test cases
  }

  /**
   * Ensure proper imports
   */
  private ensureImports(
    code: string,
    pageName: string,
    testDataFile: string
  ): string {
    const requiredImports = [
      "import { test, expect } from '@playwright/test';",
      `import { ${pageName} } from '../../pages/${pageName}';`,
      `import testData from '../../Test_Data/${testDataFile}';`,
    ];

    let finalCode = code;

    requiredImports.forEach((importStatement) => {
      if (!finalCode.includes(importStatement)) {
        finalCode = `${importStatement}\n`;
      }
    });

    return finalCode + '\n' + code;
  }

  /**
   * Validate TypeScript
   */
  private validateTypeScript(code: string): void {
    const errors: string[] = [];

    const openBraces = (code.match(/{/g) || []).length;
    const closeBraces = (code.match(/}/g) || []).length;
    if (openBraces !== closeBraces) {
      errors.push(`Brace mismatch: ${openBraces} vs ${closeBraces}`);
    }

    const openParens = (code.match(/\(/g) || []).length;
    const closeParens = (code.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      errors.push(`Parenthesis mismatch: ${openParens} vs ${closeParens}`);
    }

    if (errors.length > 0) {
      this.logger.warn(`TypeScript validation: ${errors.join(', ')}`);
    }
  }

  /**
   * Save test script to file
   */
  private async saveTestScript(
    code: string,
    storyId: string,
    outputDir: string
  ): Promise<string> {
    const storyDir = path.join(outputDir, storyId);
    const filename = `${storyId}-Script.spec.ts`;
    const filepath = path.join(storyDir, filename);

    fs.mkdirSync(storyDir, { recursive: true });
    fs.writeFileSync(filepath, code, 'utf-8');

    return filepath;
  }
}

export class TestDataGenerator {
  private logger: winston.Logger;

  constructor() {
    this.logger = createLogger('test-data-generator');
  }

  /**
   * Generate test data from AI response
   */
  async generateTestDataFromAI(
    aiResponse: string,
    storyId: string,
    outputDir: string = 'Test_Data'
  ): Promise<string> {
    this.logger.info(`Generating test data for: ${storyId}`);

    // Extract JSON from response
    let testData = this.extractJSONFromResponse(aiResponse);

    // Validate JSON
    try {
      JSON.parse(testData);
    } catch (e) {
      this.logger.warn('Invalid JSON in AI response, using template');
      testData = JSON.stringify(this.buildTestDataTemplate(), null, 2);
    }

    // Save to file
    const filepath = await this.saveTestData(testData, storyId, outputDir);

    this.logger.info(`✓ Test data saved: ${filepath}`);
    return filepath;
  }

  /**
   * Extract JSON from response
   */
  private extractJSONFromResponse(response: string): string {
    const match = response.match(/```json\n([\s\S]*?)```/);
    if (match && match[1]) {
      return match[1].trim();
    }

    // Try to find raw JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return jsonMatch[0];
    }

    return JSON.stringify(this.buildTestDataTemplate(), null, 2);
  }

  /**
   * Build test data template
   */
  private buildTestDataTemplate(): any {
    return {
      baseUrl: 'https://example.com',
      timeout: 45000,
      credentials: {
        valid: {
          username: 'test_user@example.com',
          password: 'SecurePassword123',
        },
        invalid: {
          username: 'invalid@example.com',
          password: 'WrongPassword',
        },
      },
      testScenarios: {
        TC_001: {
          description: 'Happy path scenario',
          input: {},
          expected: {},
        },
        TC_002: {
          description: 'Negative scenario',
          input: {},
          expected: {},
        },
      },
    };
  }

  /**
   * Save test data to file
   */
  private async saveTestData(
    data: string,
    storyId: string,
    outputDir: string
  ): Promise<string> {
    const filename = `${storyId}-test-data.json`;
    const filepath = path.join(outputDir, filename);

    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(filepath, data, 'utf-8');

    return filepath;
  }
}

export default { PageObjectGenerator, TestScriptGenerator, TestDataGenerator };
