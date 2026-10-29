/**
 * Self-Healing Utilities for Playwright Tests
 * Automatically detects and adapts to UI changes
 * 
 * Features:
 * - Dynamic locator retry with fallbacks
 * - Adaptive element finding
 * - Automatic locator suggestion
 * - Healing logs for debugging
 */

import { Page, Locator } from '@playwright/test';

export interface HealingConfig {
  maxRetries: number;
  retryDelay: number;
  timeout: number;
  logHealing: boolean;
}

export interface AlternativeLocators {
  [key: string]: string[];
}

/**
 * Default healing configuration
 */
const DEFAULT_CONFIG: HealingConfig = {
  maxRetries: 3,
  retryDelay: 500,
  timeout: 10000,
  logHealing: true,
};

/**
 * Self-Healing Utility Class
 * Provides methods for adaptive test execution
 */
export class SelfHealer {
  private page: Page;
  private config: HealingConfig;
  private healingLog: string[] = [];

  constructor(page: Page, config: Partial<HealingConfig> = {}) {
    this.page = page;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Log healing action for debugging
   */
  private log(message: string): void {
    if (this.config.logHealing) {
      console.log(`🔧 [HEALING] ${message}`);
      this.healingLog.push(message);
    }
  }

  /**
   * Get healing logs
   */
  public getHealingLogs(): string[] {
    return this.healingLog;
  }

  /**
   * Try to find element with multiple locators and retry logic
   */
  async findElementWithFallbacks(locators: string[]): Promise<Locator | null> {
    for (const locator of locators) {
      try {
        const element = this.page.locator(locator);
        // Check if element exists
        const count = await element.count();
        if (count > 0) {
          this.log(`✓ Found element using: ${locator}`);
          return element;
        }
      } catch (error) {
        this.log(`✗ Failed to find element using: ${locator}`);
        continue;
      }
    }
    this.log(`✗ No elements found using any of the provided locators`);
    return null;
  }

  /**
   * Retry operation with exponential backoff
   */
  async retryWithBackoff<T>(
    operation: () => Promise<T>,
    operationName: string = 'operation'
  ): Promise<T | null> {
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        this.log(`Attempt ${attempt}/${this.config.maxRetries}: ${operationName}`);
        const result = await operation();
        this.log(`✓ Success: ${operationName}`);
        return result;
      } catch (error) {
        const backoffDelay = this.config.retryDelay * Math.pow(2, attempt - 1);
        this.log(
          `✗ Failed (attempt ${attempt}): ${operationName}. Retry in ${backoffDelay}ms`
        );

        if (attempt < this.config.maxRetries) {
          await this.page.waitForTimeout(backoffDelay);
        }
      }
    }
    this.log(`✗ All ${this.config.maxRetries} attempts failed for: ${operationName}`);
    return null;
  }

  /**
   * Safe scroll with fallback
   */
  async safeScroll(
    locator: Locator | string,
    options: { direction?: 'down' | 'up'; distance?: number } = {}
  ): Promise<boolean> {
    const { direction = 'down', distance = 500 } = options;

    try {
      const element = typeof locator === 'string' ? this.page.locator(locator) : locator;

      // Try scrollIntoViewIfNeeded first
      try {
        await element.scrollIntoViewIfNeeded({ timeout: 3000 });
        this.log(`✓ Scrolled element into view`);
        return true;
      } catch (e) {
        this.log(`⚠ scrollIntoViewIfNeeded failed, trying alternative scroll`);
      }

      // Fallback: Manual scroll
      const isVisible = await element.isVisible().catch(() => false);
      if (!isVisible) {
        // Scroll the page
        const scrollAmount = direction === 'down' ? distance : -distance;
        await this.page.evaluate((amount) => {
          window.scrollBy(0, amount);
        }, scrollAmount);

        this.log(`✓ Scrolled page by ${scrollAmount}px`);
        await this.page.waitForTimeout(500);

        // Check if visible now
        const nowVisible = await element.isVisible().catch(() => false);
        return nowVisible;
      }
      return true;
    } catch (error) {
      this.log(`✗ Safe scroll failed: ${error}`);
      return false;
    }
  }

  /**
   * Safe click with multiple retry strategies
   */
  async safeClick(locator: Locator | string, options: { force?: boolean } = {}): Promise<boolean> {
    const element = typeof locator === 'string' ? this.page.locator(locator) : locator;
    const { force = false } = options;

    return (
      (await this.retryWithBackoff(
        async () => {
          // Strategy 1: Normal click
          try {
            await element.click({ force, timeout: 3000 });
            this.log(`✓ Successfully clicked element`);
            return true;
          } catch (e1) {
            this.log(`⚠ Normal click failed, trying force click`);

            // Strategy 2: Force click
            try {
              await element.click({ force: true, timeout: 3000 });
              this.log(`✓ Successfully force clicked element`);
              return true;
            } catch (e2) {
              this.log(`⚠ Force click failed, trying dispatch click`);

              // Strategy 3: Dispatch click event
              await element.evaluate((el: HTMLElement) => {
                el.click();
              });
              this.log(`✓ Successfully dispatched click event`);
              return true;
            }
          }
        },
        'Click element'
      )) ?? false
    );
  }

  /**
   * Safe fill with automatic element discovery
   */
  async safeFill(locator: Locator | string, value: string): Promise<boolean> {
    const element = typeof locator === 'string' ? this.page.locator(locator) : locator;

    return (
      (await this.retryWithBackoff(
        async () => {
          // Clear first
          await element.clear({ timeout: 2000 });
          this.log(`✓ Cleared input field`);

          // Fill
          await element.fill(value, { timeout: 3000 });
          this.log(`✓ Successfully filled with: ${value}`);

          // Verify
          const filledValue = await element.inputValue({ timeout: 2000 });
          if (filledValue === value) {
            this.log(`✓ Verification passed: Value matches`);
            return true;
          } else {
            throw new Error(`Value mismatch. Expected: ${value}, Got: ${filledValue}`);
          }
        },
        `Fill input with: ${value}`
      )) ?? false
    );
  }

  /**
   * Dynamically find similar elements on the page
   */
  async findSimilarElements(
    searchText: string,
    options: { role?: string; fuzzyMatch?: boolean } = {}
  ): Promise<Locator[]> {
    const { role = 'button', fuzzyMatch = true } = options;

    const locators: string[] = [
      // Exact match
      `${role}:has-text("${searchText}")`,
      // Case insensitive
      `${role}:has-text("${searchText.toLowerCase()}")`,
      // Partial match
      `${role}:has-text("${searchText.split(' ')[0]}")`,
      // Contains text (for HTML)
      `//${role}[contains(., '${searchText}')]`,
    ];

    const found: Locator[] = [];

    for (const locator of locators) {
      try {
        const elements = this.page.locator(locator);
        const count = await elements.count();
        if (count > 0) {
          this.log(`✓ Found ${count} element(s) matching: "${searchText}"`);
          return [elements.first()];
        }
      } catch (error) {
        // Continue to next locator
      }
    }

    this.log(`✗ Could not find elements matching: "${searchText}"`);
    return found;
  }

  /**
   * Wait for element with adaptive timeout
   */
  async waitForElement(
    locator: Locator | string,
    options: { timeout?: number; visible?: boolean } = {}
  ): Promise<boolean> {
    const element = typeof locator === 'string' ? this.page.locator(locator) : locator;
    const { timeout = this.config.timeout, visible = true } = options;

    try {
      if (visible) {
        await element.waitFor({ state: 'visible', timeout });
      } else {
        await element.waitFor({ state: 'attached', timeout });
      }
      this.log(`✓ Element appeared within ${timeout}ms`);
      return true;
    } catch (error) {
      this.log(`✗ Element did not appear within ${timeout}ms`);
      return false;
    }
  }

  /**
   * Get page state information for healing
   */
  async getPageState(): Promise<{
    url: string;
    title: string;
    elementCount: number;
    formFields: string[];
    buttons: string[];
  }> {
    const url = this.page.url();
    const title = await this.page.title();

    const elementCount = await this.page.locator('*').count();

    // Find all form fields
    const formFields = await this.page.locator('input, textarea, select').count();

    // Find all buttons
    const buttons = await this.page.locator('button').count();

    this.log(`📊 Page State: ${url} | Elements: ${elementCount} | Fields: ${formFields} | Buttons: ${buttons}`);

    return {
      url,
      title,
      elementCount,
      formFields: [`Found ${formFields} form fields`],
      buttons: [`Found ${buttons} buttons`],
    };
  }

  /**
   * Suggest alternative locators based on page content
   */
  async suggestAlternativeLocators(elementDescription: string): Promise<string[]> {
    const suggestions: string[] = [];

    // Common patterns
    const patterns = [
      `button:has-text("${elementDescription}")`,
      `a:has-text("${elementDescription}")`,
      `[aria-label*="${elementDescription}"]`,
      `//*[contains(text(), '${elementDescription}')]`,
      `[data-testid*="${elementDescription.toLowerCase()}"]`,
      `[id*="${elementDescription.toLowerCase()}"]`,
      `[class*="${elementDescription.toLowerCase()}"]`,
    ];

    for (const pattern of patterns) {
      try {
        const count = await this.page.locator(pattern).count();
        if (count > 0) {
          suggestions.push(pattern);
          this.log(`✓ Found ${count} element(s) using suggested locator: ${pattern}`);
        }
      } catch (error) {
        // Pattern didn't work, continue
      }
    }

    return suggestions;
  }

  /**
   * Adaptive wait that adjusts based on network conditions
   */
  async adaptiveWait(minTime: number = 500, maxTime: number = 3000): Promise<void> {
    const isSlowNetwork = await this.page.evaluate(() => {
      const connection = (navigator as any).connection;
      if (connection && connection.effectiveType) {
        return connection.effectiveType === '4g' || connection.effectiveType === '3g';
      }
      return false;
    });

    const waitTime = isSlowNetwork ? Math.min(maxTime, minTime * 2) : minTime;
    this.log(`⏱ Adaptive wait: ${waitTime}ms (slow network: ${isSlowNetwork})`);
    await this.page.waitForTimeout(waitTime);
  }

  /**
   * Take screenshot for debugging
   */
  async debugScreenshot(filename: string): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      await this.page.screenshot({ path: `screenshots/healing-debug-${filename}-${timestamp}.png` });
      this.log(`📸 Debug screenshot saved: healing-debug-${filename}-${timestamp}.png`);
    } catch (error) {
      this.log(`⚠ Could not save debug screenshot: ${error}`);
    }
  }
}

/**
 * Alternative locators mapping for common UI elements
 */
export const ALTERNATIVE_LOCATORS: AlternativeLocators = {
  applyNow: [
    'button:has-text("Apply Now")',
    'a:has-text("Apply Now")',
    'a:has-text("Apply now")',
    '[data-testid="apply-button"]',
    'button[id*="apply"]',
    'a[href*="apply"]',
  ],
  startApplication: [
    'button:has-text("start a new application")',
    'button:has-text("Start a new application")',
    'button:has-text("I\'d like to start a new application")',
    '[data-testid="start-application"]',
    'button[id*="start"]',
  ],
  nextButton: [
    'button:has-text("Next")',
    'button:has-text("next")',
    'button[type="submit"]',
    '[data-testid="next-button"]',
    'button[id*="next"]',
  ],
  firstName: [
    'input[name="firstName"]',
    'input[id="firstName"]',
    'input[placeholder*="First"]',
    'input[aria-label*="First"]',
  ],
  lastName: [
    'input[name="lastName"]',
    'input[id="lastName"]',
    'input[placeholder*="Last"]',
    'input[aria-label*="Last"]',
  ],
  disclosure: [
    'button:has-text("Electronic Disclosure")',
    'button:has-text("Disclosure")',
    '[data-testid="disclosure-button"]',
    'button[id*="disclosure"]',
  ],
};
