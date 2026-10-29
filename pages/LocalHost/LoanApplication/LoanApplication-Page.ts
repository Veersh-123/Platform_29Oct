// --- Previous version preserved by Dry Run repair ---
// import { Page } from '@playwright/test';
// import { LoanapplicationPageLocators as Locators } from '../../../Locators/LocalHost/LoanApplication/LoanApplication-Locators';
//
// export class LoanapplicationPage {
//   private page: Page;
//
//   constructor(page: Page) {
//     this.page = page;
//   }
//
//   async openPersonalLoansPage(): Promise<void> {
//     await this.page.goto('https://www.umb.com/personal-banking/loans/personal-loans');
//   }
//
//   async openApplicationInNewTab(): Promise<void> {
//     const applyNowLink = this.page.locator(Locators.applyNowLink).first();
//     await applyNowLink.scrollIntoViewIfNeeded();
//     const applicationPage = await Promise.all([
//       this.page.waitForEvent('popup'),
//       applyNowLink.click(),
//     ]).then(([popup]) => popup);
//     await applicationPage.waitForLoadState('domcontentloaded');
//     this.page = applicationPage;
//   }
//
//   async startNewApplication(): Promise<void> {
//     await this.page.locator(Locators.startNewApplicationButton).click();
//   }
//
//   async openElectronicDisclosure(): Promise<void> {
//     const button = this.page.locator(Locators.electronicDisclosureButton);
//     await button.scrollIntoViewIfNeeded();
//     await button.click();
//   }
//
//   async acceptElectronicDisclosure(): Promise<void> {
//     const dialog = this.page.locator(Locators.disclosureDialog);
//     await dialog.click();
//     await dialog.evaluate((element) => {
//       const scrollableElements = [element, ...Array.from(element.querySelectorAll<HTMLElement>('*'))];
//       for (const scrollable of scrollableElements) {
//         if (scrollable.scrollHeight > scrollable.clientHeight) {
//           scrollable.scrollTop = scrollable.scrollHeight;
//         }
//       }
//     });
//     await this.page.locator(Locators.agreeButton).click();
//   }
//
//   async proceedToApplicantDetails(): Promise<void> {
//     await this.clickNextAndWaitFor(Locators.firstName);
//   }
//
//   async enterApplicantIdentity(details: {
//     hasExistingAccount: 'No';
//     firstName: string;
//     lastName: string;
//     suffix: string;
//     dateOfBirth: string;
//     socialSecurityNumber: string;
//     zipCode: string;
//     branch: string;
//   }): Promise<void> {
//     await this.page.locator(Locators.existingAccountNoOption).click();
//     await this.fillField(Locators.firstName, details.firstName);
//     await this.fillField(Locators.lastName, details.lastName);
//     await this.selectField(Locators.suffix, details.suffix);
//     await this.fillField(Locators.dateOfBirth, details.dateOfBirth);
//     await this.fillField(Locators.socialSecurityNumber, details.socialSecurityNumber);
//     await this.fillField(Locators.zipCode, details.zipCode);
//     await this.selectField(Locators.branch, details.branch);
//     await this.clickNextAndWaitFor(Locators.usCitizenQuestion);
//   }
//
//   async enterIdentificationDetails(details: {
//     citizenship: string;
//     issueState: string;
//     licenseNumber: string;
//     maritalStatus: string;
//   }): Promise<void> {
//     await this.chooseQuestionOption(Locators.usCitizenQuestion, details.citizenship);
//     await this.selectField(Locators.photoId, "U.S Driver's License");
//     await this.selectField(Locators.issueState, details.issueState);
//     await this.fillField(Locators.licenseNumber, details.licenseNumber);
//     await this.fillField(Locators.issueDate, '08/20/2024');
//     await this.fillField(Locators.expirationDate, '08/19/2028');
//     await this.selectField(Locators.maritalStatus, details.maritalStatus);
//     await this.clickNextAndWaitFor(Locators.physicalAddress1);
//   }
//
//   async enterPhysicalAddress(details: {
//     physicalAddress1: string;
//     zipCode: string;
//     city: string;
//     state: string;
//     housingStatus: string;
//     mortgageRentPayment: string;
//     mailingAddressSameAsPhysical: string;
//   }): Promise<void> {
//     await this.fillField(Locators.physicalAddress1, details.physicalAddress1);
//     await this.fillField(Locators.zipCode, details.zipCode);
//     await this.fillField(Locators.city, details.city);
//     await this.selectField(Locators.state, details.state);
//     await this.selectField(Locators.housingStatus, details.housingStatus);
//     await this.fillField(Locators.mortgageRentPayment, details.mortgageRentPayment);
//     await this.fillField(Locators.yearsAtPhysicalAddress, '10');
//     await this.fillField(Locators.monthsAtPhysicalAddress, '5');
//     await this.chooseQuestionOption(
//       Locators.mailingAddressSameAsPhysical,
//       details.mailingAddressSameAsPhysical,
//     );
//     await this.clickNextAndWaitFor(Locators.homePhone);
//   }
//
//   async enterContactDetails(details: {
//     homePhone: string;
//     emailAddress: string;
//     confirmEmailAddress: string;
//     preferredContactMethod: string;
//     bestTimeToContact: string;
//   }): Promise<void> {
//     await this.fillField(Locators.homePhone, details.homePhone);
//     await this.fillField(Locators.emailAddress, details.emailAddress);
//     await this.fillField(Locators.confirmEmailAddress, details.confirmEmailAddress);
//     await this.selectField(Locators.preferredContactMethod, details.preferredContactMethod);
//     await this.selectField(Locators.bestTimeToContact, details.bestTimeToContact);
//     await this.clickNextAndWaitFor(Locators.employmentStatus);
//   }
//
//   async enterEmploymentDetails(details: {
//     employmentStatus: string;
//     previousEmploymentStatus: string;
//   }): Promise<void> {
//     await this.selectField(Locators.employmentStatus, details.employmentStatus);
//     await this.selectField(Locators.previousEmploymentStatus, details.previousEmploymentStatus);
//     await this.page.locator(Locators.additionalHomeIncomeNoOption).click();
//     await this.clickNextAndWaitFor(Locators.jointApplicationQuestion);
//   }
//
//   async declineJointApplication(): Promise<void> {
//     await this.page.locator(Locators.jointApplicationNoOption).click();
//   }
//
//   async saveAndClose(): Promise<void> {
//     await this.page.locator(Locators.saveAndCloseButton).click();
//   }
//
//   private async clickNextAndWaitFor(selector: string): Promise<void> {
//     await this.page.locator(Locators.nextButton).click();
//     await this.page.locator(selector).waitFor({ state: 'visible' });
//   }
//
//   private async fillField(selector: string, value: string): Promise<void> {
//     const control = await this.getControl(selector);
//     await control.fill(value);
//   }
//
//   private async selectField(selector: string, value: string): Promise<void> {
//     const control = await this.getControl(selector);
//     const tagName = await control.evaluate((element) => element.tagName.toLowerCase());
//     if (tagName === 'select') {
//       await control.selectOption({ label: value });
//       return;
//     }
//     await control.fill(value);
//   }
//
//   private async chooseQuestionOption(selector: string, value: string): Promise<void> {
//     const question = this.page.locator(selector);
//     const group = question.locator('..');
//     await group.getByRole('radio', { name: value, exact: true }).click();
//   }
//
//   private async getControl(selector: string): Promise<ReturnType<Page['locator']>> {
//     const field = this.page.locator(selector);
//     const tagName = await field.evaluate((element) => element.tagName.toLowerCase());
//     if (tagName !== 'label') {
//       return field;
//     }
//
//     const id = await field.getAttribute('for');
//     if (id) {
//       return this.page.locator(`[id="${id.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"]`);
//     }
//
//     const nestedControl = field.locator('input, select, textarea').first();
//     if (await nestedControl.count()) {
//       return nestedControl;
//     }
//     throw new Error(`No form control found for locator: ${selector}`);
//   }
// }
// --- Active repaired version ---
import { Page } from '@playwright/test';
import { LoanapplicationPageLocators as Locators } from '../../../Locators/LocalHost/LoanApplication/LoanApplication-Locators';

export class LoanapplicationPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async openPersonalLoansPage(): Promise<void> {
    await this.page.goto('https://www.umb.com/personal-banking/loans/personal-loans');
  }

  async openApplicationInNewTab(): Promise<void> {
    const applyNowLink = this.page.locator(Locators.applyNowLink).first();
    await applyNowLink.scrollIntoViewIfNeeded();
    const applicationPage = await Promise.all([
      this.page.waitForEvent('popup'),
      applyNowLink.click(),
    ]).then(([popup]) => popup);
    await applicationPage.waitForLoadState('domcontentloaded');
    this.page = applicationPage;
  }

  async startNewApplication(): Promise<void> {
    await this.page.locator(Locators.startNewApplicationButton).click();
  }

  async openElectronicDisclosure(): Promise<void> {
    const button = this.page.locator(Locators.electronicDisclosureButton);
    await button.waitFor({ state: 'visible' });
    await button.scrollIntoViewIfNeeded();
    await button.click();
  }

  async acceptElectronicDisclosure(): Promise<void> {
    const dialog = this.page.locator(Locators.disclosureDialog);
    await dialog.click();
    await dialog.evaluate((element) => {
      const scrollableElements = [element, ...Array.from(element.querySelectorAll<HTMLElement>('*'))];
      for (const scrollable of scrollableElements) {
        if (scrollable.scrollHeight > scrollable.clientHeight) {
          scrollable.scrollTop = scrollable.scrollHeight;
        }
      }
    });
    await this.page.locator(Locators.agreeButton).click();
  }

  async proceedToApplicantDetails(): Promise<void> {
    await this.clickNextAndWaitFor(Locators.firstName);
  }

  async enterApplicantIdentity(details: {
    hasExistingAccount: 'No';
    firstName: string;
    lastName: string;
    suffix: string;
    dateOfBirth: string;
    socialSecurityNumber: string;
    zipCode: string;
    branch: string;
  }): Promise<void> {
    await this.page.locator(Locators.existingAccountNoOption).click();
    await this.fillField(Locators.firstName, details.firstName);
    await this.fillField(Locators.lastName, details.lastName);
    await this.selectField(Locators.suffix, details.suffix);
    await this.fillField(Locators.dateOfBirth, details.dateOfBirth);
    await this.fillField(Locators.socialSecurityNumber, details.socialSecurityNumber);
    await this.fillField(Locators.zipCode, details.zipCode);
    await this.selectField(Locators.branch, details.branch);
    await this.clickNextAndWaitFor(Locators.usCitizenQuestion);
  }

  async enterIdentificationDetails(details: {
    citizenship: string;
    issueState: string;
    licenseNumber: string;
    maritalStatus: string;
  }): Promise<void> {
    await this.chooseQuestionOption(Locators.usCitizenQuestion, details.citizenship);
    await this.selectField(Locators.photoId, "U.S Driver's License");
    await this.selectField(Locators.issueState, details.issueState);
    await this.fillField(Locators.licenseNumber, details.licenseNumber);
    await this.fillField(Locators.issueDate, '08/20/2024');
    await this.fillField(Locators.expirationDate, '08/19/2028');
    await this.selectField(Locators.maritalStatus, details.maritalStatus);
    await this.clickNextAndWaitFor(Locators.physicalAddress1);
  }

  async enterPhysicalAddress(details: {
    physicalAddress1: string;
    zipCode: string;
    city: string;
    state: string;
    housingStatus: string;
    mortgageRentPayment: string;
    mailingAddressSameAsPhysical: string;
  }): Promise<void> {
    await this.fillField(Locators.physicalAddress1, details.physicalAddress1);
    await this.fillField(Locators.zipCode, details.zipCode);
    await this.fillField(Locators.city, details.city);
    await this.selectField(Locators.state, details.state);
    await this.selectField(Locators.housingStatus, details.housingStatus);
    await this.fillField(Locators.mortgageRentPayment, details.mortgageRentPayment);
    await this.fillField(Locators.yearsAtPhysicalAddress, '10');
    await this.fillField(Locators.monthsAtPhysicalAddress, '5');
    await this.chooseQuestionOption(
      Locators.mailingAddressSameAsPhysical,
      details.mailingAddressSameAsPhysical,
    );
    await this.clickNextAndWaitFor(Locators.homePhone);
  }

  async enterContactDetails(details: {
    homePhone: string;
    emailAddress: string;
    confirmEmailAddress: string;
    preferredContactMethod: string;
    bestTimeToContact: string;
  }): Promise<void> {
    await this.fillField(Locators.homePhone, details.homePhone);
    await this.fillField(Locators.emailAddress, details.emailAddress);
    await this.fillField(Locators.confirmEmailAddress, details.confirmEmailAddress);
    await this.selectField(Locators.preferredContactMethod, details.preferredContactMethod);
    await this.selectField(Locators.bestTimeToContact, details.bestTimeToContact);
    await this.clickNextAndWaitFor(Locators.employmentStatus);
  }

  async enterEmploymentDetails(details: {
    employmentStatus: string;
    previousEmploymentStatus: string;
  }): Promise<void> {
    await this.selectField(Locators.employmentStatus, details.employmentStatus);
    await this.selectField(Locators.previousEmploymentStatus, details.previousEmploymentStatus);
    await this.page.locator(Locators.additionalHomeIncomeNoOption).click();
    await this.clickNextAndWaitFor(Locators.jointApplicationQuestion);
  }

  async declineJointApplication(): Promise<void> {
    await this.page.locator(Locators.jointApplicationNoOption).click();
  }

  async saveAndClose(): Promise<void> {
    await this.page.locator(Locators.saveAndCloseButton).click();
  }

  private async clickNextAndWaitFor(selector: string): Promise<void> {
    await this.page.locator(Locators.nextButton).click();
    await this.page.locator(selector).waitFor({ state: 'visible' });
  }

  private async fillField(selector: string, value: string): Promise<void> {
    const control = await this.getControl(selector);
    await control.fill(value);
  }

  private async selectField(selector: string, value: string): Promise<void> {
    const control = await this.getControl(selector);
    const tagName = await control.evaluate((element) => element.tagName.toLowerCase());
    if (tagName === 'select') {
      await control.selectOption({ label: value });
      return;
    }
    await control.fill(value);
  }

  private async chooseQuestionOption(selector: string, value: string): Promise<void> {
    const question = this.page.locator(selector);
    const group = question.locator('..');
    await group.getByRole('radio', { name: value, exact: true }).click();
  }

  private async getControl(selector: string): Promise<ReturnType<Page['locator']>> {
    const field = this.page.locator(selector);
    const tagName = await field.evaluate((element) => element.tagName.toLowerCase());
    if (tagName !== 'label') {
      return field;
    }

    const id = await field.getAttribute('for');
    if (id) {
      return this.page.locator(`[id="${id.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"]`);
    }

    const nestedControl = field.locator('input, select, textarea').first();
    if (await nestedControl.count()) {
      return nestedControl;
    }
    throw new Error(`No form control found for locator: ${selector}`);
  }
}