import { expect, test } from '@playwright/test';
import { Rcnd1Page } from '../../pages/RCND-1-Page';
import testData from '../../Test_Data/RCND-1-test-data.json';

test('RCND-1-TC_P01 | Search YYZ to YHZ and verify first flight is On Time', async ({ page }) => {
  const testCase = testData.testCases.find((item) => item.testCaseId === 'RCND-1-TC_P01');
  if (!testCase) throw new Error('Test data for RCND-1-TC_P01 was not found.');
  const pageObject = new Rcnd1Page(page);

  await test.step('RCND-1-TC_P01 | Step 1: Navigate to the flight-status page', async () => {
    await pageObject.navigateToFlightStatus();
    await expect(page).toHaveURL(testCase.data.url);
  });
  await test.step('RCND-1-TC_P01 | Step 2: Select By Route', async () => {
    await pageObject.selectByRoute();
  });
  await test.step('RCND-1-TC_P01 | Step 3: Enter YYZ and select the first From suggestion', async () => {
    await pageObject.fillFromAirport(testCase.data.fromCode);
  });
  await test.step('RCND-1-TC_P01 | Step 4: Wait five seconds after selecting the origin', async () => {
    await pageObject.waitFiveSeconds();
  });
  await test.step('RCND-1-TC_P01 | Step 5: Enter YHZ and select the first To suggestion', async () => {
    await pageObject.fillToAirport(testCase.data.toCode);
  });
  await test.step('RCND-1-TC_P01 | Step 6: Wait five seconds after selecting the destination', async () => {
    await pageObject.waitFiveSeconds();
  });
  await test.step('RCND-1-TC_P01 | Step 7: Select the Fri Oct 16 departure date', async () => {
    await pageObject.selectDepartureDate();
  });
  await test.step('RCND-1-TC_P01 | Step 8: Search for flights', async () => {
    await pageObject.searchFlights();
  });
  await test.step('RCND-1-TC_P01 | Step 9: Wait for flight results', async () => {
    await pageObject.waitForFlightResults();
    await expect(await pageObject.areFlightResultsDisplayed()).toBe(true);
  });
  await test.step('RCND-1-TC_P01 | Step 10: Open the first flight details', async () => {
    await pageObject.openFirstFlightDetails();
  });
  await test.step('RCND-1-TC_P01 | Step 11: Verify the flight is On Time', async () => {
    await expect(await pageObject.isOnTimeStatusVisible()).toBe(true);
  });
});

test('RCND-1-TC_P02 | Search the reverse route using the displayed airport suggestions', async ({ page }) => {
  const testCase = testData.testCases.find((item) => item.testCaseId === 'RCND-1-TC_P02');
  if (!testCase) throw new Error('Test data for RCND-1-TC_P02 was not found.');
  const pageObject = new Rcnd1Page(page);

  await test.step('RCND-1-TC_P02 | Step 1: Navigate to the flight-status page', async () => {
    await pageObject.navigateToFlightStatus();
    await expect(page).toHaveURL(testCase.data.url);
  });
  await test.step('RCND-1-TC_P02 | Step 2: Select By Route', async () => {
    await pageObject.selectByRoute();
  });
  await test.step('RCND-1-TC_P02 | Step 3: Enter YHZ and select the first From suggestion', async () => {
    await pageObject.fillFromAirport(testCase.data.fromCode);
  });
  await test.step('RCND-1-TC_P02 | Step 4: Wait five seconds after selecting the origin', async () => {
    await pageObject.waitFiveSeconds();
  });
  await test.step('RCND-1-TC_P02 | Step 5: Enter YYZ and select the first To suggestion', async () => {
    await pageObject.fillToAirport(testCase.data.toCode);
  });
  await test.step('RCND-1-TC_P02 | Step 6: Wait five seconds after selecting the destination', async () => {
    await pageObject.waitFiveSeconds();
  });
  await test.step('RCND-1-TC_P02 | Step 7: Select the Fri Oct 16 departure date', async () => {
    await pageObject.selectDepartureDate();
  });
  await test.step('RCND-1-TC_P02 | Step 8: Search for flights', async () => {
    await pageObject.searchFlights();
  });
  await test.step('RCND-1-TC_P02 | Step 9: Wait for reverse-route flight results', async () => {
    await pageObject.waitForFlightResults();
    await expect(await pageObject.areFlightResultsDisplayed()).toBe(true);
  });
});

test('RCND-1-TC_N01 | Prevent a route search when the From field is empty', async ({ page }) => {
  const testCase = testData.testCases.find((item) => item.testCaseId === 'RCND-1-TC_N01');
  if (!testCase) throw new Error('Test data for RCND-1-TC_N01 was not found.');
  const pageObject = new Rcnd1Page(page);

  await test.step('RCND-1-TC_N01 | Step 1: Navigate to the flight-status page', async () => {
    await pageObject.navigateToFlightStatus();
    await expect(page).toHaveURL(testCase.data.url);
  });
  await test.step('RCND-1-TC_N01 | Step 2: Select By Route', async () => {
    await pageObject.selectByRoute();
  });
  await test.step('RCND-1-TC_N01 | Step 3: Leave the From field empty', async () => {
    await pageObject.leaveFromFieldEmpty();
    await expect(await pageObject.getFromFieldValue()).toBe('');
  });
  await test.step('RCND-1-TC_N01 | Step 4: Enter YHZ and select the first To suggestion', async () => {
    await pageObject.fillToAirport(testCase.data.toCode);
  });
  await test.step('RCND-1-TC_N01 | Step 5: Wait five seconds after selecting the destination', async () => {
    await pageObject.waitFiveSeconds();
  });
  await test.step('RCND-1-TC_N01 | Step 6: Select the Fri Oct 16 departure date', async () => {
    await pageObject.selectDepartureDate();
  });
  await test.step('RCND-1-TC_N01 | Step 7: Submit the incomplete route search', async () => {
    await pageObject.searchFlights();
  });
  await test.step('RCND-1-TC_N01 | Step 8: Verify results are absent and From remains empty', async () => {
    await expect(await pageObject.areFlightResultsDisplayed()).toBe(false);
    await expect(await pageObject.getFromFieldValue()).toBe('');
  });
});