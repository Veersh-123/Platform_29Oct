// --- Previous version preserved by Dry Run repair ---
// import { Page } from '@playwright/test';
// import { Csx1PageLocators as Locators } from '../Locators/CSX-1-Locators';
//
// export class Csx1Page {
//   constructor(private readonly page: Page) {}
//
//   async navigate(): Promise<void> {
//     await this.page.goto('https://www.csx.com/index.cfm/about-us/sustainability/environment/carbon-estimator/');
//     await this.page.locator(Locators.goods).waitFor({ state: 'visible' });
//     await this.page.locator(Locators.startCity).waitFor({ state: 'visible' });
//     await this.page.locator(Locators.endCity).waitFor({ state: 'visible' });
//     await this.page.locator(Locators.freightVolume).waitFor({ state: 'visible' });
//   }
//
//   async selectGroceries(): Promise<void> {
//     await this.page.locator(Locators.goods).click();
//     await this.page.locator(Locators.groceries).click();
//   }
//
//   async selectStartCity(city: string): Promise<void> {
//     await this.page.locator(Locators.startCity).selectOption({ label: city });
//   }
//
//   async selectEndCity(city: string): Promise<void> {
//     await this.page.locator(Locators.endCity).selectOption({ label: city });
//   }
//
//   async selectFreightVolume2500Tons(): Promise<void> {
//     await this.page.locator(Locators.freightVolume).click();
//     await this.page.locator(Locators.freightVolume2500Tons).click();
//   }
//
//   async getCarbonEmissionEstimation(): Promise<string | null> {
//     const estimation = this.page.locator(Locators.carbonEmissionEstimation);
//     await estimation.waitFor({ state: 'visible' });
//     return estimation.textContent();
//   }
// }
// --- Active repaired version ---
import { Page } from '@playwright/test';
import { Csx1PageLocators as Locators } from '../Locators/CSX-1-Locators';

export class Csx1Page {
  constructor(private readonly page: Page) {}

  async navigate(): Promise<void> {
    await this.page.goto('https://www.csx.com/index.cfm/about-us/sustainability/environment/');
    await this.page.locator(Locators.carbonEstimatorLink).click();
    await this.page.locator(Locators.goods).waitFor({ state: 'visible' });
    await this.page.locator(Locators.startCity).waitFor({ state: 'visible' });
    await this.page.locator(Locators.endCity).waitFor({ state: 'visible' });
    await this.page.locator(Locators.freightVolume).waitFor({ state: 'visible' });
  }

  async selectGroceries(): Promise<void> {
    await this.page.locator(Locators.goods).click();
    await this.page.locator(Locators.groceries).click();
  }

  async selectStartCity(city: string): Promise<void> {
    await this.page.locator(Locators.startCity).selectOption({ label: city });
  }

  async selectEndCity(city: string): Promise<void> {
    await this.page.locator(Locators.endCity).selectOption({ label: city });
  }

  async selectFreightVolume2500Tons(): Promise<void> {
    await this.page.locator(Locators.freightVolume).click();
    await this.page.locator(Locators.freightVolume2500Tons).click();
  }

  async getCarbonEmissionEstimation(): Promise<string | null> {
    const estimation = this.page.locator(Locators.carbonEmissionEstimation);
    await estimation.waitFor({ state: 'visible' });
    return estimation.textContent();
  }
}