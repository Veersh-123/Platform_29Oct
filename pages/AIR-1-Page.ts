import { Page } from '@playwright/test';
import { Air1PageLocators as Locators } from '../Locators/AIR-1-Locators';

export class Air1Page {
  constructor(private readonly page: Page) {}

  async navigateToAirbnb(): Promise<void> {
    await this.page.goto('https://www.airbnb.co.in/');
  }

  async enterDestination(destination: string): Promise<void> {
    await this.page.locator(Locators.destinationSearchButton).click();
    await this.page.locator(Locators.destinationInput).fill(destination);

    const destinationOption = this.page.locator(Locators.destinationOption);
    if (await destinationOption.isVisible()) {
      await destinationOption.click();
    }
  }

  async setCheckInDate(): Promise<void> {
    await this.page.locator(Locators.checkInButton).click();
    await this.page.locator(Locators.checkInDate).click();
  }

  async setCheckOutDate(): Promise<void> {
    await this.page.locator(Locators.checkOutButton).click();
    await this.page.locator(Locators.checkOutDate).click();
  }

  async openGuestOptions(): Promise<void> {
    await this.page.locator(Locators.addGuestsButton).click();
    await this.page.locator(Locators.adultsCount).waitFor({ state: 'visible' });
  }

  async setAdultsToThree(): Promise<void> {
    await this.openGuestOptions();
    await this.page.locator(Locators.increaseAdultsButton).first().click();
    await this.page.locator(Locators.increaseAdultsButton).first().click();
  }

  async submitSearch(): Promise<void> {
    await this.page.locator(Locators.searchButton).click();
    await this.page.locator(Locators.searchResults).first().waitFor({ state: 'visible' });
  }

  async waitForSearchResults(): Promise<void> {
    await this.page.locator(Locators.searchResults).first().waitFor({ state: 'visible' });
  }

  async selectFirstSearchResult(): Promise<void> {
    await this.page.locator(Locators.firstSearchResult).first().click();
    await this.page.waitForLoadState('domcontentloaded');
  }
}