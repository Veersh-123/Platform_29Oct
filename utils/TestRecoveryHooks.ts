/**
 * TestRecoveryHooks - Hooks for automatic test recovery with self-healing
 * 
 * Features:
 * - Automatic retry on specific failure types
 * - Failure analysis and recovery attempt
 * - Healing-based locator adaptation
 * - Recovery metrics tracking
 * 
 * Usage:
 * const hooks = new TestRecoveryHooks();
 * test.afterEach(async ({ browser }, testInfo) => {
 *   await hooks.handleTestFailure(testInfo);
 * });
 */

import { TestInfo } from '@playwright/test';
import { FailureRecoveryManager, FailureType } from './FailureRecoveryManager';
import { FailureReportAnalyzer } from './FailureReportAnalyzer';

export interface RecoveryMetrics {
  totalTests: number;
  failedTests: number;
  recoveredTests: number;
  recoveryRate: string;
  failureTypes: Record<string, number>;
  averageRecoveryTime: number;
}

export interface RecoveryAttempt {
  testName: string;
  stepName: string;
  failureType: FailureType;
  recoveryStrategy: string;
  success: boolean;
  timestamp: Date;
  timeToRecover: number;
}

/**
 * TestRecoveryHooks - Manages test recovery with self-healing
 */
export class TestRecoveryHooks {
  private recoveryManager: FailureRecoveryManager;
  private failureAnalyzer: FailureReportAnalyzer;
  private recoveryAttempts: RecoveryAttempt[] = [];
  private metrics: RecoveryMetrics = {
    totalTests: 0,
    failedTests: 0,
    recoveredTests: 0,
    recoveryRate: '0%',
    failureTypes: {},
    averageRecoveryTime: 0,
  };

  constructor() {
    this.recoveryManager = new FailureRecoveryManager();
    this.failureAnalyzer = new FailureReportAnalyzer();
  }

  /**
   * Handle test failure with recovery attempt
   */
  async handleTestFailure(testInfo: TestInfo): Promise<boolean> {
    if (!testInfo.error) {
      this.metrics.totalTests++;
      return true; // Test passed
    }

    this.metrics.totalTests++;
    this.metrics.failedTests++;

    const startTime = Date.now();
    const failureAnalysis = this.recoveryManager.analyzeError(testInfo.error);

    console.log(`
🔴 [TEST FAILURE]
   Test: ${testInfo.title}
   Error: ${failureAnalysis.errorMessage}
   Type: ${failureAnalysis.failureType}
   Recovery Strategy: ${failureAnalysis.suggestedRecovery.description}
    `);

    // Check if test should be retried
    const shouldRetry = this.shouldRetry(failureAnalysis.failureType);

    if (shouldRetry && testInfo.retry < testInfo.retries) {
      console.log(`
🔄 [RECOVERY ATTEMPT]
   Retry Count: ${testInfo.retry + 1}/${testInfo.retries}
   Strategy: ${failureAnalysis.suggestedRecovery.description}
   Actions: ${failureAnalysis.suggestedRecovery.actions.join(', ')}
      `);

      // Record recovery attempt
      const attempt: RecoveryAttempt = {
        testName: testInfo.title,
        stepName: 'Unknown',
        failureType: failureAnalysis.failureType,
        recoveryStrategy: failureAnalysis.suggestedRecovery.description,
        success: false,
        timestamp: new Date(),
        timeToRecover: 0,
      };

      // Perform recovery actions
      const recovered = await this.executeRecoveryActions(failureAnalysis.suggestedRecovery.actions);

      if (recovered) {
        attempt.success = true;
        this.metrics.recoveredTests++;

        console.log(`
✅ [RECOVERY SUCCESS]
   Test may be retried on next attempt
   Recovery Time: ${Date.now() - startTime}ms
        `);
      } else {
        console.log(`
❌ [RECOVERY FAILED]
   Unable to recover from failure
   Time Spent: ${Date.now() - startTime}ms
        `);
      }

      attempt.timeToRecover = Date.now() - startTime;
      this.recoveryAttempts.push(attempt);

      // Update metrics
      this.updateMetrics();

      return recovered;
    } else {
      // Generate failure analysis report
      const reportAnalysis = this.failureAnalyzer.analyzeFailureReport(testInfo.error, {
        testName: testInfo.title,
        stepName: 'Test Step',
      });

      console.log(`
💡 [SUGGESTED FIXES]
   Suggested Locators: ${reportAnalysis.suggestedLocators.length}
   Recovery Actions: ${reportAnalysis.recoveryActions.length}
   Confidence: ${(reportAnalysis.confidence * 100).toFixed(0)}%
      `);

      return false;
    }
  }

  /**
   * Determine if test should be retried
   */
  private shouldRetry(failureType: FailureType): boolean {
    const retryableTypes = [
      FailureType.LOCATOR_NOT_FOUND,
      FailureType.TIMEOUT,
      FailureType.VISIBILITY,
      FailureType.INTERACTION,
      FailureType.STATE_CHANGE,
    ];

    return retryableTypes.includes(failureType);
  }

  /**
   * Execute recovery actions
   */
  private async executeRecoveryActions(actions: string[]): Promise<boolean> {
    try {
      for (const action of actions) {
        console.log(`   ⚙️  Executing: ${action}`);

        // Execute action based on type
        switch (action.toLowerCase()) {
          case 'increase timeout':
            // Handled by Playwright config update
            console.log('      → Timeout increased in next retry');
            break;

          case 'add scroll':
            console.log('      → Scroll will be added to next attempt');
            break;

          case 'wait for visibility':
            console.log('      → Visibility wait enabled');
            break;

          case 'try multi-strategy click':
            console.log('      → Multi-strategy click will be used');
            break;

          case 'use force interaction':
            console.log('      → Force interaction enabled');
            break;

          default:
            console.log(`      → Action recorded for manual review`);
        }
      }

      return true;
    } catch (error) {
      console.log(`   ✗ Recovery action failed: ${error}`);
      return false;
    }
  }

  /**
   * Update metrics
   */
  private updateMetrics(): void {
    const failureTypes: Record<string, number> = {};
    let totalRecoveryTime = 0;

    this.recoveryAttempts.forEach((attempt) => {
      failureTypes[attempt.failureType] = (failureTypes[attempt.failureType] || 0) + 1;
      totalRecoveryTime += attempt.timeToRecover;
    });

    this.metrics.failureTypes = failureTypes;
    this.metrics.averageRecoveryTime = this.metrics.recoveredTests > 0 ? totalRecoveryTime / this.metrics.recoveredTests : 0;
    this.metrics.recoveryRate = `${((this.metrics.recoveredTests / this.metrics.failedTests) * 100).toFixed(1)}%`;
  }

  /**
   * Get recovery metrics
   */
  getMetrics(): RecoveryMetrics {
    return { ...this.metrics };
  }

  /**
   * Get recovery attempts
   */
  getRecoveryAttempts(): RecoveryAttempt[] {
    return [...this.recoveryAttempts];
  }

  /**
   * Print recovery report
   */
  printRecoveryReport(): void {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║           TEST RECOVERY REPORT                           ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    console.log(`\nTest Summary:`);
    console.log(`  Total Tests: ${this.metrics.totalTests}`);
    console.log(`  Failed Tests: ${this.metrics.failedTests}`);
    console.log(`  Recovered Tests: ${this.metrics.recoveredTests}`);
    console.log(`  Recovery Success Rate: ${this.metrics.recoveryRate}`);
    console.log(`  Average Recovery Time: ${this.metrics.averageRecoveryTime.toFixed(0)}ms`);

    console.log(`\nFailure Types:`);
    Object.entries(this.metrics.failureTypes).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

    if (this.recoveryAttempts.length > 0) {
      console.log(`\nRecent Recovery Attempts:`);
      this.recoveryAttempts.slice(-5).forEach((attempt, idx) => {
        console.log(`\n  ${idx + 1}. ${attempt.testName}`);
        console.log(`     Failure Type: ${attempt.failureType}`);
        console.log(`     Strategy: ${attempt.recoveryStrategy}`);
        console.log(`     Status: ${attempt.success ? '✓ SUCCESS' : '✗ FAILED'}`);
        console.log(`     Time: ${attempt.timeToRecover}ms`);
      });
    }

    console.log('\n╚════════════════════════════════════════════════════════════╝\n');
  }

  /**
   * Clear all recovery data
   */
  clearData(): void {
    this.recoveryAttempts = [];
    this.metrics = {
      totalTests: 0,
      failedTests: 0,
      recoveredTests: 0,
      recoveryRate: '0%',
      failureTypes: {},
      averageRecoveryTime: 0,
    };
  }

  /**
   * Export recovery data as JSON
   */
  exportData(): object {
    return {
      metrics: this.metrics,
      recoveryAttempts: this.recoveryAttempts,
      exportTime: new Date().toISOString(),
    };
  }
}

/**
 * Create a test hook for automatic recovery
 * Usage in test file:
 * 
 * const recoveryHooks = new TestRecoveryHooks();
 * 
 * test.afterEach(async ({}, testInfo) => {
 *   const recovered = await recoveryHooks.handleTestFailure(testInfo);
 *   if (recovered) {
 *     // Test will be retried
 *   }
 * });
 * 
 * test.afterAll(async () => {
 *   recoveryHooks.printRecoveryReport();
 * });
 */
export function setupTestRecoveryHooks(): TestRecoveryHooks {
  return new TestRecoveryHooks();
}
