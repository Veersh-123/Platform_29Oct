// --- Previous version preserved by Dry Run repair ---
// import { Page } from '@playwright/test';
// import { Rcnd1PageLocators as Locators } from '../Locators/RCND-1-Locators';
//
// export class Rcnd1Page {
//   constructor(private readonly page: Page) {}
//
//   async navigateToFlightStatus(): Promise<void> {
//     await this.page.goto('https://www.aircanada.com/home/ca/en/aco/flight-status');
//   }
//
//   async selectByRoute(): Promise<void> {
//     await this.page.locator(Locators.byRouteRadio).check();
//   }
//
//   async fillFromAirport(airportCode: string): Promise<void> {
//     await this.page.locator(Locators.fromField).fill(airportCode);
//     await this.selectFirstAirportSuggestion();
//   }
//
//   async leaveFromFieldEmpty(): Promise<void> {
//     await this.page.locator(Locators.fromField).clear();
//   }
//
//   async fillToAirport(airportCode: string): Promise<void> {
//     await this.page.locator(Locators.toField).fill(airportCode);
//     await this.selectFirstAirportSuggestion();
//   }
//
//   private async selectFirstAirportSuggestion(): Promise<void> {
//     const firstSuggestion = this.page.locator(Locators.airportSuggestion).first();
//     await firstSuggestion.waitFor({ state: 'visible' });
//     await firstSuggestion.click();
//   }
//
//   async waitFiveSeconds(): Promise<void> {
//     await this.page.waitForTimeout(5000);
//   }
//
//   async selectDepartureDate(): Promise<void> {
//     await this.page.locator(Locators.departureDate).click();
//   }
//
//   async searchFlights(): Promise<void> {
//     await this.page.locator(Locators.searchButton).click();
//   }
//
//   async waitForFlightResults(): Promise<void> {
//     await this.page.locator(Locators.flightResults).first().waitFor({ state: 'visible' });
//   }
//
//   async openFirstFlightDetails(): Promise<void> {
//     await this.page.locator(Locators.firstFlightDetails).first().click();
//   }
//
//   async isOnTimeStatusVisible(): Promise<boolean> {
//     return this.page.locator(Locators.onTimeStatus).isVisible();
//   }
//
//   async areFlightResultsDisplayed(): Promise<boolean> {
//     return (await this.page.locator(Locators.flightResults).count()) > 0;
//   }
//
//   async getFromFieldValue(): Promise<string> {
//     return this.page.locator(Locators.fromField).inputValue();
//   }
// }
// --- Active repaired version ---
import { Page } from '@playwright/test';
import { Rcnd1PageLocators as Locators } from '../Locators/RCND-1-Locators';

export class Rcnd1Page {
  constructor(private readonly page: Page) {}

  async navigateToFlightStatus(): Promise<void> {
    await this.page.goto('https://www.aircanada.com/home/ca/en/aco/flight-status');
  }

  async selectByRoute(): Promise<void> {
    await this.page.locator(Locators.byRouteRadio).check();
  }

  async fillFromAirport(airportCode: string): Promise<void> {
    await this.page.locator(Locators.fromField).fill(airportCode);
    await this.selectFirstAirportSuggestion();
  }

  async leaveFromFieldEmpty(): Promise<void> {
    await this.page.locator(Locators.fromField).clear();
  }

  async fillToAirport(airportCode: string): Promise<void> {
    await this.page.locator(Locators.toField).fill(airportCode);
    await this.selectFirstAirportSuggestion();
  }

  private async selectFirstAirportSuggestion(): Promise<void> {
    const firstSuggestion = this.page.locator(Locators.airportSuggestion).first();
    await firstSuggestion.waitFor({ state: 'visible' });
    await firstSuggestion.click();
  }

  async waitFiveSeconds(): Promise<void> {
    await this.page.waitForTimeout(5000);
  }

  async selectDepartureDate(): Promise<void> {
    await this.page.locator(Locators.departureDateSelector).click();
    const departureDate = this.page.locator(Locators.departureDate);
    await departureDate.waitFor({ state: 'visible' });
    await departureDate.click();
  }

  async searchFlights(): Promise<void> {
    await this.page.locator(Locators.searchButton).click();
  }

  async waitForFlightResults(): Promise<void> {
    await this.page.locator(Locators.flightResults).first().waitFor({ state: 'visible' });
  }

  async openFirstFlightDetails(): Promise<void> {
    await this.page.locator(Locators.firstFlightDetails).first().click();
  }

  async isOnTimeStatusVisible(): Promise<boolean> {
    return this.page.locator(Locators.onTimeStatus).isVisible();
  }

  async areFlightResultsDisplayed(): Promise<boolean> {
    return (await this.page.locator(Locators.flightResults).count()) > 0;
  }

  async getFromFieldValue(): Promise<string> {
    return this.page.locator(Locators.fromField).inputValue();
  }
}
