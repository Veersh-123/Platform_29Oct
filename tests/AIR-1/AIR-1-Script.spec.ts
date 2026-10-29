import { test, expect } from '@playwright/test';
import { Air1Page } from '../../pages/AIR-1-Page';
import { Air1PageLocators } from '../../Locators/AIR-1-Locators';
import air1TestData from '../../Test_Data/AIR-1-test-data.json';

const p01 = air1TestData.testCases.find((testCase) => testCase.testCaseId === 'AIR-1-TC_P01')!;
const p02 = air1TestData.testCases.find((testCase) => testCase.testCaseId === 'AIR-1-TC_P02')!;
const p03 = air1TestData.testCases.find((testCase) => testCase.testCaseId === 'AIR-1-TC_P03')!;

async function expectSearchResultDetails(page: import('@playwright/test').Page): Promise<void> {
  await expect(page.locator(Air1PageLocators.resultDestination)).toBeVisible();
  await expect(page.locator(Air1PageLocators.resultCheckInDate)).toBeVisible();
  await expect(page.locator(Air1PageLocators.resultCheckOutDate)).toBeVisible();
  await expect(page.locator(Air1PageLocators.resultGuestCount)).toBeVisible();
}

test('AIR-1-TC_P01 | Search Chennai for the specified dates and three adults', async ({ page }) => {
  const air1Page = new Air1Page(page);
  await air1Page.navigateToAirbnb();
  await expect(page.locator(Air1PageLocators.destinationSearchButton)).toBeVisible();

  await test.step('AIR-1-TC_P01 | Step 1: Enter Chennai, Tamil Nadu in the destination search bar and select the matching destination option if options are presented.', async () => {
    await air1Page.enterDestination(p01.data.destination);
  });
  await test.step('AIR-1-TC_P01 | Step 2: Set check-in to 01-12-2026.', async () => {
    await air1Page.setCheckInDate();
  });
  await test.step('AIR-1-TC_P01 | Step 3: Set check-out to 04-12-2026.', async () => {
    await air1Page.setCheckOutDate();
  });
  await test.step('AIR-1-TC_P01 | Step 4: Open the add guests section and set adults to 3.', async () => {
    await air1Page.setAdultsToThree();
  });
  await test.step('AIR-1-TC_P01 | Step 5: Submit the search and wait for the results page to finish loading.', async () => {
    await air1Page.submitSearch();
    await expect(page.locator(Air1PageLocators.searchResults)).toHaveCountGreaterThan(1);
  });
  await test.step('AIR-1-TC_P01 | Step 6: Select the first search result and wait for its page to finish loading.', async () => {
    await air1Page.selectFirstSearchResult();
    await expectSearchResultDetails(page);
  });
});

test('AIR-1-TC_P02 | Complete the search with dates and guests before destination', async ({ page }) => {
  const air1Page = new Air1Page(page);
  await air1Page.navigateToAirbnb();
  await expect(page.locator(Air1PageLocators.destinationSearchButton)).toBeVisible();

  await test.step('AIR-1-TC_P02 | Step 1: Set check-in to 01-12-2026 and check-out to 04-12-2026.', async () => {
    await air1Page.setCheckInDate();
    await air1Page.setCheckOutDate();
  });
  await test.step('AIR-1-TC_P02 | Step 2: Open the add guests section and set adults to 3.', async () => {
    await air1Page.setAdultsToThree();
  });
  await test.step('AIR-1-TC_P02 | Step 3: Enter Chennai, Tamil Nadu in the destination search bar and select the matching destination option if options are presented.', async () => {
    await air1Page.enterDestination(p02.data.destination);
  });
  await test.step('AIR-1-TC_P02 | Step 4: Submit the search and wait for the results page to finish loading.', async () => {
    await air1Page.submitSearch();
    await expect(page.locator(Air1PageLocators.searchResults)).toHaveCountGreaterThan(1);
  });
  await test.step('AIR-1-TC_P02 | Step 5: Select the first search result and wait for its page to finish loading.', async () => {
    await air1Page.selectFirstSearchResult();
    await expectSearchResultDetails(page);
  });
});

test('AIR-1-TC_P03 | Verify the guest options expand and retain three adults through search', async ({ page }) => {
  const air1Page = new Air1Page(page);
  await air1Page.navigateToAirbnb();
  await expect(page.locator(Air1PageLocators.destinationSearchButton)).toBeVisible();

  await test.step('AIR-1-TC_P03 | Step 1: Open the add guests section.', async () => {
    await air1Page.openGuestOptions();
    await expect(page.locator(Air1PageLocators.adultsCount)).toBeVisible();
  });
  await test.step('AIR-1-TC_P03 | Step 2: Inspect the expanded guest options and set adults to 3.', async () => {
    await air1Page.setAdultsToThree();
  });
  await test.step('AIR-1-TC_P03 | Step 3: Enter Chennai, Tamil Nadu as the destination.', async () => {
    await air1Page.enterDestination(p03.data.destination);
  });
  await test.step('AIR-1-TC_P03 | Step 4: Set check-in to 01-12-2026 and check-out to 04-12-2026.', async () => {
    await air1Page.setCheckInDate();
    await air1Page.setCheckOutDate();
  });
  await test.step('AIR-1-TC_P03 | Step 5: Submit the search and wait for the results page to finish loading.', async () => {
    await air1Page.submitSearch();
    await expect(page.locator(Air1PageLocators.searchResults)).toHaveCountGreaterThan(1);
  });
  await test.step('AIR-1-TC_P03 | Step 6: Select the first search result and wait for its page to finish loading.', async () => {
    await air1Page.selectFirstSearchResult();
    await expectSearchResultDetails(page);
  });
});