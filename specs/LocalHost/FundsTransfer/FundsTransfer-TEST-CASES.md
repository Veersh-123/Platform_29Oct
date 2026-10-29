# Test Cases for Story FundsTransfer: FundsTransfer

**Story ID**: FundsTransfer  
**Story Title**: FundsTransfer  
**Story Type**: Feature  
**Test Case Creation Date**: October 25, 2026  
**Framework**: Playwright POM (Pure Page Object Model)

---

## Story Summary

FundsTransfer

### Acceptance Criteria

- Refer to the story description for acceptance criteria.

---

## Test Coverage Matrix

| Test Type | Count | Priority | Purpose |
|-----------|-------|----------|---------|
| Happy Path | 2 | Critical | Complete user workflow |
| Negative | 1 | High | Error and validation conditions |
| Edge Cases | 0 | Medium | Boundary conditions |
| **Total** | **3** | - | Comprehensive coverage |

---

## Test Cases

### Category: Happy Path (Positive Flow)

---

#### Test Case: FundsTransfer-TC_P01

**Title**: Transfer USD 250 and verify the updated balance and completed history entry
**Type**: Positive / Critical
**Priority**: Critical
**Automation Priority**: P0
**Component**: Login, Account Dashboard, Transfer Money, Transaction History

**Preconditions**:
- The application at https://vb-bank-demo.vercel.app/ is available.
- The account holder can log in with the credentials specified in testData.
- The account has sufficient funds for a USD 250 transfer.
- No transfer from this test is already recorded; record the dashboard balance before starting.

**Test Steps**:

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open the application and log in with username john.doe and password user123. | Login succeeds and the account dashboard is displayed. |
| 2 | Record the dashboard balance before the transfer. | The current account balance is displayed and its value is recorded as the baseline. |
| 3 | Click the left-menu Transfer option. | The Transfer Money screen is displayed. |
| 4 | Enter recipient account number 3456789012, amount 250 USD, and description Towards trip to Orlando. | The specified recipient, amount, and description are present in their respective fields. |
| 5 | Click the transfer button and wait for the transfer to complete. | The transfer completes successfully. |
| 6 | Return to the account dashboard and record the displayed balance. | The displayed balance is lower than the recorded baseline by exactly USD 250. |
| 7 | Click the left-menu History option, select the Expense filter, and search for Orlando. | The history results are filtered to expenses matching Orlando. |
| 8 | Inspect the matching transaction row. | A row for the recent transfer shows $250 and status completed. |

**Expected Results**:
- Login with the specified credentials lands on the account dashboard.
- The dashboard displays the pre-transfer account balance.
- The Transfer option opens the Transfer Money screen.
- Submitting the specified transfer completes it.
- The post-transfer dashboard balance equals the recorded pre-transfer balance minus USD 250.
- History filtered to Expense and searched for Orlando shows the recent $250 transfer with status completed.

**Test Data**:
```json
{
  "url": "https://vb-bank-demo.vercel.app/",
  "username": "john.doe",
  "password": "user123",
  "recipientAccountNumber": "3456789012",
  "amountUsd": 250,
  "description": "Towards trip to Orlando",
  "historyFilter": "Expense",
  "historySearch": "Orlando",
  "expectedHistoryAmount": "$250",
  "expectedStatus": "completed"
}
```

**Assertions**:
- Login succeeds and the account dashboard is displayed.
- The dashboard displays a balance before the transfer.
- The Transfer option opens the Transfer Money screen.
- The transfer completes for recipient account 3456789012 with amount USD 250 and description Towards trip to Orlando.
- Post-transfer balance equals the recorded pre-transfer balance minus USD 250.
- With Expense selected and Orlando searched, a matching recent transaction row is displayed.
- The matching transaction row shows $250 and status completed.

**Screenshots on Failure**:
- Login result or dashboard after login
- Dashboard showing the recorded pre-transfer balance
- Transfer Money screen with entered transfer details
- Transfer completion result
- Dashboard showing the post-transfer balance
- History results with Expense selected and Orlando searched
---

#### Test Case: FundsTransfer-TC_P02

**Title**: Log in and confirm the dashboard displays the current balance
**Type**: Positive / High
**Priority**: High
**Automation Priority**: P1
**Component**: Login, Account Dashboard

**Preconditions**:
- The application at https://vb-bank-demo.vercel.app/ is available.
- The account holder is logged out.

**Test Steps**:

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open https://vb-bank-demo.vercel.app/. | The application login page is displayed. |
| 2 | Enter username john.doe and password user123, then submit the login form. | Login succeeds and the account dashboard is displayed. |
| 3 | Inspect the account dashboard. | The current account balance is visible. |

**Expected Results**:
- The specified credentials authenticate successfully.
- After login, the user lands on the account dashboard.
- The dashboard displays the current account balance.

**Test Data**:
```json
{
  "url": "https://vb-bank-demo.vercel.app/",
  "username": "john.doe",
  "password": "user123"
}
```

**Assertions**:
- The login succeeds with username john.doe and password user123.
- The landing page after login is the account dashboard.
- A current account balance is displayed on the dashboard.

**Screenshots on Failure**:
- Login page with submitted credentials obscured
- Page displayed after login
- Account dashboard balance area


### Category: Negative Flow

---

#### Test Case: FundsTransfer-TC_N01

**Title**: Prevent transfer submission when recipient account number is missing
**Type**: Negative / High
**Priority**: High
**Automation Priority**: P1
**Component**: Transfer Money

**Preconditions**:
- The account holder is logged in with username john.doe.
- Record the current dashboard balance before starting.

**Test Steps**:

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click the left-menu Transfer option. | The Transfer Money screen is displayed. |
| 2 | Leave the recipient account number empty and enter amount 250 USD and description Towards trip to Orlando. | The recipient field is empty and the other specified values are entered. |
| 3 | Click the transfer button. | The transfer is not completed because the recipient account number is missing. |
| 4 | Check whether the transfer completes and compare the account balance with the recorded baseline. | No transfer is recorded and the account balance is unchanged. |

**Expected Results**:
- A transfer cannot be completed without a recipient account number.
- The account balance remains equal to the recorded baseline.

**Test Data**:
```json
{
  "recipientAccountNumber": "",
  "amountUsd": 250,
  "description": "Towards trip to Orlando"
}
```

**Assertions**:
- No transfer completes when the recipient account number is empty.
- The account balance does not decrease by USD 250.

**Screenshots on Failure**:
- Transfer Money screen with the recipient account number empty
- Transfer submission result
- Dashboard balance after the attempted submission



---

## Summary Table

| TC ID | Title | Priority | Type | Status |
|-------|-------|----------|------|--------|
| FundsTransfer-TC_P01 | Transfer USD 250 and verify the updated balance and completed history entry | Critical | Positive | Pending |
| FundsTransfer-TC_P02 | Log in and confirm the dashboard displays the current balance | High | Positive | Pending |
| FundsTransfer-TC_N01 | Prevent transfer submission when recipient account number is missing | High | Negative | Pending |

---

## Test Execution Summary

**Total Test Cases**: 3
- Happy Path: 2 (Critical)
- Negative: 1 (High)
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
