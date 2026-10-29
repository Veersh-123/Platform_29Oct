import { test, expect } from '@playwright/test';
import { LoanapplicationPage } from '../../../pages/LocalHost/LoanApplication/LoanApplication-Page';
import testData from '../../../Test_Data/LocalHost/LoanApplication/LoanApplication-test-data.json';

const completeApplicationData = testData.testCases.find(
  (testCase) => testCase.testCaseId === 'LoanApplication-TC_P01',
)!.data;
const disclosureApplicationData = testData.testCases.find(
  (testCase) => testCase.testCaseId === 'LoanApplication-TC_P02',
)!.data;

test('LoanApplication-TC_P01 | Complete a new personal loan application and save and close', async ({ page }) => {
  const pageObject = new LoanapplicationPage(page);
  let applicationTab: import('@playwright/test').Page;

  await test.step('LoanApplication-TC_P01 | Step 1: Open the personal loans URL.', async () => {
    await pageObject.openPersonalLoansPage();
    await expect(page).toHaveURL(completeApplicationData.url);
  });

  await test.step('LoanApplication-TC_P01 | Step 2: Scroll to Apply Now and click it.', async () => {
    const applicationTabPromise = page.waitForEvent('popup');
    await pageObject.openApplicationInNewTab();
    applicationTab = await applicationTabPromise;
  });

  await test.step('LoanApplication-TC_P01 | Step 3: Activate the newly opened tab.', async () => {
    expect(applicationTab.isClosed()).toBe(false);
  });

  await test.step('LoanApplication-TC_P01 | Step 4: Click I\'d like to start a new application.', async () => {
    await pageObject.startNewApplication();
  });

  await test.step('LoanApplication-TC_P01 | Step 5: Click Electronic Disclosure and Content.', async () => {
    await pageObject.openElectronicDisclosure();
  });

  await test.step('LoanApplication-TC_P01 | Step 6: Scroll the disclosure pop-up to its end and click I Agree.', async () => {
    await pageObject.acceptElectronicDisclosure();
  });

  await test.step('LoanApplication-TC_P01 | Step 7: Click Next.', async () => {
    await pageObject.proceedToApplicantDetails();
  });

  await test.step('LoanApplication-TC_P01 | Step 8: Enter account and identity details, then click Next.', async () => {
    await pageObject.enterApplicantIdentity({
      hasExistingAccount: 'No',
      firstName: completeApplicationData.firstName,
      lastName: completeApplicationData.lastName,
      suffix: completeApplicationData.suffix,
      dateOfBirth: completeApplicationData.dateOfBirth,
      socialSecurityNumber: completeApplicationData.socialSecurityNumber,
      zipCode: completeApplicationData.applicantZipCode,
      branch: completeApplicationData.branch,
    });
  });

  await test.step('LoanApplication-TC_P01 | Step 9: Enter citizenship and identification details, then click Next.', async () => {
    await pageObject.enterIdentificationDetails({
      citizenship: completeApplicationData.usCitizen,
      issueState: completeApplicationData.issueState,
      licenseNumber: completeApplicationData.licenseNumber,
      maritalStatus: completeApplicationData.maritalStatus,
    });
  });

  await test.step('LoanApplication-TC_P01 | Step 10: Enter physical address and housing details, then click Next.', async () => {
    await pageObject.enterPhysicalAddress({
      physicalAddress1: completeApplicationData.physicalAddress1,
      zipCode: completeApplicationData.physicalZipCode,
      city: completeApplicationData.city,
      state: completeApplicationData.state,
      housingStatus: completeApplicationData.housingStatus,
      mortgageRentPayment: completeApplicationData.mortgageRentPayment,
      mailingAddressSameAsPhysical: completeApplicationData.mailingAddressSameAsPhysical,
    });
  });

  await test.step('LoanApplication-TC_P01 | Step 11: Enter phone, matching email addresses, contact method, and contact time, then click Next.', async () => {
    await pageObject.enterContactDetails({
      homePhone: completeApplicationData.homePhone,
      emailAddress: completeApplicationData.emailAddress,
      confirmEmailAddress: completeApplicationData.confirmEmailAddress,
      preferredContactMethod: completeApplicationData.preferredContactMethod,
      bestTimeToContact: completeApplicationData.bestTimeToContact,
    });
  });

  await test.step('LoanApplication-TC_P01 | Step 12: Enter employment details, select No for additional home income, then click Next.', async () => {
    await pageObject.enterEmploymentDetails({
      employmentStatus: completeApplicationData.employmentStatus,
      previousEmploymentStatus: completeApplicationData.previousEmploymentStatus,
    });
  });

  await test.step('LoanApplication-TC_P01 | Step 13: Select No for a joint application.', async () => {
    await pageObject.declineJointApplication();
  });

  await test.step('LoanApplication-TC_P01 | Step 14: Click Save and close.', async () => {
    await pageObject.saveAndClose();
    await expect.poll(() => applicationTab.isClosed()).toBe(true);
  });
});

test('LoanApplication-TC_P02 | Accept the electronic disclosure and proceed to applicant details', async ({ page }) => {
  const pageObject = new LoanapplicationPage(page);
  let applicationTab: import('@playwright/test').Page;

  await test.step('LoanApplication-TC_P02 | Step 1: Open the personal loans URL.', async () => {
    await pageObject.openPersonalLoansPage();
    await expect(page).toHaveURL(disclosureApplicationData.url);
  });

  await test.step('LoanApplication-TC_P02 | Step 2: Click Apply Now.', async () => {
    const applicationTabPromise = page.waitForEvent('popup');
    await pageObject.openApplicationInNewTab();
    applicationTab = await applicationTabPromise;
    expect(applicationTab.isClosed()).toBe(false);
  });

  await test.step('LoanApplication-TC_P02 | Step 3: Activate the new tab and start a new application.', async () => {
    await pageObject.startNewApplication();
  });

  await test.step('LoanApplication-TC_P02 | Step 4: Click Electronic Disclosure and Content.', async () => {
    await pageObject.openElectronicDisclosure();
  });

  await test.step('LoanApplication-TC_P02 | Step 5: Click inside the pop-up and scroll to the end.', async () => {
    await pageObject.acceptElectronicDisclosure();
  });

  await test.step('LoanApplication-TC_P02 | Step 6: Click I Agree and then Next.', async () => {
    await pageObject.proceedToApplicantDetails();
  });

  await test.step('LoanApplication-TC_P02 | Step 7: Enter the specified applicant values and click Next.', async () => {
    await pageObject.enterApplicantIdentity({
      hasExistingAccount: 'No',
      firstName: disclosureApplicationData.firstName,
      lastName: disclosureApplicationData.lastName,
      suffix: disclosureApplicationData.suffix,
      dateOfBirth: disclosureApplicationData.dateOfBirth,
      socialSecurityNumber: disclosureApplicationData.socialSecurityNumber,
      zipCode: disclosureApplicationData.zipCode,
      branch: disclosureApplicationData.branch,
    });
  });
});