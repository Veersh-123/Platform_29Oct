/**
 * LocatorHealer - Playwright-based Self-Healing Locator System
 * 
 * Features:
 * - Intelligent locator composition and fallback
 * - Native Playwright Locator API usage
 * - Real-time healing logs
 * - Selector adaptation based on failures
 * 
 * Usage:
 * const healer = new LocatorHealer(page);
 * const element = await healer.find({
 *   primary: 'input[placeholder*="destination"]',
 *   fallbacks: ['input[name="location"]', '[data-testid="destination"]'],
 *   description: 'Destination Input'
 * });
 */

import { Page, Locator } from '@playwright/test';

export interface LocatorConfig {
  primary: string;
  fallbacks: string[];
  description?: string;
  timeout?: number;
  retries?: number;
}

export interface HealingAttempt {
  selector: string;
  success: boolean;
  timestamp: number;
  error?: string;
}

export interface HealingReport {
  elementDescription: string;
  attempts: HealingAttempt[];
  successfulSelector?: string;
  totalAttempts: number;
  totalTime: number;
  healed: boolean;
}

/**
 * LocatorHealer - Core self-healing engine
 */
export class LocatorHealer {
  private page: Page;
  private healingLog: HealingReport[] = [];
  private selectorCache: Map<string, string> = new Map();

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Find element with intelligent fallback strategy
   */
  async find(config: LocatorConfig): Promise<Locator | null> {
    const startTime = Date.now();
    const {
      primary,
      fallbacks,
      description = 'Element',
      timeout = 5000,
      retries = 2,
    } = config;

    const report: HealingReport = {
      elementDescription: description,
      attempts: [],
      totalAttempts: 0,
      totalTime: 0,
      healed: false,
    };

    // Check cache first
    const cached = this.selectorCache.get(description);
    if (cached) {
      try {
        const element = this.page.locator(cached);
        const count = await element.count();
        if (count > 0) {
          console.log(`✓ [HEALING] Using cached selector for ${description}: ${cached}`);
          report.successfulSelector = cached;
          report.healed = true;
          report.totalTime = Date.now() - startTime;
          this.healingLog.push(report);
          return element;
        }
      } catch (error) {
        console.log(`✗ [HEALING] Cached selector failed for ${description}, trying primary`);
        this.selectorCache.delete(description);
      }
    }

    // Build selector list: primary + fallbacks
    const selectors = [primary, ...fallbacks];

    for (let attempt = 1; attempt <= retries; attempt++) {
      for (const selector of selectors) {
        const attemptStart = Date.now();

        try {
          const element = this.page.locator(selector);

          // Check if element exists and is visible/attached
          const count = await Promise.race([
            element.count(),
            new Promise<number>((_, reject) =>
              setTimeout(() => reject(new Error('Count timeout')), timeout)
            ),
          ]);

          if (count > 0) {
            const attemptTime = Date.now() - attemptStart;
            report.attempts.push({
              selector,
              success: true,
              timestamp: Date.now(),
            });
            report.successfulSelector = selector;
            report.healed = true;
            report.totalAttempts = report.attempts.length;
            report.totalTime = Date.now() - startTime;

            // Cache successful selector
            this.selectorCache.set(description, selector);

            console.log(
              `✓ [HEALING] Found ${description} using selector (attempt ${attempt}): ${selector} (${attemptTime}ms)`
            );
            this.healingLog.push(report);
            return element;
          }
        } catch (error) {
          const attemptTime = Date.now() - attemptStart;
          report.attempts.push({
            selector,
            success: false,
            timestamp: Date.now(),
            error: String(error),
          });

          console.log(
            `✗ [HEALING] Failed to find ${description} using selector: ${selector} (${attemptTime}ms)`
          );
        }
      }

      // If this isn't the last retry, wait before retrying
      if (attempt < retries) {
        const backoffDelay = Math.pow(2, attempt) * 300; // 600ms, 1200ms, etc.
        console.log(
          `⏳ [HEALING] Retry attempt ${attempt + 1}/${retries} for ${description} after ${backoffDelay}ms`
        );
        await this.page.waitForTimeout(backoffDelay);
      }
    }

    // All attempts failed
    report.totalAttempts = report.attempts.length;
    report.totalTime = Date.now() - startTime;
    report.healed = false;

    console.log(
      `✗ [HEALING] FAILED to find ${description} after ${report.attempts.length} attempts (${report.totalTime}ms)`
    );
    this.healingLog.push(report);

    return null;
  }

  /**
   * Click element with healing
   */
  async click(config: LocatorConfig): Promise<boolean> {
    const element = await this.find(config);
    if (!element) return false;

    try {
      // Strategy 1: Normal click
      try {
        await element.click({ timeout: 3000 });
        console.log(`✓ [HEALING-CLICK] Successfully clicked ${config.description}`);
        return true;
      } catch (error1) {
        console.log(`⚠ [HEALING-CLICK] Normal click failed, trying force click`);

        // Strategy 2: Force click (ignores visibility)
        try {
          await element.click({ force: true, timeout: 3000 });
          console.log(`✓ [HEALING-CLICK] Force clicked ${config.description}`);
          return true;
        } catch (error2) {
          console.log(`⚠ [HEALING-CLICK] Force click failed, trying scroll + click`);

          // Strategy 3: Scroll into view + click
          try {
            await element.scrollIntoViewIfNeeded();
            await element.click({ timeout: 3000 });
            console.log(`✓ [HEALING-CLICK] Scroll+Click succeeded for ${config.description}`);
            return true;
          } catch (error3) {
            console.log(`✗ [HEALING-CLICK] All click strategies failed for ${config.description}`);
            throw error3;
          }
        }
      }
    } catch (error) {
      console.log(`✗ [HEALING-CLICK] Click failed for ${config.description}: ${error}`);
      return false;
    }
  }

  /**
   * Fill input with healing
   */
  async fill(config: LocatorConfig, value: string): Promise<boolean> {
    const element = await this.find(config);
    if (!element) return false;

    try {
      // Clear first with extended timeout for complex inputs
      await element.clear({ timeout: 5000 });

      // Fill value with extended timeout to handle slow interactions
      await element.fill(value, { timeout: 5000 });

      // Verify with extended timeout to allow element state to stabilize
      const filledValue = await element.inputValue({ timeout: 5000 });
      if (filledValue === value) {
        console.log(`✓ [HEALING-FILL] Successfully filled ${config.description}: ${value}`);
        return true;
      } else {
        console.log(
          `⚠ [HEALING-FILL] Value mismatch for ${config.description}. Expected: ${value}, Got: ${filledValue}`
        );
        throw new Error('Value mismatch after fill');
      }
    } catch (error) {
      console.log(`✗ [HEALING-FILL] Fill failed for ${config.description}: ${error}`);
      return false;
    }
  }

  /**
   * Select option with healing
   */
  async selectOption(config: LocatorConfig, value: string): Promise<boolean> {
    const element = await this.find(config);
    if (!element) return false;

    try {
      await element.selectOption(value, { timeout: 3000 });
      console.log(`✓ [HEALING-SELECT] Selected ${value} in ${config.description}`);
      return true;
    } catch (error) {
      console.log(`✗ [HEALING-SELECT] Select failed for ${config.description}: ${error}`);
      return false;
    }
  }

  /**
   * Wait for element with healing
   */
  async waitFor(config: LocatorConfig, state: 'visible' | 'hidden' | 'attached' = 'visible'): Promise<boolean> {
    try {
      const element = await this.find(config);
      if (!element) return false;

      await element.waitFor({ state, timeout: config.timeout || 5000 });
      console.log(`✓ [HEALING-WAIT] Element ${config.description} is ${state}`);
      return true;
    } catch (error) {
      console.log(`✗ [HEALING-WAIT] Wait failed for ${config.description}: ${error}`);
      return false;
    }
  }

  /**
   * Get text with healing
   */
  async getText(config: LocatorConfig): Promise<string | null> {
    const element = await this.find(config);
    if (!element) return null;

    try {
      const text = await element.textContent();
      console.log(`✓ [HEALING-TEXT] Got text from ${config.description}: ${text}`);
      return text;
    } catch (error) {
      console.log(`✗ [HEALING-TEXT] Get text failed for ${config.description}: ${error}`);
      return null;
    }
  }

  /**
   * Check if element is visible with healing
   */
  async isVisible(config: LocatorConfig): Promise<boolean> {
    const element = await this.find(config);
    if (!element) return false;

    try {
      const visible = await element.isVisible({ timeout: 3000 });
      console.log(`✓ [HEALING-VISIBLE] ${config.description} visible: ${visible}`);
      return visible;
    } catch (error) {
      console.log(`✗ [HEALING-VISIBLE] Visibility check failed for ${config.description}`);
      return false;
    }
  }

  /**
   * Get healing logs
   */
  getHealingLogs(): HealingReport[] {
    return this.healingLog;
  }

  /**
   * Get healing logs as formatted string array for easy consumption
   */
  getHealingLogsAsStrings(): string[] {
    return this.healingLog.map((report) => {
      if (report.healed) {
        return `✓ [HEALED] ${report.elementDescription} using ${report.successfulSelector} (${report.totalTime}ms)`;
      } else {
        return `✗ [FAILED] ${report.elementDescription} after ${report.totalAttempts} attempts (${report.totalTime}ms)`;
      }
    });
  }

  /**
   * Get healing summary statistics
   */
  getHealingSummary(): {
    totalElements: number;
    healedElements: number;
    failedElements: number;
    healRate: string;
    totalTime: number;
    avgTimePerElement: number;
  } {
    const total = this.healingLog.length;
    const healed = this.healingLog.filter((r) => r.healed).length;
    const failed = total - healed;
    const totalTime = this.healingLog.reduce((sum, r) => sum + r.totalTime, 0);

    return {
      totalElements: total,
      healedElements: healed,
      failedElements: failed,
      healRate: `${((healed / total) * 100).toFixed(2)}%`,
      totalTime,
      avgTimePerElement: total > 0 ? totalTime / total : 0,
    };
  }

  /**
   * Print healing report
   */
  printHealingReport(): void {
    const summary = this.getHealingSummary();

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║           PLAYWRIGHT SELF-HEALING REPORT                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`Total Elements Interacted: ${summary.totalElements}`);
    console.log(`✓ Healed Successfully: ${summary.healedElements}`);
    console.log(`✗ Failed to Heal: ${summary.failedElements}`);
    console.log(`Healing Success Rate: ${summary.healRate}`);
    console.log(`Total Time: ${summary.totalTime}ms`);
    console.log(`Average Time per Element: ${summary.avgTimePerElement.toFixed(2)}ms`);
    console.log('');

    this.healingLog.forEach((report, index) => {
      console.log(`\n[${index + 1}] ${report.elementDescription}`);
      console.log(`    Status: ${report.healed ? '✓ HEALED' : '✗ FAILED'}`);
      console.log(`    Attempts: ${report.totalAttempts}`);
      console.log(`    Time: ${report.totalTime}ms`);

      if (report.successfulSelector) {
        console.log(`    Successful Selector: ${report.successfulSelector}`);
      }

      report.attempts.forEach((attempt, idx) => {
        console.log(
          `      Attempt ${idx + 1}: ${attempt.success ? '✓' : '✗'} ${attempt.selector} (${attempt.timestamp})`
        );
      });
    });

    console.log('\n╚════════════════════════════════════════════════════════════╝\n');
  }

  /**
   * Clear healing logs
   */
  clearHealingLogs(): void {
    this.healingLog = [];
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    entries: Array<{ description: string; selector: string }>;
  } {
    return {
      size: this.selectorCache.size,
      entries: Array.from(this.selectorCache.entries()).map(([description, selector]) => ({
        description,
        selector,
      })),
    };
  }
}

/**
 * Helper function to create locator config with semantic naming
 */
export function createLocator(
  description: string,
  primary: string,
  ...fallbacks: string[]
): LocatorConfig {
  return {
    primary,
    fallbacks,
    description,
    timeout: 5000,
    retries: 2,
  };
}
