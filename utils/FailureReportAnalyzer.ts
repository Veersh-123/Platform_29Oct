/**
 * FailureReportAnalyzer - Parses Playwright test reports and suggests fixes
 * 
 * Features:
 * - Extract failure information from Playwright error messages
 * - Suggest alternative selectors based on failure patterns
 * - Generate locator recommendations
 * - Create recovery action plans
 * - Track failure patterns across tests
 * 
 * Usage:
 * const analyzer = new FailureReportAnalyzer();
 * const report = analyzer.analyzeFailureReport(testResults);
 * const suggestions = report.suggestedLocators;
 */

import { LocatorConfig } from './LocatorHealer';
import { LocatorFactory } from './LocatorFactory';

export interface FailureReport {
  testName: string;
  stepName: string;
  errorMessage: string;
  errorType: string;
  timestamp: Date;
  selector?: string;
  suggestions?: string[];
}

export interface LocatorSuggestion {
  original: string;
  primary: string;
  fallbacks: string[];
  confidence: number;
  reason: string;
}

export interface RecoveryAction {
  action: string;
  priority: number;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: number; // in minutes
  description: string;
}

export interface FailureReportAnalysis {
  totalFailures: number;
  failuresByType: Record<string, number>;
  suggestedLocators: LocatorSuggestion[];
  recoveryActions: RecoveryAction[];
  patterns: string[];
  confidence: number;
}

/**
 * FailureReportAnalyzer - Analyzes test failures and suggests recovery
 */
export class FailureReportAnalyzer {
  private failureHistory: FailureReport[] = [];
  private locatorSuggestions: Map<string, LocatorSuggestion> = new Map();
  private patternCache: Map<string, LocatorSuggestion[]> = new Map();

  /**
   * Analyze a test failure and suggest fixes
   */
  analyzeFailureReport(error: Error | string, context?: {
    testName?: string;
    stepName?: string;
    selector?: string;
  }): FailureReportAnalysis {
    const errorMessage = typeof error === 'string' ? error : error.message;

    // Record failure
    const report: FailureReport = {
      testName: context?.testName || 'Unknown Test',
      stepName: context?.stepName || 'Unknown Step',
      errorMessage,
      errorType: this.identifyErrorType(errorMessage),
      timestamp: new Date(),
      selector: context?.selector,
    };

    this.failureHistory.push(report);

    // Generate suggestions
    const suggestedLocators = this.generateLocatorSuggestions(errorMessage, context?.selector);

    // Generate recovery actions
    const recoveryActions = this.generateRecoveryActions(report.errorType, errorMessage);

    // Identify patterns
    const patterns = this.identifyPatterns();

    // Calculate confidence
    const confidence = this.calculateConfidence(suggestedLocators);

    const analysis: FailureReportAnalysis = {
      totalFailures: this.failureHistory.length,
      failuresByType: this.getFailureTypeBreakdown(),
      suggestedLocators,
      recoveryActions,
      patterns,
      confidence,
    };

    this.printAnalysis(analysis);

    return analysis;
  }

  /**
   * Identify the type of error from message
   */
  private identifyErrorType(errorMessage: string): string {
    const msg = errorMessage.toLowerCase();

    if (msg.includes('locator') && msg.includes('not found')) {
      return 'LOCATOR_NOT_FOUND';
    }
    if (msg.includes('timeout')) {
      return 'TIMEOUT';
    }
    if (msg.includes('not visible')) {
      return 'NOT_VISIBLE';
    }
    if (msg.includes('click')) {
      return 'CLICK_FAILED';
    }
    if (msg.includes('fill')) {
      return 'FILL_FAILED';
    }
    if (msg.includes('navigation')) {
      return 'NAVIGATION_FAILED';
    }
    if (msg.includes('selector')) {
      return 'INVALID_SELECTOR';
    }

    return 'UNKNOWN';
  }

  /**
   * Generate locator suggestions based on error
   */
  private generateLocatorSuggestions(
    errorMessage: string,
    originalSelector?: string
  ): LocatorSuggestion[] {
    const suggestions: LocatorSuggestion[] = [];

    // Extract information from error
    const extractedInfo = this.extractFromError(errorMessage);

    if (extractedInfo.elementType) {
      // Generate suggestions based on element type
      suggestions.push(...this.generateByType(extractedInfo.elementType, extractedInfo));
    }

    if (extractedInfo.elementText) {
      // Generate text-based suggestions
      suggestions.push(...this.generateByText(extractedInfo.elementText, extractedInfo.elementType));
    }

    if (extractedInfo.ariaLabel) {
      // Generate aria-based suggestions
      suggestions.push(...this.generateByAria(extractedInfo.ariaLabel));
    }

    if (originalSelector) {
      // Generate adaptive suggestions from original selector
      suggestions.push(...this.generateAdaptiveSelectors(originalSelector));
    }

    // Remove duplicates and sort by confidence
    const unique = this.deduplicateSuggestions(suggestions);
    return unique.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Extract useful information from error message
   */
  private extractFromError(errorMessage: string): {
    elementType?: string;
    elementText?: string;
    ariaLabel?: string;
    placeholder?: string;
    className?: string;
  } {
    const info: any = {};

    // Extract element type
    const typeMatch = errorMessage.match(/button|input|select|link|heading|label|div|span/i);
    if (typeMatch) {
      info.elementType = typeMatch[0].toLowerCase();
    }

    // Extract text content
    const textMatch = errorMessage.match(/text[=:]\s*["']([^"']+)["']/i);
    if (textMatch) {
      info.elementText = textMatch[1];
    }

    // Extract aria-label
    const ariaMatch = errorMessage.match(/aria-label[=:]\s*["']([^"']+)["']/i);
    if (ariaMatch) {
      info.ariaLabel = ariaMatch[1];
    }

    // Extract placeholder
    const placeholderMatch = errorMessage.match(/placeholder[=:]\s*["']([^"']+)["']/i);
    if (placeholderMatch) {
      info.placeholder = placeholderMatch[1];
    }

    // Extract class name
    const classMatch = errorMessage.match(/class[=:]\s*["']([^"']+)["']/i);
    if (classMatch) {
      info.className = classMatch[1];
    }

    return info;
  }

  /**
   * Generate suggestions by element type
   */
  private generateByType(
    type: string,
    context: any
  ): LocatorSuggestion[] {
    const suggestions: LocatorSuggestion[] = [];

    switch (type) {
      case 'button':
        if (context.elementText) {
          const factory = LocatorFactory.button(context.elementText);
          const config = factory.build();
          suggestions.push({
            original: config.primary,
            primary: config.primary,
            fallbacks: config.fallbacks,
            confidence: 0.8,
            reason: 'Button selector by text',
          });
        }
        break;

      case 'input':
        if (context.placeholder) {
          const factory = LocatorFactory.inputByPlaceholder(context.placeholder);
          const config = factory.build();
          suggestions.push({
            original: config.primary,
            primary: config.primary,
            fallbacks: config.fallbacks,
            confidence: 0.75,
            reason: 'Input selector by placeholder',
          });
        }
        break;

      case 'select':
        if (context.elementText) {
          const factory = LocatorFactory.select(context.elementText);
          const config = factory.build();
          suggestions.push({
            original: config.primary,
            primary: config.primary,
            fallbacks: config.fallbacks,
            confidence: 0.7,
            reason: 'Select selector by label',
          });
        }
        break;

      case 'link':
      case 'a':
        if (context.elementText) {
          const factory = LocatorFactory.link(context.elementText);
          const config = factory.build();
          suggestions.push({
            original: config.primary,
            primary: config.primary,
            fallbacks: config.fallbacks,
            confidence: 0.75,
            reason: 'Link selector by text',
          });
        }
        break;
    }

    return suggestions;
  }

  /**
   * Generate suggestions by text
   */
  private generateByText(text: string, elementType?: string): LocatorSuggestion[] {
    const suggestions: LocatorSuggestion[] = [];

    // Text-based selector
    suggestions.push({
      original: `text="${text}"`,
      primary: `text="${text}"`,
      fallbacks: [
        `:has-text("${text}")`,
        `:has-text("${text.toLowerCase()}")`,
        `//*[contains(text(), '${text}')]`,
      ],
      confidence: 0.65,
      reason: 'Text-based locator',
    });

    // Element + text
    if (elementType) {
      suggestions.push({
        original: `${elementType}:has-text("${text}")`,
        primary: `${elementType}:has-text("${text}")`,
        fallbacks: [
          `${elementType}:has-text("${text.toLowerCase()}")`,
          `[role="${elementType}"]:has-text("${text}")`,
        ],
        confidence: 0.7,
        reason: `${elementType} with text`,
      });
    }

    return suggestions;
  }

  /**
   * Generate suggestions by aria attributes
   */
  private generateByAria(ariaLabel: string): LocatorSuggestion[] {
    const suggestions: LocatorSuggestion[] = [];

    suggestions.push({
      original: `[aria-label="${ariaLabel}"]`,
      primary: `[aria-label="${ariaLabel}"]`,
      fallbacks: [
        `[aria-label*="${ariaLabel}"]`,
        `[aria-labelledby*="${ariaLabel}"]`,
      ],
      confidence: 0.8,
      reason: 'ARIA label selector',
    });

    return suggestions;
  }

  /**
   * Generate adaptive selectors from original selector
   */
  private generateAdaptiveSelectors(selector: string): LocatorSuggestion[] {
    const suggestions: LocatorSuggestion[] = [];

    // Create variations
    const variations: string[] = [];

    // Case insensitive
    if (selector.includes('"')) {
      variations.push(selector.replace(/"/g, "'"));
    }

    // Partial matching
    const attrMatch = selector.match(/\[([^\]]+)\]/);
    if (attrMatch) {
      const attr = attrMatch[1];
      variations.push(selector.replace(attr, `${attr.split('=')[0]}*="${attr.split('"')[1]}"`));
    }

    // Text-based alternative
    const textMatch = selector.match(/has-text\("([^"]+)"\)/);
    if (textMatch) {
      variations.push(`text="${textMatch[1]}"`);
    }

    // Generate suggestions from variations
    variations.forEach((variation, index) => {
      if (variation !== selector) {
        suggestions.push({
          original: selector,
          primary: variation,
          fallbacks: [selector],
          confidence: 0.6 - index * 0.1,
          reason: 'Adaptive selector variant',
        });
      }
    });

    return suggestions;
  }

  /**
   * Deduplicate suggestions
   */
  private deduplicateSuggestions(suggestions: LocatorSuggestion[]): LocatorSuggestion[] {
    const seen = new Set<string>();
    return suggestions.filter((s) => {
      if (seen.has(s.primary)) {
        return false;
      }
      seen.add(s.primary);
      return true;
    });
  }

  /**
   * Generate recovery actions based on error type
   */
  private generateRecoveryActions(errorType: string, errorMessage: string): RecoveryAction[] {
    const actions: RecoveryAction[] = [];

    switch (errorType) {
      case 'LOCATOR_NOT_FOUND':
        actions.push({
          action: 'Update Locators',
          priority: 1,
          difficulty: 'easy',
          estimatedTime: 5,
          description: 'Update locators file with suggested selectors',
        });
        actions.push({
          action: 'Add Fallback Selectors',
          priority: 2,
          difficulty: 'easy',
          estimatedTime: 5,
          description: 'Add multiple fallback selectors for resilience',
        });
        actions.push({
          action: 'Use LocatorFactory',
          priority: 3,
          difficulty: 'medium',
          estimatedTime: 10,
          description: 'Regenerate locators using LocatorFactory',
        });
        break;

      case 'TIMEOUT':
        actions.push({
          action: 'Increase Timeout',
          priority: 1,
          difficulty: 'easy',
          estimatedTime: 2,
          description: 'Increase element wait timeout',
        });
        actions.push({
          action: 'Add Adaptive Wait',
          priority: 2,
          difficulty: 'medium',
          estimatedTime: 5,
          description: 'Use adaptive wait based on network conditions',
        });
        actions.push({
          action: 'Check Page Load',
          priority: 3,
          difficulty: 'medium',
          estimatedTime: 10,
          description: 'Verify page loads correctly',
        });
        break;

      case 'NOT_VISIBLE':
        actions.push({
          action: 'Add Scroll',
          priority: 1,
          difficulty: 'easy',
          estimatedTime: 3,
          description: 'Scroll element into view before interaction',
        });
        actions.push({
          action: 'Wait for Visibility',
          priority: 2,
          difficulty: 'easy',
          estimatedTime: 3,
          description: 'Wait for element to become visible',
        });
        actions.push({
          action: 'Use Force Interaction',
          priority: 3,
          difficulty: 'medium',
          estimatedTime: 5,
          description: 'Try force interaction bypassing visibility',
        });
        break;

      case 'CLICK_FAILED':
        actions.push({
          action: 'Try Multi-Strategy Click',
          priority: 1,
          difficulty: 'easy',
          estimatedTime: 2,
          description: 'Use LocatorHealer for multi-strategy click',
        });
        actions.push({
          action: 'Add Scroll + Wait',
          priority: 2,
          difficulty: 'easy',
          estimatedTime: 5,
          description: 'Scroll into view and wait before clicking',
        });
        break;

      default:
        actions.push({
          action: 'Investigate Error',
          priority: 1,
          difficulty: 'hard',
          estimatedTime: 15,
          description: 'Manually investigate and understand the error',
        });
    }

    return actions;
  }

  /**
   * Identify patterns in failures
   */
  private identifyPatterns(): string[] {
    const patterns: string[] = [];
    const typeBreakdown = this.getFailureTypeBreakdown();

    // Most common failure type
    const mostCommon = Object.entries(typeBreakdown).sort(([, a], [, b]) => b - a)[0];
    if (mostCommon) {
      patterns.push(`Most common failure: ${mostCommon[0]} (${mostCommon[1]} times)`);
    }

    // Check for repeated selectors
    const selectorCounts = new Map<string | undefined, number>();
    this.failureHistory.forEach((f) => {
      if (f.selector) {
        selectorCounts.set(f.selector, (selectorCounts.get(f.selector) || 0) + 1);
      }
    });

    const problematicSelectors = Array.from(selectorCounts.entries())
      .filter(([, count]) => count > 1)
      .sort(([, a], [, b]) => b - a);

    if (problematicSelectors.length > 0) {
      patterns.push(`Problematic selectors: ${problematicSelectors.map(([sel, count]) => `${sel} (${count}x)`).join(', ')}`);
    }

    return patterns;
  }

  /**
   * Get failure type breakdown
   */
  private getFailureTypeBreakdown(): Record<string, number> {
    const breakdown: Record<string, number> = {};

    this.failureHistory.forEach((report) => {
      breakdown[report.errorType] = (breakdown[report.errorType] || 0) + 1;
    });

    return breakdown;
  }

  /**
   * Calculate overall confidence in suggestions
   */
  private calculateConfidence(suggestions: LocatorSuggestion[]): number {
    if (suggestions.length === 0) return 0;

    const avgConfidence = suggestions.reduce((sum, s) => sum + s.confidence, 0) / suggestions.length;
    return Math.min(avgConfidence, 1);
  }

  /**
   * Print analysis report
   */
  private printAnalysis(analysis: FailureReportAnalysis): void {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║           FAILURE REPORT ANALYSIS                         ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    console.log(`\nTotal Failures: ${analysis.totalFailures}`);
    console.log('Failures by Type:');
    Object.entries(analysis.failuresByType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

    console.log('\n📍 Suggested Locators:');
    analysis.suggestedLocators.slice(0, 5).forEach((loc, idx) => {
      console.log(`  ${idx + 1}. ${loc.primary}`);
      console.log(`     Confidence: ${(loc.confidence * 100).toFixed(0)}%`);
      console.log(`     Reason: ${loc.reason}`);
      if (loc.fallbacks.length > 0) {
        console.log(`     Fallbacks: ${loc.fallbacks.slice(0, 2).join(', ')}`);
      }
    });

    console.log('\n⚡ Recovery Actions:');
    analysis.recoveryActions.slice(0, 3).forEach((action, idx) => {
      console.log(`  ${idx + 1}. ${action.action}`);
      console.log(`     Priority: ${action.priority}/3`);
      console.log(`     Time: ~${action.estimatedTime}m`);
      console.log(`     ${action.description}`);
    });

    if (analysis.patterns.length > 0) {
      console.log('\n🔍 Patterns Identified:');
      analysis.patterns.forEach((pattern) => {
        console.log(`  • ${pattern}`);
      });
    }

    console.log(`\n✓ Overall Confidence: ${(analysis.confidence * 100).toFixed(0)}%`);
    console.log('╚════════════════════════════════════════════════════════════╝\n');
  }

  /**
   * Get all failure reports
   */
  getFailureHistory(): FailureReport[] {
    return [...this.failureHistory];
  }

  /**
   * Clear failure history
   */
  clearHistory(): void {
    this.failureHistory = [];
    this.locatorSuggestions.clear();
    this.patternCache.clear();
  }

  /**
   * Export analysis as JSON
   */
  exportAnalysis(): object {
    return {
      totalFailures: this.failureHistory.length,
      failures: this.failureHistory,
      suggestions: Array.from(this.locatorSuggestions.values()),
    };
  }
}
