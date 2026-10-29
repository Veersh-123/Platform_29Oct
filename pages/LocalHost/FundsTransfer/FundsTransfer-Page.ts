// --- Previous version preserved by Dry Run repair ---
// import { Page } from '@playwright/test';
// import { FundstransferPageLocators as Locators } from '../../../Locators/LocalHost/FundsTransfer/FundsTransfer-Locators';
//
// export class FundstransferPage {
//   constructor(private readonly page: Page) {}
//
//   private getLabelLocator(locator: string) {
//     const label = locator.startsWith('label=') ? locator.slice('label='.length) : locator;
//     return this.page.getByLabel(label);
//   }
//
//   async openLoginPage(): Promise<void> {
//     await this.page.goto('https://vb-bank-demo.vercel.app/');
//   }
//
//   async enterCredentials(username: string, password: string): Promise<void> {
//     await this.page.locator(Locators.usernameInput).fill(username);
//     await this.page.locator(Locators.passwordInput).fill(password);
//   }
//
//   async submitLogin(): Promise<void> {
//     await this.page.locator(Locators.loginSubmitButton).click();
//   }
//
//   async getLoginErrorMessage(): Promise<string> {
//     return this.page.locator(Locators.loginErrorMessage).innerText();
//   }
//
//   async getAccountBalance(): Promise<string> {
//     return this.page.locator(Locators.accountBalance).innerText();
//   }
//
//   async openTransferScreen(): Promise<void> {
//     const transferNavItem = this.page.locator(Locators.transferNavItem);
//     await transferNavItem.waitFor({ state: 'visible' });    
//     await transferNavItem.click();
//   }
//
//   async enterRecipientAccountNumber(accountNumber: string): Promise<void> {
//     const recipientAccountNumberInput = this.getLabelLocator(Locators.recipientAccountNumberInput);
//     /* await recipientAccountNumberInput.waitFor({ state: 'visible' });
//     */
//    await recipientAccountNumberInput.fill(accountNumber); 
//   }
//
//   async enterTransferAmount(amount: string): Promise<void> {
//     await this.getLabelLocator(Locators.transferAmountInput).fill(amount);
//   }
//
//   async enterTransferDescription(description: string): Promise<void> {
//     await this.getLabelLocator(Locators.transferDescriptionInput).fill(description);
//   }
//
//   async enterTransferDetails(accountNumber: string, amount: string, description: string): Promise<void> {
//     await this.enterRecipientAccountNumber(accountNumber);
//     await this.enterTransferAmount(amount);
//     await this.enterTransferDescription(description);
//   }
//
//   async getRecipientAccountNumber(): Promise<string> {
//     return this.getLabelLocator(Locators.recipientAccountNumberInput).inputValue();
//   }
//
//   async getTransferAmount(): Promise<string> {
//     return this.getLabelLocator(Locators.transferAmountInput).inputValue();
//   }
//
//   async getTransferDescription(): Promise<string> {
//     return this.getLabelLocator(Locators.transferDescriptionInput).inputValue();
//   }
//
//   async isRecipientAccountNumberVisible(): Promise<boolean> {
//     return this.getLabelLocator(Locators.recipientAccountNumberInput).isVisible();
//   }
//
//   async isTransferAmountVisible(): Promise<boolean> {
//     return this.getLabelLocator(Locators.transferAmountInput).isVisible();
//   }
//
//   async isTransferDescriptionVisible(): Promise<boolean> {
//     return this.getLabelLocator(Locators.transferDescriptionInput).isVisible();
//   }
//
//   async isTransferButtonVisible(): Promise<boolean> {
//     return this.page.getByRole('button', { name: Locators.transferSubmitButton }).isVisible();
//   }
//
//   async isTransferButtonEnabled(): Promise<boolean> {
//     return this.page.getByRole('button', { name: Locators.transferSubmitButton }).isEnabled();
//   }
//
//   async submitTransfer(): Promise<void> {
//     await this.page.getByRole('button', { name: Locators.transferSubmitButton }).click();
//   }
//
//   async getTransferSuccessMessage(): Promise<string> {
//     return this.page.locator(Locators.transferSuccessMessage).innerText();
//   }
//
//   async openDashboard(): Promise<void> {
//     await this.page.locator(Locators.dashboardNavItem).click();
//   }
//
//   async openHistory(): Promise<void> {
//     await this.page.locator(Locators.historyNavItem).click();
//   }
//
//   async selectExpenseFilter(): Promise<void> {
//     await this.page.locator(Locators.expenseFilter).click();
//   }
//
//   async searchHistory(searchTerm: string): Promise<void> {
//     await this.page.locator(Locators.historySearchInput).fill(searchTerm);
//   }
//
//   async getTransferHistoryRowText(): Promise<string> {
//     return this.page.locator(Locators.transferHistoryRow).innerText();
//   }
// }
//
// --- Active repaired version ---
import { Page } from '@playwright/test';
import { FundstransferPageLocators as Locators } from '../../../Locators/LocalHost/FundsTransfer/FundsTransfer-Locators';

export class FundstransferPage {
  constructor(private readonly page: Page) {}

  async openLoginPage(): Promise<void> {
    await this.page.goto('https://vb-bank-demo.vercel.app/');
  }

  async enterCredentials(username: string, password: string): Promise<void> {
    await this.page.locator(Locators.usernameInput).fill(username);
    await this.page.locator(Locators.passwordInput).fill(password);
  }

  async submitLogin(): Promise<void> {
    await this.page.locator(Locators.loginSubmitButton).click();
  }

  async getLoginErrorMessage(): Promise<string> {
    return this.page.locator(Locators.loginErrorMessage).innerText();
  }

  async getAccountBalance(): Promise<string> {
    return this.page.locator(Locators.accountBalance).innerText();
  }

  async openTransferScreen(): Promise<void> {
    const transferNavItem = this.page.locator(Locators.transferNavItem);
    await transferNavItem.waitFor({ state: 'visible' });
    await transferNavItem.click();
  }

  async enterRecipientAccountNumber(accountNumber: string): Promise<void> {
    const recipientAccountNumberInput = this.page.locator(Locators.recipientAccountNumberInput);
    await recipientAccountNumberInput.waitFor({ state: 'visible' });
    await recipientAccountNumberInput.fill(accountNumber);
  }

  async enterTransferAmount(amount: string): Promise<void> {
    await this.page.locator(Locators.transferAmountInput).fill(amount);
  }

  async enterTransferDescription(description: string): Promise<void> {
    await this.page.locator(Locators.transferDescriptionInput).fill(description);
  }

  async enterTransferDetails(accountNumber: string, amount: string, description: string): Promise<void> {
    await this.enterRecipientAccountNumber(accountNumber);
    await this.enterTransferAmount(amount);
    await this.enterTransferDescription(description);
  }

  async getRecipientAccountNumber(): Promise<string> {
    return this.page.locator(Locators.recipientAccountNumberInput).inputValue();
  }

  async getTransferAmount(): Promise<string> {
    return this.page.locator(Locators.transferAmountInput).inputValue();
  }

  async getTransferDescription(): Promise<string> {
    return this.page.locator(Locators.transferDescriptionInput).inputValue();
  }

  async isRecipientAccountNumberVisible(): Promise<boolean> {
    return this.page.locator(Locators.recipientAccountNumberInput).isVisible();
  }

  async isTransferAmountVisible(): Promise<boolean> {
    return this.page.locator(Locators.transferAmountInput).isVisible();
  }

  async isTransferDescriptionVisible(): Promise<boolean> {
    return this.page.locator(Locators.transferDescriptionInput).isVisible();
  }

  async isTransferButtonVisible(): Promise<boolean> {
    return this.page.getByRole('button', { name: Locators.transferSubmitButton }).isVisible();
  }

  async isTransferButtonEnabled(): Promise<boolean> {
    return this.page.getByRole('button', { name: Locators.transferSubmitButton }).isEnabled();
  }

  async submitTransfer(): Promise<void> {
    await this.page.getByRole('button', { name: Locators.transferSubmitButton }).click();
  }

  async getTransferSuccessMessage(): Promise<string> {
    return this.page.locator(Locators.transferSuccessMessage).innerText();
  }

  async openDashboard(): Promise<void> {
    await this.page.locator(Locators.dashboardNavItem).click();
  }

  async openHistory(): Promise<void> {
    await this.page.locator(Locators.historyNavItem).click();
  }

  async selectExpenseFilter(): Promise<void> {
    await this.page.locator(Locators.expenseFilter).click();
  }

  async searchHistory(searchTerm: string): Promise<void> {
    await this.page.locator(Locators.historySearchInput).fill(searchTerm);
  }

  async getTransferHistoryRowText(): Promise<string> {
    return this.page.locator(Locators.transferHistoryRow).innerText();
  }
}
