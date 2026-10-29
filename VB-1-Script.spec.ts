/**
 * VB-1 - Test Scripts
 * Generated: 2026-09-04
 *
 * Story      : VB-1
 * Jira URL   : https://hexaware-team-xnlecrtb.atlassian.net/browse/VB-1
 * Summary    : Verify fund transfer on VB Bank - Premium Banking Experience
 * Framework  : Playwright + POM (Page Object Model)
 * App URL    : https://vb-bank-demo.vercel.app/
 *
 * Structure:
 *   - Page Object : pages/Vb1Page.ts
 *   - Locators    : Locators/Vb1.locators.ts
 *   - Test Data   : Test_Data/VB-1.json
 *   - Utils       : utils/CommonUtils.ts
 *
 * Test Cases (12 total):
 *   Positive : TC_VB1_001 – TC_VB1_006 + E2E flow
 *   Negative : TC_VB1_N01 – TC_VB1_N04
 *   Edge     : TC_VB1_E01 – TC_VB1_E02
 */

import { test, expect } from '@playwright/test';
import { Vb1Page } from '../../pages/Vb1Page';
import testData from '../../Test_Data/VB-1.json';

// ─────────────────────────────────────────────────────────────────────────────
// Helper: login and reach dashboard before each test (used by most tests)
// ─────────────────────────────────────────────────────────────────────────────
async function loginAsValidUser(vb1Page: Vb1Page): Promise<void> {
  await vb1Page.navigateTo(testData.appUrl);
  await vb1Page.login(testData.credentials.valid.username, testData.credentials.valid.password);
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite
// ─────────────────────────────────────────────────────────────────────────────
test.describe('VB-1: Verify Fund Transfer - VB Bank Premium Banking', () => {

  let vb1Page: Vb1Page;

  test.afterEach(async () => {
    await vb1Page.takeScreenshot(
      `VB-1_${test.info().title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 80)}`
    );
  });

  // ──────────────────────────────── POSITIVE SCENARIOS ─────────────────────────

  /**
   * TC_VB1_001 – Verify successful login with valid credentials and landing on dashboard
   * Type: Positive | Priority: High | Tags: smoke
   */
  test('TC_VB1_001: Successful login with valid credentials lands on account dashboard', async ({ page }) => {
    vb1Page = new Vb1Page(page);
    await vb1Page.navigateTo(testData.appUrl);

    // Verify login page is displayed
    expect(await vb1Page.isOnLoginPage(), 'Should start on login page').toBe(true);

    // Perform login
    await vb1Page.login(testData.credentials.valid.username, testData.credentials.valid.password);

    // Assert: redirected to dashboard
    const url = await vb1Page.getCurrentUrl();
    expect(url, 'URL should point to /dashboard after login').toContain('/dashboard');

    // Assert: dashboard content loaded
    const dashboardLoaded = await vb1Page.isDashboardLoaded();
    expect(dashboardLoaded, 'Dashboard heading should be visible').toBe(true);
  });

  /**
   * TC_VB1_002 – Verify account balance is displayed on the dashboard before transfer
   * Type: Positive | Priority: High | Tags: smoke
   */
  test('TC_VB1_002: Account balance is visible on dashboard before fund transfer', async ({ page }) => {
    vb1Page = new Vb1Page(page);
    await loginAsValidUser(vb1Page);

    // Assert: balance card is visible
    const balanceVisible = await vb1Page.isBalanceVisible();
    expect(balanceVisible, 'Balance card should be visible on the dashboard').toBe(true);

    // Assert: balance amount is a positive number
    const balance = await vb1Page.getBalanceAmount();
    expect(balance, 'Balance should be a positive number').toBeGreaterThan(0);

    console.log(`[TC_VB1_002] Current balance before transfer: $${balance}`);
  });

  /**
   * TC_VB1_003 – Verify navigation to Transfer Money screen via the left menu
   * Type: Positive | Priority: High | Tags: smoke
   */
  test('TC_VB1_003: Clicking Transfer in left menu navigates to Transfer Money screen', async ({ page }) => {
    vb1Page = new Vb1Page(page);
    await loginAsValidUser(vb1Page);

    // Click Transfer in sidebar
    await vb1Page.goToTransfer();

    // Assert: URL contains /transfer
    const url = await vb1Page.getCurrentUrl();
    expect(url, 'URL should contain /transfer').toContain('/transfer');

    // Assert: Transfer Money heading visible
    const isLoaded = await vb1Page.isTransferPageLoaded();
    expect(isLoaded, 'Transfer Money page heading should be visible').toBe(true);
  });

  /**
   * TC_VB1_004 – Verify successful fund transfer of USD 250 with all valid details
   * Type: Positive | Priority: High | Tags: smoke, e2e
   */
  test('TC_VB1_004: Successful fund transfer of USD 250 to valid recipient', async ({ page }) => {
    vb1Page = new Vb1Page(page);
    await loginAsValidUser(vb1Page);
    await vb1Page.goToTransfer();

    // Submit the transfer form
    await vb1Page.fillAndSubmitTransfer(
      testData.transfer.recipientAccount,
      testData.transfer.amount,
      testData.transfer.description
    );

    // Assert: success alert is displayed
    const isSuccess = await vb1Page.isTransferSuccessful();
    expect(isSuccess, 'Success alert should appear after valid transfer').toBe(true);

    // Assert: success message contains expected text
    const successMsg = await vb1Page.getTransferSuccessMessage();
    expect(successMsg, 'Success message should confirm the transfer').toContain(testData.errorMessages.transferSuccessful);

    console.log(`[TC_VB1_004] Transfer success: ${successMsg}`);
  });

  /**
   * TC_VB1_005 – Verify dashboard balance is updated (reduced by USD 250) after transfer
   * Type: Positive | Priority: High | Tags: smoke, e2e
   */
  test('TC_VB1_005: Dashboard balance is reduced by USD 250 after successful transfer', async ({ page }) => {
    vb1Page = new Vb1Page(page);
    await loginAsValidUser(vb1Page);

    // Record balance before transfer
    const balanceBefore = await vb1Page.getBalanceAmount();
    console.log(`[TC_VB1_005] Balance before transfer: $${balanceBefore}`);

    // Navigate to Transfer and execute
    await vb1Page.goToTransfer();
    await vb1Page.fillAndSubmitTransfer(
      testData.transfer.recipientAccount,
      testData.transfer.amount,
      testData.transfer.description
    );

    // Verify transfer succeeded
    const isSuccess = await vb1Page.isTransferSuccessful();
    expect(isSuccess, 'Transfer must succeed for balance verification').toBe(true);

    // Go back to dashboard and check balance
    await vb1Page.goToDashboard();
    const balanceAfter = await vb1Page.getBalanceAmount();
    console.log(`[TC_VB1_005] Balance after transfer: $${balanceAfter}`);

    const transferAmount = parseFloat(testData.transfer.amount);
    const expectedBalance = balanceBefore - transferAmount;

    expect(balanceAfter, `Balance should be $${expectedBalance} (original minus $${transferAmount})`).toBeCloseTo(expectedBalance, 0);
  });

  /**
   * TC_VB1_006 – Verify transfer appears in History under Expense filter when searched by "Orlando"
   * Type: Positive | Priority: High | Tags: e2e
   */
  test('TC_VB1_006: Transfer appears in History under Expense filter searched by "Orlando"', async ({ page }) => {
    vb1Page = new Vb1Page(page);
    await loginAsValidUser(vb1Page);

    // Execute the transfer first
    await vb1Page.goToTransfer();
    await vb1Page.fillAndSubmitTransfer(
      testData.transfer.recipientAccount,
      testData.transfer.amount,
      testData.transfer.description
    );
    expect(await vb1Page.isTransferSuccessful()).toBe(true);

    // Navigate to History
    await vb1Page.goToHistory();
    expect(await vb1Page.isHistoryPageLoaded(), 'History page should load').toBe(true);

    // Apply Expense filter
    await vb1Page.clickExpenseFilter();

    // Search for "Orlando"
    await vb1Page.searchTransactions(testData.history.searchTerm);

    // Assert: at least one row is visible
    const rowCount = await vb1Page.getTransactionRowCount();
    expect(rowCount, 'At least one transaction should match the search').toBeGreaterThan(0);

    // Assert: the description row contains "Orlando"
    const found = await vb1Page.isTransactionVisible(testData.transfer.description);
    expect(found, 'The transfer description "Towards trip to Orlando" should be visible').toBe(true);

    // Assert: the amount matches
    const amounts = await vb1Page.getTransactionAmounts();
    const hasExpectedAmount = amounts.some(a => a.includes('250'));
    expect(hasExpectedAmount, `Amount ${testData.history.expectedAmount} should appear in results`).toBe(true);

    // Assert: status is "completed"
    const statuses = await vb1Page.getTransactionStatuses();
    const hasCompleted = statuses.some(s => s.toLowerCase().includes(testData.history.expectedStatus));
    expect(hasCompleted, 'Transaction status should be "completed"').toBe(true);
  });

  /**
   * E2E Flow – Full flow: login → record balance → transfer → verify balance → History verification
   * Type: Positive | Priority: High | Tags: smoke, e2e
   */
  test('VB-1-E2E: Full end-to-end fund transfer flow', async ({ page }) => {
    vb1Page = new Vb1Page(page);

    // Step 1: Navigate and login
    await vb1Page.navigateTo(testData.appUrl);
    await vb1Page.login(testData.credentials.valid.username, testData.credentials.valid.password);
    expect(await vb1Page.isDashboardLoaded(), 'Dashboard should load after login').toBe(true);

    // Step 2: Record balance
    const balanceBefore = await vb1Page.getBalanceAmount();
    expect(balanceBefore, 'Pre-transfer balance should be positive').toBeGreaterThan(0);

    // Step 3: Navigate to Transfer
    await vb1Page.goToTransfer();
    expect(await vb1Page.isTransferPageLoaded(), 'Transfer page must load').toBe(true);

    // Step 4: Submit transfer
    await vb1Page.fillAndSubmitTransfer(
      testData.transfer.recipientAccount,
      testData.transfer.amount,
      testData.transfer.description
    );
    expect(await vb1Page.isTransferSuccessful(), 'Transfer should succeed').toBe(true);

    // Step 5: Verify updated balance on dashboard
    await vb1Page.goToDashboard();
    const balanceAfter = await vb1Page.getBalanceAmount();
    const expectedBalance = balanceBefore - parseFloat(testData.transfer.amount);
    expect(balanceAfter).toBeCloseTo(expectedBalance, 0);

    // Step 6: Navigate to History and verify transaction
    await vb1Page.goToHistory();
    await vb1Page.clickExpenseFilter();
    await vb1Page.searchTransactions(testData.history.searchTerm);

    const rowCount = await vb1Page.getTransactionRowCount();
    expect(rowCount, 'Filtered+searched results should have at least 1 row').toBeGreaterThan(0);

    const found = await vb1Page.isTransactionVisible(testData.transfer.description);
    expect(found, 'Transfer should appear in history under Expense filter + Orlando search').toBe(true);

    const statuses = await vb1Page.getTransactionStatuses();
    expect(statuses.some(s => s.toLowerCase().includes('completed')), 'Status should be completed').toBe(true);
  });

  // ──────────────────────────────── NEGATIVE SCENARIOS ─────────────────────────

  /**
   * TC_VB1_N01 – Login fails with invalid credentials
   * Type: Negative | Priority: High | Tags: regression, security
   */
  test('TC_VB1_N01: Login is rejected with invalid credentials', async ({ page }) => {
    vb1Page = new Vb1Page(page);
    await vb1Page.navigateTo(testData.appUrl);

    await vb1Page.login(testData.credentials.invalid.username, testData.credentials.invalid.password);

    // Assert: still on login page
    expect(await vb1Page.isOnLoginPage(), 'User should remain on login page').toBe(true);

    // Assert: error message is displayed
    const errorMsg = await vb1Page.getLoginError();
    expect(errorMsg, 'An error message should be displayed').toBeTruthy();
    expect(errorMsg, 'Error should mention invalid credentials').toContain(testData.errorMessages.invalidCredentials);
  });

  /**
   * TC_VB1_N02 – Transfer fails when recipient account number is invalid
   * Type: Negative | Priority: High | Tags: regression, validation
   */
  test('TC_VB1_N02: Transfer is rejected when recipient account is invalid', async ({ page }) => {
    vb1Page = new Vb1Page(page);
    await loginAsValidUser(vb1Page);
    await vb1Page.goToTransfer();

    await vb1Page.fillAndSubmitTransfer(
      testData.transfer.invalidAccount,
      testData.transfer.amount,
      testData.transfer.invalidDescription
    );

    // Assert: error alert is displayed
    const errorMsg = await vb1Page.getTransferError();
    expect(errorMsg, 'Error message should be shown for invalid account').toBeTruthy();
    expect(errorMsg, 'Error should mention account not found').toContain(testData.errorMessages.recipientNotFound);

    // Assert: still on transfer page
    expect(await vb1Page.getCurrentUrl()).toContain('/transfer');
  });

  /**
   * TC_VB1_N03 – Transfer fails when amount exceeds available balance
   * Type: Negative | Priority: High | Tags: regression, validation
   */
  test('TC_VB1_N03: Transfer is rejected when amount exceeds available balance', async ({ page }) => {
    vb1Page = new Vb1Page(page);
    await loginAsValidUser(vb1Page);
    await vb1Page.goToTransfer();

    await vb1Page.fillAndSubmitTransfer(
      testData.transfer.recipientAccount,
      testData.transfer.overdraftAmount,
      testData.transfer.overdraftDescription
    );

    // Assert: error alert is displayed
    const errorMsg = await vb1Page.getTransferError();
    expect(errorMsg, 'Error message should be shown for insufficient funds').toBeTruthy();
    expect(errorMsg, 'Error should mention insufficient balance').toContain(testData.errorMessages.insufficientBalance);

    // Assert: still on transfer page
    expect(await vb1Page.getCurrentUrl()).toContain('/transfer');
  });

  /**
   * TC_VB1_N04 – Transfer form validation when required fields are left empty
   * Type: Negative | Priority: High | Tags: regression, validation
   */
  test('TC_VB1_N04: Transfer form shows validation when required fields are empty', async ({ page }) => {
    vb1Page = new Vb1Page(page);
    await loginAsValidUser(vb1Page);
    await vb1Page.goToTransfer();

    // Click Transfer without filling any fields
    await vb1Page.clickTransferButton();

    // Assert: no success, still on transfer page
    const isSuccess = await vb1Page.isTransferSuccessful();
    expect(isSuccess, 'Transfer should NOT succeed with empty fields').toBe(false);
    expect(await vb1Page.getCurrentUrl()).toContain('/transfer');

    // Either an error message OR the browser's native HTML5 validation should block submission
    const errorMsg = await vb1Page.getTransferError();
    const recipientFieldValue = await page.locator('input[name="recipientAccount"]').inputValue();
    const amountFieldValue = await page.locator('input[name="amount"]').inputValue();

    const validationTriggered =
      errorMsg !== null ||
      recipientFieldValue === '' ||
      amountFieldValue === '' ||
      amountFieldValue === '0';

    expect(validationTriggered, 'Form validation should prevent empty-field submission').toBe(true);
    console.log(`[TC_VB1_N04] Error msg: "${errorMsg}", Recipient: "${recipientFieldValue}", Amount: "${amountFieldValue}"`);
  });

  // ──────────────────────────────── EDGE CASE SCENARIOS ────────────────────────

  /**
   * TC_VB1_E01 – Transfer with boundary amount (minimum USD 0.01)
   * Type: Edge | Priority: Medium | Tags: boundary
   */
  test('TC_VB1_E01: Transfer with minimum boundary amount USD 0.01 is handled gracefully', async ({ page }) => {
    vb1Page = new Vb1Page(page);
    await loginAsValidUser(vb1Page);
    await vb1Page.goToTransfer();

    await vb1Page.fillAndSubmitTransfer(
      testData.transfer.recipientAccount,
      testData.transfer.minBoundaryAmount,
      testData.transfer.boundaryDescription
    );

    // Assert: system responds without crashing — either success or a clear error
    const isSuccess = await vb1Page.isTransferSuccessful();
    const errorMsg  = await vb1Page.getTransferError();
    const handledGracefully = isSuccess || errorMsg !== null;

    expect(handledGracefully, 'App should either accept or cleanly reject a $0.01 transfer').toBe(true);
    console.log(`[TC_VB1_E01] Boundary transfer result — Success: ${isSuccess}, Error: "${errorMsg}"`);
  });

  /**
   * TC_VB1_E02 – History search returns no results for non-matching search term
   * Type: Edge | Priority: Medium | Tags: edge
   */
  test('TC_VB1_E02: History search with non-matching term shows no results state', async ({ page }) => {
    vb1Page = new Vb1Page(page);
    await loginAsValidUser(vb1Page);
    await vb1Page.goToHistory();

    // Apply Expense filter and search for a term that won't match anything
    await vb1Page.clickExpenseFilter();
    await vb1Page.searchTransactions(testData.history.noMatchSearchTerm);

    // Assert: empty state is visible
    const isEmpty = await vb1Page.isEmptyStateVisible();
    expect(isEmpty, '"No transactions found" empty state should appear').toBe(true);

    // Assert: zero rows in the table
    const rowCount = await vb1Page.getTransactionRowCount();
    expect(rowCount, 'No transaction rows should be shown for non-matching search').toBe(0);

    // Assert: count heading shows "(0)"
    const countText = await vb1Page.getTransactionsCountText();
    expect(countText, 'Transactions count should show 0').toContain('0');
  });

});
