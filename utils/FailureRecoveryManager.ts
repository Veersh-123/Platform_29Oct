/**
 * FailureRecoveryManager - Analyzes test failures and provides recovery strategies
 * 
 * Features:
 * - Parse Playwright error messages
 * - Identify failure types (locator, timeout, navigation, etc.)
 * - Suggest recovery strategies
 * - Extract useful context from failures
 * - Track failure patterns
 * 
 * Usage:
 * const manager = new FailureRecoveryManager();
 * const analysis = manager.analyzeError(error, context);
 * const recovery = analysis.suggestedRecovery;
 */

import { Page } from '@playwright/test';

export enum FailureType {
  LOCATOR_NOT_FOUND = 'LOCATOR_NOT_FOUND',
  TIMEOUT = 'TIMEOUT',
  NAVIGATION = 'NAVIGATION',
  VISIBILITY = 'VISIBILITY',
  INTERACTION = 'INTERACTION',
  STATE_CHANGE = 'STATE_CHANGE',
  UNKNOWN = 'UNKNOWN',
}

export interface RecoveryStrategy {
  type: FailureType;
  description: string;
  actions: string[];
  retryable: boolean;
  suggestedDelay?: number;
}

export interface FailureAnalysis {
  failureType: FailureType;
  errorMessage: string;
  errorStack?: string;
  extractedInfo: {
    selector?: string;
    timeout?: number;
    url?: string;
    elementState?: string;
  };
  suggestedRecovery: RecoveryStrategy;
  confidence: number; // 0-1
}

export interface FailureContext {
  testName: string;
  step: string;
  page?: Page;
  url?: string;
  elementDescription?: string;
}

/**
 * FailureRecoveryManager - Analyzes and suggests recovery for test failures
 */
export class FailureRecoveryManager {
  private failureHistory: Map<FailureType, number> = new Map();

  constructor() {
    this.initializeFailureHistory();
  }

  private initializeFailureHistory(): void {
    Object.values(FailureType).forEach((type) => {
      this.failureHistory.set(type as FailureType, 0);
    });
  }

  /**
   * Analyze error and suggest recovery
   */
  analyzeError(error: Error | string, context?: FailureContext): FailureAnalysis {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Identify failure type
    const failureType = this.identifyFailureType(errorMessage);

    // Extract relevant information
    const extractedInfo = this.extractErrorInfo(errorMessage, errorStack);

    // Get recovery strategy
    const suggestedRecovery = this.getRecoveryStrategy(failureType, errorMessage, context);

    // Calculate confidence based on pattern matching
    const confidence = this.calculateConfidence(failureType, errorMessage);

    // Track failure
    this.recordFailure(failureType);

    console.log(`
🔍 [FAILURE ANALYSIS]
   Type: ${failureType}
   Message: ${errorMessage}
   Recovery: ${suggestedRecovery.description}
   Confidence: ${(confidence * 100).toFixed(0)}%
    `);

    return {
      failureType,
      errorMessage,
      errorStack,
      extractedInfo,
      suggestedRecovery,
      confidence,
    };
  }

  /**
   * Identify failure type from error message
   */
  private identifyFailureType(errorMessage: string): FailureType {
    const msg = errorMessage.toLowerCase();

    if (
      msg.includes('locator') &&
      (msg.includes('not found') || msg.includes('did not find') || msg.includes('no matching'))
    ) {
      return FailureType.LOCATOR_NOT_FOUND;
    }

    if (msg.includes('timeout') || msg.includes('exceeded')) {
      return FailureType.TIMEOUT;
    }

    if (msg.includes('navigation') || msg.includes('goto') || msg.includes('url')) {
      return FailureType.NAVIGATION;
    }

    if (
      msg.includes('not visible') ||
      msg.includes('visibility') ||
      msg.includes('display') ||
      msg.includes('hidden')
    ) {
      return FailureType.VISIBILITY;
    }

    if (msg.includes('click') || msg.includes('fill') || msg.includes('select')) {
      return FailureType.INTERACTION;
    }

    if (msg.includes('state') || msg.includes('attached') || msg.includes('detached')) {
      return FailureType.STATE_CHANGE;
    }

    return FailureType.UNKNOWN;
  }

  /**
   * Extract useful information from error
   */
  private extractErrorInfo(
    errorMessage: string,
    errorStack?: string
  ): FailureAnalysis['extractedInfo'] {
    const info: FailureAnalysis['extractedInfo'] = {};

    // Try to extract selector
    const selectorMatch = errorMessage.match(/selector\s*:\s*["']([^"']+)["']/i);
    if (selectorMatch) {
      info.selector = selectorMatch[1];
    }

    // Try to extract timeout value
    const timeoutMatch = errorMessage.match(/timeout\s*(?:of|:)?\s*(\d+)\s*(?:ms|millisecond)?/i);
    if (timeoutMatch) {
      info.timeout = parseInt(timeoutMatch[1]);
    }

    // Try to extract URL
    const urlMatch = errorMessage.match(/(?:url|URL|goto).*?["']([^"']+)["']/i);
    if (urlMatch) {
      info.url = urlMatch[1];
    }

    // Try to extract element state info
    const stateMatch = errorMessage.match(/(?:state|status).*?(?::|\s)(visible|hidden|attached|detached)/i);
    if (stateMatch) {
      info.elementState = stateMatch[1];
    }

    return info;
  }

  /**
   * Get recovery strategy for failure type
   */
  private getRecoveryStrategy(
    failureType: FailureType,
    errorMessage: string,
    context?: FailureContext
  ): RecoveryStrategy {
    const strategies: Record<FailureType, RecoveryStrategy> = {
      [FailureType.LOCATOR_NOT_FOUND]: {
        type: FailureType.LOCATOR_NOT_FOUND,
        description: 'Element selector not found - Try alternative selectors',
        actions: [
          'Use LocatorHealer with multiple fallback selectors',
          'Try role-based selectors: button:has-text("...")',
          'Try data-testid or aria-label selectors',
          'Wait for element visibility before interacting',
          'Check if page structure changed',
        ],
        retryable: true,
        suggestedDelay: 500,
      },

      [FailureType.TIMEOUT]: {
        type: FailureType.TIMEOUT,
        description: 'Operation timeout - Increase wait time or check page state',
        actions: [
          'Increase timeout value for slow operations',
          'Check if page is loading properly',
          'Use adaptive waits based on network',
          'Verify element is not behind modal/overlay',
          'Check browser console for errors',
        ],
        retryable: true,
        suggestedDelay: 2000,
      },

      [FailureType.NAVIGATION]: {
        type: FailureType.NAVIGATION,
        description: 'Navigation failed - Check network and URL',
        actions: [
          'Verify network connectivity',
          'Check if URL is correct',
          'Increase navigation timeout',
          'Try navigation with different wait condition',
          'Check for redirects or auth requirements',
        ],
        retryable: true,
        suggestedDelay: 3000,
      },

      [FailureType.VISIBILITY]: {
        type: FailureType.VISIBILITY,
        description: 'Element not visible - Try scroll or wait',
        actions: [
          'Scroll element into view before interaction',
          'Wait for element to become visible',
          'Try force interaction (bypass visibility check)',
          'Check if element is behind modal or overlay',
          'Verify CSS display and visibility settings',
        ],
        retryable: true,
        suggestedDelay: 500,
      },

      [FailureType.INTERACTION]: {
        type: FailureType.INTERACTION,
        description: 'Interaction failed - Try alternative strategies',
        actions: [
          'Try multiple click strategies (normal, force, dispatch)',
          'Scroll element into view first',
          'Increase interaction timeout',
          'Try keyboard interaction instead of click',
          'Check if element state changed',
        ],
        retryable: true,
        suggestedDelay: 1000,
      },

      [FailureType.STATE_CHANGE]: {
        type: FailureType.STATE_CHANGE,
        description: 'Element state changed unexpectedly - Wait and retry',
        actions: [
          'Wait for element to stabilize',
          'Retry operation with backoff',
          'Check if page is mid-animation',
          'Verify element is attached to DOM',
          'Clear stale references',
        ],
        retryable: true,
        suggestedDelay: 1500,
      },

      [FailureType.UNKNOWN]: {
        type: FailureType.UNKNOWN,
        description: 'Unknown failure - Manual investigation needed',
        actions: [
          'Take screenshot for debugging',
          'Check browser console logs',
          'Verify page state and DOM',
          'Review error stack trace',
          'Check network requests',
        ],
        retryable: false,
      },
    };

    return strategies[failureType];
  }

  /**
   * Calculate confidence in the analysis
   */
  private calculateConfidence(failureType: FailureType, errorMessage: string): number {
    // Known patterns have higher confidence
    const highConfidencePatterns = [
      'locator.*not found',
      'timeout.*exceeded',
      'navigation.*failed',
      'not visible',
      'click.*failed',
    ];

    let confidence = 0.5; // Base confidence

    if (failureType !== FailureType.UNKNOWN) {
      confidence += 0.3; // Recognized failure type
    }

    for (const pattern of highConfidencePatterns) {
      if (new RegExp(pattern, 'i').test(errorMessage)) {
        confidence += 0.2;
        break;
      }
    }

    return Math.min(confidence, 1); // Cap at 1.0
  }

  /**
   * Record failure for pattern analysis
   */
  private recordFailure(failureType: FailureType): void {
    const current = this.failureHistory.get(failureType) || 0;
    this.failureHistory.set(failureType, current + 1);
  }

  /**
   * Get failure statistics
   */
  getFailureStats(): {
    totalFailures: number;
    byType: Record<string, number>;
    mostCommonType: FailureType;
  } {
    const total = Array.from(this.failureHistory.values()).reduce((a, b) => a + b, 0);
    const byType = Object.fromEntries(this.failureHistory);

    let mostCommonType = FailureType.UNKNOWN;
    let maxCount = 0;

    this.failureHistory.forEach((count, type) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommonType = type;
      }
    });

    return {
      totalFailures: total,
      byType,
      mostCommonType,
    };
  }

  /**
   * Generate recovery suggestion based on URL and element
   */
  generateRecoverySuggestion(page: Page, elementDescription: string): string[] {
    const suggestions: string[] = [];

    suggestions.push(`🔧 Recovery Suggestions for: ${elementDescription}`);
    suggestions.push('');
    suggestions.push('1. Verify Element Exists:');
    suggestions.push(`   - Check if "${elementDescription}" is on current page`);
    suggestions.push('   - Use browser DevTools to inspect the element');
    suggestions.push('');
    suggestions.push('2. Update Locators:');
    suggestions.push('   - Try multiple selector strategies');
    suggestions.push('   - Use role-based locators when possible');
    suggestions.push('   - Add data-testid for better reliability');
    suggestions.push('');
    suggestions.push('3. Add Waits:');
    suggestions.push('   - Wait for element visibility');
    suggestions.push('   - Wait for specific state');
    suggestions.push('   - Use adaptive waits for network changes');
    suggestions.push('');
    suggestions.push('4. Debug Steps:');
    suggestions.push('   - Take screenshot at failure point');
    suggestions.push('   - Check browser console');
    suggestions.push('   - Verify page navigation completed');

    return suggestions;
  }

  /**
   * Print failure report
   */
  printFailureReport(): void {
    const stats = this.getFailureStats();

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║           FAILURE ANALYSIS REPORT                         ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`Total Failures: ${stats.totalFailures}`);
    console.log(`Most Common: ${stats.mostCommonType}`);
    console.log('');
    console.log('Failure Breakdown:');

    Object.entries(stats.byType).forEach(([type, count]) => {
      if (count > 0) {
        const percentage = ((count / stats.totalFailures) * 100).toFixed(1);
        console.log(`  ${type}: ${count} (${percentage}%)`);
      }
    });

    console.log('\n╚════════════════════════════════════════════════════════════╝\n');
  }
}

/**
 * Helper function to get locator from failure analysis
 */
export function extractLocatorFromFailure(analysis: FailureAnalysis): string | null {
  return analysis.extractedInfo.selector || null;
}

/**
 * Helper function to get timeout recommendation
 */
export function getTimeoutRecommendation(analysis: FailureAnalysis): number {
  const currentTimeout = analysis.extractedInfo.timeout || 5000;

  switch (analysis.failureType) {
    case FailureType.TIMEOUT:
      return Math.min(currentTimeout * 2, 30000); // Double timeout, max 30s
    case FailureType.NAVIGATION:
      return Math.min(currentTimeout * 1.5, 60000); // 1.5x timeout, max 60s
    case FailureType.VISIBILITY:
      return Math.min(currentTimeout * 1.5, 15000); // 1.5x timeout, max 15s
    default:
      return currentTimeout;
  }
}
