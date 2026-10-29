/**
 * LocatorFactory - Generates intelligent Playwright locators with fallbacks
 * 
 * Features:
 * - Factory methods for common element types
 * - Fallback generation based on common patterns
 * - Role-based and semantic locators
 * - Custom attribute-based locators
 * 
 * Usage:
 * const locator = LocatorFactory.button('Sign In')
 *   .withDataTestId('signin-btn')
 *   .withAriaLabel('Sign in button')
 *   .build();
 */

import { LocatorConfig } from './LocatorHealer';

/**
 * LocatorFactory - Creates locator configurations with intelligent fallbacks
 */
export class LocatorFactory {
  private primary: string = '';
  private fallbacks: string[] = [];
  private description: string = '';

  /**
   * Create button locator by text
   */
  static button(text: string): LocatorFactory {
    const factory = new LocatorFactory();
    factory.primary = `button:has-text("${text}")`;
    factory.description = `Button: ${text}`;

    // Add fallbacks
    factory.fallbacks.push(`button:has-text("${text.toLowerCase()}")`);
    factory.fallbacks.push(`a:has-text("${text}")`);
    factory.fallbacks.push(`[role="button"]:has-text("${text}")`);

    return factory;
  }

  /**
   * Create input locator by placeholder
   */
  static inputByPlaceholder(placeholder: string): LocatorFactory {
    const factory = new LocatorFactory();
    factory.primary = `input[placeholder*="${placeholder}"]`;
    factory.description = `Input: ${placeholder}`;

    factory.fallbacks.push(`input[placeholder*="${placeholder.toLowerCase()}"]`);
    factory.fallbacks.push(`input[aria-label*="${placeholder}"]`);
    factory.fallbacks.push(`[data-testid*="${placeholder.toLowerCase()}"]`);

    return factory;
  }

  /**
   * Create input locator by name attribute
   */
  static inputByName(name: string): LocatorFactory {
    const factory = new LocatorFactory();
    factory.primary = `input[name="${name}"]`;
    factory.description = `Input: ${name}`;

    factory.fallbacks.push(`input[id="${name}"]`);
    factory.fallbacks.push(`input[data-testid="${name}"]`);
    factory.fallbacks.push(`[data-testid="${name}"] input`);

    return factory;
  }

  /**
   * Create dropdown/select locator
   */
  static select(label: string): LocatorFactory {
    const factory = new LocatorFactory();
    factory.primary = `select[aria-label*="${label}"]`;
    factory.description = `Select: ${label}`;

    factory.fallbacks.push(`select[name*="${label.toLowerCase()}"]`);
    factory.fallbacks.push(`[data-testid*="${label.toLowerCase()}"] select`);
    factory.fallbacks.push(`label:has-text("${label}") ~ select`);

    return factory;
  }

  /**
   * Create link locator
   */
  static link(text: string): LocatorFactory {
    const factory = new LocatorFactory();
    factory.primary = `a:has-text("${text}")`;
    factory.description = `Link: ${text}`;

    factory.fallbacks.push(`a:has-text("${text.toLowerCase()}")`);
    factory.fallbacks.push(`[role="link"]:has-text("${text}")`);

    return factory;
  }

  /**
   * Create text locator (heading, label, etc.)
   */
  static text(text: string): LocatorFactory {
    const factory = new LocatorFactory();
    factory.primary = `text="${text}"`;
    factory.description = `Text: ${text}`;

    factory.fallbacks.push(`:has-text("${text}")`);
    factory.fallbacks.push(`//*[contains(text(), '${text}')]`);

    return factory;
  }

  /**
   * Create checkbox/radio locator
   */
  static checkbox(label: string): LocatorFactory {
    const factory = new LocatorFactory();
    factory.primary = `input[type="checkbox"][aria-label*="${label}"]`;
    factory.description = `Checkbox: ${label}`;

    factory.fallbacks.push(`label:has-text("${label}") ~ input[type="checkbox"]`);
    factory.fallbacks.push(`input[type="checkbox"][id*="${label.toLowerCase()}"]`);
    factory.fallbacks.push(`[data-testid*="${label.toLowerCase()}"] input[type="checkbox"]`);

    return factory;
  }

  /**
   * Create date input locator
   */
  static dateInput(placeholder: string): LocatorFactory {
    const factory = new LocatorFactory();
    factory.primary = `input[type="date"][placeholder*="${placeholder}"]`;
    factory.description = `Date Input: ${placeholder}`;

    factory.fallbacks.push(`input[type="date"]`);
    factory.fallbacks.push(`input[placeholder*="${placeholder}"]`);
    factory.fallbacks.push(`[data-testid*="date"] input`);

    return factory;
  }

  /**
   * Create table cell locator
   */
  static tableCell(rowText: string, columnText: string): LocatorFactory {
    const factory = new LocatorFactory();
    factory.primary = `tr:has-text("${rowText}") >> td:has-text("${columnText}")`;
    factory.description = `Table Cell: ${rowText} - ${columnText}`;

    factory.fallbacks.push(`table >> tr:has("text=${rowText}") >> td:has("text=${columnText}")`);
    factory.fallbacks.push(`xpath=//tr[contains(., '${rowText}')]//td[contains(., '${columnText}')]`);

    return factory;
  }

  /**
   * Create modal/dialog locator
   */
  static modal(title: string): LocatorFactory {
    const factory = new LocatorFactory();
    factory.primary = `[role="dialog"]:has-text("${title}")`;
    factory.description = `Modal: ${title}`;

    factory.fallbacks.push(`dialog:has-text("${title}")`);
    factory.fallbacks.push(`[class*="modal"]:has-text("${title}")`);
    factory.fallbacks.push(`[class*="dialog"]:has-text("${title}")`);

    return factory;
  }

  /**
   * Create dropdown option locator
   */
  static option(text: string): LocatorFactory {
    const factory = new LocatorFactory();
    factory.primary = `option:has-text("${text}")`;
    factory.description = `Option: ${text}`;

    factory.fallbacks.push(`[role="option"]:has-text("${text}")`);
    factory.fallbacks.push(`li:has-text("${text}")[role="option"]`);

    return factory;
  }

  /**
   * Create by data-testid
   */
  static byTestId(testId: string): LocatorFactory {
    const factory = new LocatorFactory();
    factory.primary = `[data-testid="${testId}"]`;
    factory.description = `TestID: ${testId}`;

    factory.fallbacks.push(`[data-testid*="${testId}"]`);
    factory.fallbacks.push(`[id="${testId}"]`);
    factory.fallbacks.push(`[class*="${testId}"]`);

    return factory;
  }

  /**
   * Create by aria-label
   */
  static byAriaLabel(label: string): LocatorFactory {
    const factory = new LocatorFactory();
    factory.primary = `[aria-label="${label}"]`;
    factory.description = `AriaLabel: ${label}`;

    factory.fallbacks.push(`[aria-label*="${label}"]`);
    factory.fallbacks.push(`[aria-labelledby*="${label}"]`);

    return factory;
  }

  /**
   * Add custom fallback
   */
  withFallback(selector: string): LocatorFactory {
    this.fallbacks.push(selector);
    return this;
  }

  /**
   * Add data-testid as fallback
   */
  withDataTestId(testId: string): LocatorFactory {
    this.fallbacks.push(`[data-testid="${testId}"]`);
    this.fallbacks.push(`[data-testid*="${testId}"]`);
    return this;
  }

  /**
   * Add aria-label as fallback
   */
  withAriaLabel(label: string): LocatorFactory {
    this.fallbacks.push(`[aria-label="${label}"]`);
    this.fallbacks.push(`[aria-label*="${label}"]`);
    return this;
  }

  /**
   * Add class-based fallback
   */
  withClass(className: string): LocatorFactory {
    this.fallbacks.push(`[class*="${className}"]`);
    return this;
  }

  /**
   * Add ID-based fallback
   */
  withId(id: string): LocatorFactory {
    this.fallbacks.push(`#${id}`);
    this.fallbacks.push(`[id*="${id}"]`);
    return this;
  }

  /**
   * Set custom description
   */
  withDescription(description: string): LocatorFactory {
    this.description = description;
    return this;
  }

  /**
   * Build LocatorConfig
   */
  build(): LocatorConfig {
    // Remove duplicates
    const uniqueFallbacks = [...new Set(this.fallbacks)];

    return {
      primary: this.primary,
      fallbacks: uniqueFallbacks,
      description: this.description || 'Element',
      timeout: 5000,
      retries: 2,
    };
  }

  /**
   * Build with custom timeout
   */
  buildWithTimeout(timeout: number): LocatorConfig {
    const config = this.build();
    config.timeout = timeout;
    return config;
  }

  /**
   * Build with custom retries
   */
  buildWithRetries(retries: number): LocatorConfig {
    const config = this.build();
    config.retries = retries;
    return config;
  }

  /**
   * Get all selectors (primary + fallbacks)
   */
  getAllSelectors(): string[] {
    return [this.primary, ...this.fallbacks];
  }

  /**
   * Print configuration for debugging
   */
  printConfig(): void {
    console.log(`\n📍 Locator: ${this.description}`);
    console.log(`   Primary: ${this.primary}`);
    console.log('   Fallbacks:');
    this.fallbacks.forEach((fallback, index) => {
      console.log(`     ${index + 1}. ${fallback}`);
    });
    console.log('');
  }
}

/**
 * Predefined locator configurations for common scenarios
 */
export const CommonLocators = {
  // Navigation
  navbar: () => LocatorFactory.byTestId('navbar').withClass('navbar').build(),
  logo: () => LocatorFactory.link('logo').withClass('logo').build(),
  hamburgerMenu: () => LocatorFactory.button('☰').withAriaLabel('menu').build(),

  // Forms
  submitButton: () =>
    LocatorFactory.button('Submit')
      .withFallback('button[type="submit"]')
      .withDataTestId('submit')
      .build(),
  cancelButton: () =>
    LocatorFactory.button('Cancel')
      .withDataTestId('cancel')
      .build(),
  nextButton: () =>
    LocatorFactory.button('Next')
      .withDataTestId('next')
      .build(),
  previousButton: () =>
    LocatorFactory.button('Previous')
      .withDataTestId('prev')
      .build(),

  // Modals
  confirmDialog: () => LocatorFactory.modal('Confirm').withDataTestId('confirm-dialog').build(),
  errorDialog: () => LocatorFactory.modal('Error').withDataTestId('error-dialog').build(),
  successMessage: () =>
    LocatorFactory.byAriaLabel('Success')
      .withClass('success')
      .withClass('message')
      .build(),

  // Loading & Waits
  loadingSpinner: () =>
    LocatorFactory.byTestId('loading')
      .withClass('spinner')
      .withClass('loading')
      .build(),
  skeleton: () => LocatorFactory.byClass('skeleton').build(),

  // Search & Filter
  searchInput: () =>
    LocatorFactory.inputByPlaceholder('Search')
      .withDataTestId('search')
      .build(),
  filterButton: () =>
    LocatorFactory.button('Filter')
      .withDataTestId('filter')
      .build(),
};

/**
 * Helper to build button by common names
 */
export const CommonButtons = {
  login: () => LocatorFactory.button('Login').withDataTestId('login-btn').build(),
  logout: () => LocatorFactory.button('Logout').withDataTestId('logout-btn').build(),
  register: () => LocatorFactory.button('Register').withDataTestId('register-btn').build(),
  save: () => LocatorFactory.button('Save').withDataTestId('save-btn').build(),
  delete: () => LocatorFactory.button('Delete').withDataTestId('delete-btn').build(),
  apply: () => LocatorFactory.button('Apply').withDataTestId('apply-btn').build(),
  search: () => LocatorFactory.button('Search').withDataTestId('search-btn').build(),
  close: () =>
    LocatorFactory.button('×')
      .withFallback('button[aria-label="close"]')
      .withFallback('button[aria-label="Close"]')
      .build(),
};
