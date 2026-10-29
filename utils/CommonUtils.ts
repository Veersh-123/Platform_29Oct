/**
 * Common Utilities for Playwright Tests
 * File: utils/CommonUtils.ts
 */

import { Page, expect } from '@playwright/test';

export class CommonUtils {
  /**
   * Wait for element to be visible
   */
  static async waitForElementVisible(page: Page, selector: string, timeout = 5000): Promise<void> {
    await page.waitForSelector(selector, { state: 'visible', timeout });
  }

  /**
   * Wait for element to be hidden
   */
  static async waitForElementHidden(page: Page, selector: string, timeout = 5000): Promise<void> {
    await page.waitForSelector(selector, { state: 'hidden', timeout });
  }

  /**
   * Wait for navigation to complete
   */
  static async waitForNavigation(page: Page, navigationPromise: Promise<any>): Promise<void> {
    await navigationPromise;
    await page.waitForLoadState('networkidle');
  }

  /**
   * Get text from element
   */
  static async getText(page: Page, selector: string): Promise<string> {
    await this.waitForElementVisible(page, selector);
    return await page.textContent(selector) || '';
  }

  /**
   * Get value from input element
   */
  static async getInputValue(page: Page, selector: string): Promise<string> {
    return await page.inputValue(selector);
  }

  /**
   * Fill input field
   */
  static async fillInput(page: Page, selector: string, value: string): Promise<void> {
    await this.waitForElementVisible(page, selector);
    await page.fill(selector, value);
  }

  /**
   * Click element
   */
  static async click(page: Page, selector: string): Promise<void> {
    await this.waitForElementVisible(page, selector);
    await page.click(selector);
  }

  /**
   * Check if element is visible
   */
  static async isElementVisible(page: Page, selector: string): Promise<boolean> {
    try {
      await this.waitForElementVisible(page, selector, 2000);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if element contains text
   */
  static async elementContainsText(page: Page, selector: string, text: string): Promise<boolean> {
    try {
      const element = page.locator(selector);
      await expect(element).toContainText(text, { timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Navigate to URL
   */
  static async navigateTo(page: Page, url: string): Promise<void> {
    await page.goto(url, { waitUntil: 'networkidle' });
  }

  /**
   * Wait for specific time (in milliseconds)
   */
  static async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Take screenshot
   */
  static async takeScreenshot(page: Page, filename: string): Promise<void> {
    await page.screenshot({ path: `./screenshots/${filename}.png` });
  }

  /**
   * Get page title
   */
  static async getPageTitle(page: Page): Promise<string> {
    return await page.title();
  }

  /**
   * Check if element is enabled
   */
  static async isElementEnabled(page: Page, selector: string): Promise<boolean> {
    const element = page.locator(selector);
    return await element.isEnabled();
  }

  /**
   * Get list of all elements matching selector
   */
  static async getElementCount(page: Page, selector: string): Promise<number> {
    return await page.locator(selector).count();
  }

  /**
   * Clear input field
   */
  static async clearInput(page: Page, selector: string): Promise<void> {
    await this.waitForElementVisible(page, selector);
    await page.fill(selector, '');
  }

  /**
   * Press key on page
   */
  static async pressKey(page: Page, key: string): Promise<void> {
    await page.keyboard.press(key);
  }

  /**
   * Scroll to element
   */
  static async scrollToElement(page: Page, selector: string): Promise<void> {
    await page.locator(selector).scrollIntoViewIfNeeded();
  }

  /**
   * Get all text from multiple elements
   */
  static async getAllText(page: Page, selector: string): Promise<string[]> {
    return await page.locator(selector).allTextContents();
  }

  /**
   * Wait for URL to contain
   */
  static async waitForURLContains(page: Page, urlString: string, timeout = 5000): Promise<void> {
    await page.waitForURL(`**/*${urlString}*`, { timeout });
  }
}

export default CommonUtils;
