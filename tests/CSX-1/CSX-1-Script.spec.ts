import { test, expect } from '@playwright/test';
import { Csx1Page } from '../../pages/CSX-1-Page';
import testData from '../../Test_Data/CSX-1-test-data.json';
import { Csx1PageLocators } from '../../Locators/CSX-1-Locators';

function getCaseData(testCaseId: string) {
  const testCase = testData.testCases.find((item) => item.testCaseId === testCaseId);
  if (!testCase) {
    throw new Error(`Missing test data for ${testCaseId}`);
  }
  return testCase.data;
}

function assertEstimateBelowLimit(estimate: string | null, maximumExclusive: number): void {
  expect(estimate).toBeTruthy();
  const match = estimate?.match(/(\d+(?:\.\d+)?)\s*tons?/i);
  expect(match, 'The displayed estimation should include a value in tons').not.toBeNull();
  expect(Number(match?.[1])).toBeLessThan(maximumExclusive);
}

test('CSX-1-TC_P01: Estimate emissions for Groceries from <redacted:startCity> to <redacted:endCity> at 2500 Tons', async ({ page }) => {
  const pageObject = new Csx1Page(page);
  const data = getCaseData('CSX-1-TC_P01');
  const maximumExclusive = 'maximumEstimateExclusive' in data ? data.maximumEstimateExclusive : 300;

  await test.step('CSX-1-TC_P01 | Step 1: Navigate to the story URL and wait for the estimator to load.', async () => {
    await pageObject.navigate();
  });
  await test.step('CSX-1-TC_P01 | Step 2: In the Goods section, select Groceries.', async () => {
    await pageObject.selectGroceries();
  });
  await test.step('CSX-1-TC_P01 | Step 3: Select the specified Start City.', async () => {
    await pageObject.selectStartCity(data.startCity);
  });
  await test.step('CSX-1-TC_P01 | Step 4: Select the specified End City.', async () => {
    await pageObject.selectEndCity(data.endCity);
  });
  await test.step('CSX-1-TC_P01 | Step 5: Select 2500 Tons as the Freight Volume.', async () => {
    await pageObject.selectFreightVolume2500Tons();
  });
  await test.step('CSX-1-TC_P01 | Step 6: Review the displayed carbon emission estimation.', async () => {
    const estimation = await pageObject.getCarbonEmissionEstimation();
    assertEstimateBelowLimit(estimation, maximumExclusive);
  });
});

test('CSX-1-TC_P02: Generate the specified estimate when selections are entered in a different order', async ({ page }) => {
  const pageObject = new Csx1Page(page);
  const data = getCaseData('CSX-1-TC_P02');
  const maximumExclusive = 'maximumEstimateExclusive' in data ? data.maximumEstimateExclusive : 300;

  await test.step('CSX-1-TC_P02 | Step 1: Navigate to the story URL and wait for the estimator to load.', async () => {
    await pageObject.navigate();
  });
  await test.step('CSX-1-TC_P02 | Step 2: Select the specified Start City.', async () => {
    await pageObject.selectStartCity(data.startCity);
  });
  await test.step('CSX-1-TC_P02 | Step 3: Select the specified End City.', async () => {
    await pageObject.selectEndCity(data.endCity);
  });
  await test.step('CSX-1-TC_P02 | Step 4: In the Goods section, select Groceries.', async () => {
    await pageObject.selectGroceries();
  });
  await test.step('CSX-1-TC_P02 | Step 5: Select 2500 Tons as the Freight Volume.', async () => {
    await pageObject.selectFreightVolume2500Tons();
  });
  await test.step('CSX-1-TC_P02 | Step 6: Review the displayed carbon emission estimation.', async () => {
    const estimation = await pageObject.getCarbonEmissionEstimation();
    assertEstimateBelowLimit(estimation, maximumExclusive);
  });
});

test('CSX-1-TC_N01: Do not display a completed estimate when Goods is not selected', async ({ page }) => {
  const pageObject = new Csx1Page(page);
  const data = getCaseData('CSX-1-TC_N01');

  await test.step('CSX-1-TC_N01 | Step 1: Navigate to the story URL and wait for the estimator to load.', async () => {
    await pageObject.navigate();
  });
  await test.step('CSX-1-TC_N01 | Step 2: Leave the Goods selection unset.', async () => {
    expect(data.goods).toBeNull();
    await expect(page.locator(Csx1PageLocators.goods)).toHaveValue('');
  });
  await test.step('CSX-1-TC_N01 | Step 3: Select the specified Start City, End City, and Freight Volume.', async () => {
    await pageObject.selectStartCity(data.startCity);
    await pageObject.selectEndCity(data.endCity);
    await pageObject.selectFreightVolume2500Tons();
  });
  await test.step('CSX-1-TC_N01 | Step 4: Check whether a carbon emission estimation is displayed.', async () => {
    await expect(page.locator(Csx1PageLocators.carbonEmissionEstimation)).toHaveCount(0);
  });
});