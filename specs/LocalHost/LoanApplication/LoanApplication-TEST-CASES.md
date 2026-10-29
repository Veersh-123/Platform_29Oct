# Test Cases for Story LoanApplication: LoanApplication

**Story ID**: LoanApplication  
**Story Title**: LoanApplication  
**Story Type**: Feature  
**Test Case Creation Date**: October 25, 2026  
**Framework**: Playwright POM (Pure Page Object Model)

---

## Story Summary

LoanApplication

### Acceptance Criteria

- Refer to the story description for acceptance criteria.

---

## Test Coverage Matrix

| Test Type | Count | Priority | Purpose |
|-----------|-------|----------|---------|
| Happy Path | 2 | Critical | Complete user workflow |
| Negative | 0 | High | Error and validation conditions |
| Edge Cases | 0 | Medium | Boundary conditions |
| **Total** | **2** | - | Comprehensive coverage |

---

## Test Cases

### Category: Happy Path (Positive Flow)

---

#### Test Case: LoanApplication-TC_P01

**Title**: Complete a new personal loan application and save and close
**Type**: Positive / Critical
**Priority**: Critical
**Automation Priority**: P0
**Component**: Personal Loans page and loan application

**Preconditions**:
- A browser is available with no loan application session already in progress.
- The user can access https://www.umb.com/personal-banking/loans/personal-loans.
- Use the applicant values specified in testData.

**Test Steps**:

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open the personal loans URL. | The personal loans page loads. |
| 2 | Scroll to Apply Now and click it. | The loan application opens in a new tab. |
| 3 | Activate the newly opened tab. | The new tab displays the loan application. |
| 4 | Click I'd like to start a new application. | The new application flow starts. |
| 5 | Click Electronic Disclosure and Content. | A disclosure pop-up opens. |
| 6 | Scroll the disclosure pop-up to its end and click I Agree. | The disclosure is accepted and the pop-up closes or advances as presented. |
| 7 | Click Next. | The first applicant information page is displayed. |
| 8 | Enter the account, identity, date of birth, Social Security Number, ZIP Code, and branch values, then click Next. | The entered values are retained and the next page is displayed. |
| 9 | Enter citizenship, photo ID, license, issue and expiration dates, and marital status, then click Next. | The entered values are retained and the next page is displayed. |
| 10 | Enter physical address, housing, payment, time-at-address, and same-mailing-address values, then click Next. | The entered values are retained and the next page is displayed. |
| 11 | Enter phone, matching email addresses, preferred contact method, and contact time, then click Next. | The entered values are retained and the next page is displayed. |
| 12 | Enter both employment statuses and select No for additional home income, then click Next. | The entered values are retained and the next page is displayed. |
| 13 | Select No for a joint application. | No joint applicant is selected. |
| 14 | Click Save and close. | The application is saved and the application flow closes. |

**Expected Results**:
- The application opens in a new tab and proceeds through each page after the specified values are entered and Next is clicked.
- The disclosure can be scrolled to the end and accepted.
- The final joint application choice is No, and Save and close saves the application and closes the flow.

**Test Data**:
```json
{
  "url": "https://www.umb.com/personal-banking/loans/personal-loans",
  "accountHolder": "No",
  "firstName": "Mak",
  "lastName": "Tyson",
  "suffix": "I",
  "dateOfBirth": "02/16/1990",
  "socialSecurityNumber": "1234567012",
  "applicantZipCode": "64106",
  "branch": "Internet Application 1010",
  "usCitizen": "Yes",
  "photoId": "U.S Driver's License",
  "issueState": "Alaska",
  "licenseNumber": "1234567",
  "issueDate": "08/20/2024",
  "expirationDate": "08/19/2028",
  "maritalStatus": "Married",
  "physicalAddress1": "34 Banking Street",
  "physicalZipCode": "64106",
  "city": "Kansas City",
  "state": "Missouri",
  "housingStatus": "Buying Residence",
  "mortgageRentPayment": "2000",
  "yearsAtPhysicalAddress": "10",
  "monthsAtPhysicalAddress": "5",
  "mailingAddressSameAsPhysical": "Yes",
  "homePhone": "985-654-1236",
  "emailAddress": "makTyson@live.com",
  "confirmEmailAddress": "makTyson@live.com",
  "preferredContactMethod": "Email",
  "bestTimeToContact": "Afternoon",
  "employmentStatus": "Unemployed",
  "previousEmploymentStatus": "Unemployed",
  "additionalHomeIncome": "No",
  "jointApplication": "No"
}
```

**Assertions**:
- Apply Now opens the application in a new tab.
- The disclosure pop-up opens, can be scrolled to its end, and accepts I Agree.
- Each Next action after entering the supplied page values displays the next page.
- The final application choice is No for a joint application.
- Clicking Save and close saves the application and closes the application flow.

**Screenshots on Failure**:
- Personal loans page with Apply Now unavailable or not opening a new tab
- Disclosure pop-up before or after attempted agreement
- Each application page showing entered values or validation errors
- Final joint application page
- Application state immediately after Save and close
---

#### Test Case: LoanApplication-TC_P02

**Title**: Accept the electronic disclosure and proceed to applicant details
**Type**: Positive / High
**Priority**: High
**Automation Priority**: P1
**Component**: Loan application disclosure and applicant details

**Preconditions**:
- A browser is available with no loan application session already in progress.
- The user can access the personal loans URL.

**Test Steps**:

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open the personal loans URL. | The personal loans page loads. |
| 2 | Click Apply Now. | The loan application opens in a new tab. |
| 3 | Activate the new tab and start a new application. | The new application flow is displayed. |
| 4 | Click Electronic Disclosure and Content. | The disclosure pop-up opens. |
| 5 | Click inside the pop-up and scroll to the end. | The disclosure content is scrolled to its end. |
| 6 | Click I Agree and then Next. | The disclosure is accepted and the applicant details page is displayed. |
| 7 | Enter the specified applicant values and click Next. | The values are retained and the next application page is displayed. |

**Expected Results**:
- The application opens in a separate tab.
- The disclosure content can be scrolled to the end, I Agree can be selected, and Next displays the applicant details page.
- The supplied applicant values allow progression to the next application page.

**Test Data**:
```json
{
  "url": "https://www.umb.com/personal-banking/loans/personal-loans",
  "accountHolder": "No",
  "firstName": "Mak",
  "lastName": "Tyson",
  "suffix": "I",
  "dateOfBirth": "02/16/1990",
  "socialSecurityNumber": "1234567012",
  "zipCode": "64106",
  "branch": "Internet Application 1010"
}
```

**Assertions**:
- Apply Now opens a new tab containing the application.
- Electronic Disclosure and Content opens a pop-up.
- The disclosure can be scrolled to the end and I Agree can be selected.
- Next after agreement displays the applicant details page.
- Next after entering the supplied applicant data displays the following application page.

**Screenshots on Failure**:
- Browser tabs after clicking Apply Now
- Disclosure pop-up at its end
- Applicant details page with entered values or validation errors
- Page after clicking Next




---

## Summary Table

| TC ID | Title | Priority | Type | Status |
|-------|-------|----------|------|--------|
| LoanApplication-TC_P01 | Complete a new personal loan application and save and close | Critical | Positive | Pending |
| LoanApplication-TC_P02 | Accept the electronic disclosure and proceed to applicant details | High | Positive | Pending |

---

## Test Execution Summary

**Total Test Cases**: 2
- Happy Path: 2 (Critical)
- Negative: 0 (High)
- Edge Cases: 0 (Medium)

**Browser**: Chrome/Chromium  
**Execution Mode**: Headed (visible browser)  
**Workers**: 1 (sequential execution)

---

## Notes

1. Failed tests should capture screenshots at the listed failure states.
2. Test data is provided with each case in JSON format.
3. Test steps include an expected result for every action.
4. Generated scenarios should be reviewed against the target application's current behavior.
