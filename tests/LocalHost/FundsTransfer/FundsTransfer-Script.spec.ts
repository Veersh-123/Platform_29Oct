import { test, expect } from '@playwright/test';
import { FundstransferPage } from '../../../pages/LocalHost/FundsTransfer/FundsTransfer-Page';
import testData from '../../../Test_Data/LocalHost/FundsTransfer/FundsTransfer-test-data.json';

function getCaseData(testCaseId: string) {
  const testCase = testData.testCases.find((item) => item.testCaseId === testCaseId);
  if (!testCase) {
    throw new Error(`Test data for ${testCaseId} was not found.`);
  }
  return testCase.data;
}

const transferData = getCaseData('FundsTransfer-TC_P01');
if (!('amountUSD' in transferData) || !('recipientAccountNumber' in transferData)) {
  throw new Error('Transfer test data is incomplete.');
}

const transferSetupData = getCaseData('FundsTransfer-TC_P02');
if (!('menuItem' in transferSetupData)) {
  throw new Error('Transfer screen test data is incomplete.');
}

const negativeData = getCaseData('FundsTransfer-TC_N01');

function parseBalance(balance: string): number {
  return Number(balance.replace(/[^\d.-]/g, ''));
}

test('FundsTransfer-TC_P01 | End-to-end USD 250 transfer updates balance and appears in filtered history', async ({ page }) => {
  const pageObject = new FundstransferPage(page);
  let preTransferBalance = 0;

  await test.step('FundsTransfer-TC_P01 | Step 1: Open the application', async () => {
    await pageObject.openLoginPage();
    await expect(page).toHaveURL(new URL('/login', testData.baseUrl).toString());
  });

  await test.step('FundsTransfer-TC_P01 | Step 2: Log in with the account credentials', async () => {
    await pageObject.enterCredentials(transferData.username, transferData.password);
    await pageObject.submitLogin();
    const balance = await pageObject.getAccountBalance();
    expect(balance.trim()).not.toBe('');
  });

  await test.step('FundsTransfer-TC_P01 | Step 3: Record the current account balance', async () => {
    const balance = await pageObject.getAccountBalance();
    preTransferBalance = parseBalance(balance);
    expect(Number.isFinite(preTransferBalance)).toBe(true);
  });

  await test.step('FundsTransfer-TC_P01 | Step 4: Open the Transfer screen', async () => {
    await pageObject.openTransferScreen();
  });

  await test.step('FundsTransfer-TC_P01 | Step 5: Enter the recipient account, amount, and description', async () => {
    await pageObject.enterTransferDetails(
      transferData.recipientAccountNumber,
      transferData.amountUSD,
      transferData.description,
    );
    expect(await pageObject.getRecipientAccountNumber()).toBe(transferData.recipientAccountNumber);
    expect(await pageObject.getTransferAmount()).toBe(transferData.amountUSD);
    expect(await pageObject.getTransferDescription()).toBe(transferData.description);
  });

  await test.step('FundsTransfer-TC_P01 | Step 6: Submit the transfer', async () => {
    await pageObject.submitTransfer();
    expect((await pageObject.getTransferSuccessMessage()).trim()).not.toBe('');
  });

  await test.step('FundsTransfer-TC_P01 | Step 7: Read the updated dashboard balance', async () => {
    await pageObject.openDashboard();
    const updatedBalance = parseBalance(await pageObject.getAccountBalance());
    expect(updatedBalance).toBe(preTransferBalance - Number(transferData.amountUSD));
  });

  await test.step('FundsTransfer-TC_P01 | Step 8: Open transaction History', async () => {
    await pageObject.openHistory();
  });

  await test.step('FundsTransfer-TC_P01 | Step 9: Filter history to expenses', async () => {
    await pageObject.selectExpenseFilter();
  });

  await test.step('FundsTransfer-TC_P01 | Step 10: Search history for Orlando', async () => {
    await pageObject.searchHistory(transferData.historySearch);
    const rowText = await pageObject.getTransferHistoryRowText();
    expect(rowText).toMatch(/\$\s?250(?:\.00)?/);
    expect(rowText.toLowerCase()).toContain(transferData.expectedStatus.toLowerCase());
  });
});

test('FundsTransfer-TC_P02 | Left-menu Transfer opens the transfer screen with required fields', async ({ page }) => {
  const pageObject = new FundstransferPage(page);

  await pageObject.openLoginPage();
  await pageObject.enterCredentials(transferSetupData.username, transferSetupData.password);
  await pageObject.submitLogin();
  expect((await pageObject.getAccountBalance()).trim()).not.toBe('');

  await test.step('FundsTransfer-TC_P02 | Step 1: Click the left-menu Transfer item', async () => {
    await pageObject.openTransferScreen();
  });

  await test.step('FundsTransfer-TC_P02 | Step 2: Verify the transfer inputs and button', async () => {
    expect(await pageObject.isRecipientAccountNumberVisible()).toBe(true);
    expect(await pageObject.isTransferAmountVisible()).toBe(true);
    expect(await pageObject.isTransferDescriptionVisible()).toBe(true);
    expect(await pageObject.isTransferButtonVisible()).toBe(true);
    expect(await pageObject.isTransferButtonEnabled()).toBe(true);
  });
});

test('FundsTransfer-TC_N01 | Login is rejected when the password is incorrect', async ({ page }) => {
  const pageObject = new FundstransferPage(page);
  let loginUrl = '';

  await test.step('FundsTransfer-TC_N01 | Step 1: Open the application', async () => {
    await pageObject.openLoginPage();
    await expect(page).toHaveURL(new URL('/login', testData.baseUrl).toString());
    loginUrl = page.url();
  });

  await test.step('FundsTransfer-TC_N01 | Step 2: Enter the username and incorrect password', async () => {
    await pageObject.enterCredentials(negativeData.username, negativeData.password);
  });

  await test.step('FundsTransfer-TC_N01 | Step 3: Submit the login form', async () => {
    await pageObject.submitLogin();
    expect((await pageObject.getLoginErrorMessage()).trim()).not.toBe('');
    await expect(page).toHaveURL(loginUrl);
  });
});
