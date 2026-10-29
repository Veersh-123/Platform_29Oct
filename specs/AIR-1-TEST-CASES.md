# Test Cases for Story AIR-1: Hotel Search

**Story ID**: AIR-1  
**Story Title**: Hotel Search  
**Story Type**: Feature  
**Test Case Creation Date**: October 28, 2026  
**Framework**: Playwright POM (Pure Page Object Model)

---

## Story Summary

Hotel Search

### Acceptance Criteria

- Refer to the story description for acceptance criteria.

---

## Test Coverage Matrix

| Test Type | Count | Priority | Purpose |
|-----------|-------|----------|---------|
| Happy Path | 3 | Critical | Complete user workflow |
| Negative | 0 | High | Error and validation conditions |
| Edge Cases | 0 | Medium | Boundary conditions |
| **Total** | **3** | - | Comprehensive coverage |

---

## Test Cases

### Category: Happy Path (Positive Flow)

---

#### Test Case: AIR-1-TC_P01

**Title**: Search Chennai for the specified dates and three adults
**Type**: Positive / Critical
**Priority**: Critical
**Automation Priority**: P0
**Component**: Airbnb home page search bar and search results

**Preconditions**:
- Open https://www.airbnb.co.in/ in a browser.
- The home page has finished loading and the destination search bar is visible.
- Start a fresh search with no destination, dates, or guests selected.

**Test Steps**:

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter Chennai, Tamil Nadu in the destination search bar and select the matching destination option if options are presented. | The destination field accepts the specified destination and shows Chennai, Tamil Nadu as the selected destination. |
| 2 | Set check-in to 01-12-2026. | The selected check-in date is 01-12-2026. |
| 3 | Set check-out to 04-12-2026. | The selected check-out date is 04-12-2026, later than the check-in date. |
| 4 | Open the add guests section and set adults to 3. | The guest options expand and the selected adult guest count is 3. |
| 5 | Submit the search and wait for the results page to finish loading. | Multiple search results are displayed for the submitted search. |
| 6 | Select the first search result and wait for its page to finish loading. | The selected result is relevant to Chennai, Tamil Nadu and reflects check-in 01-12-2026, check-out 04-12-2026, and 3 adults. |

**Expected Results**:
- The search bar is visible and functional.
- The submitted search uses destination Chennai, Tamil Nadu; check-in 01-12-2026; check-out 04-12-2026; and 3 adults.
- Multiple results are displayed.
- The first result is relevant to the selected destination and reflects the selected dates and exact guest count.

**Test Data**:
```json
{
  "url": "https://www.airbnb.co.in/",
  "destination": "Chennai, Tamil Nadu",
  "checkIn": "01-12-2026",
  "checkOut": "04-12-2026",
  "adults": 3
}
```

**Assertions**:
- The destination field displays Chennai, Tamil Nadu before search submission.
- The selected check-in date is 01-12-2026.
- The selected check-out date is 04-12-2026.
- The expanded guest section shows an adult count of exactly 3.
- The results page displays more than one search result.
- The first result is relevant to Chennai, Tamil Nadu and shows the submitted dates and 3 adults.

**Screenshots on Failure**:
- Home page with destination search bar
- Search form showing destination, dates, and guest count before submission
- Search results list
- Loaded first result showing destination, dates, and guest count
---

#### Test Case: AIR-1-TC_P02

**Title**: Complete the search with dates and guests before destination
**Type**: Positive / High
**Priority**: High
**Automation Priority**: P1
**Component**: Airbnb home page search bar and search results

**Preconditions**:
- Open https://www.airbnb.co.in/ in a browser.
- The home page has finished loading and the destination search bar is visible.
- Start a fresh search with no destination, dates, or guests selected.

**Test Steps**:

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Set check-in to 01-12-2026 and check-out to 04-12-2026. | The search form shows check-in 01-12-2026 and check-out 04-12-2026. |
| 2 | Open the add guests section and set adults to 3. | The guest options expand and the selected adult guest count is 3. |
| 3 | Enter Chennai, Tamil Nadu in the destination search bar and select the matching destination option if options are presented. | The destination field shows Chennai, Tamil Nadu as the selected destination. |
| 4 | Submit the search and wait for the results page to finish loading. | Multiple search results are displayed for the selected destination, dates, and guest count. |
| 5 | Select the first search result and wait for its page to finish loading. | The loaded result is relevant to Chennai, Tamil Nadu and reflects check-in 01-12-2026, check-out 04-12-2026, and 3 adults. |

**Expected Results**:
- The search accepts the destination, date range, and guest count regardless of the order in which the search criteria are entered.
- Multiple results are displayed.
- The first result is relevant to Chennai, Tamil Nadu and reflects the selected dates and exactly 3 adults.

**Test Data**:
```json
{
  "url": "https://www.airbnb.co.in/",
  "destination": "Chennai, Tamil Nadu",
  "checkIn": "01-12-2026",
  "checkOut": "04-12-2026",
  "adults": 3,
  "entryOrder": [
    "dates",
    "guests",
    "destination"
  ]
}
```

**Assertions**:
- The destination field shows Chennai, Tamil Nadu before submission.
- The selected check-in and check-out dates are 01-12-2026 and 04-12-2026.
- The guest section shows exactly 3 adults.
- The results page displays more than one search result.
- The first result is relevant to Chennai, Tamil Nadu and reflects the selected dates and 3 adults.

**Screenshots on Failure**:
- Search form after entering dates and guests
- Search form after entering the destination
- Search results list
- Loaded first result showing destination, dates, and guest count
---

#### Test Case: AIR-1-TC_P03

**Title**: Verify the guest options expand and retain three adults through search
**Type**: Positive / High
**Priority**: High
**Automation Priority**: P1
**Component**: Airbnb guest selector and search results

**Preconditions**:
- Open https://www.airbnb.co.in/ in a browser.
- The home page has finished loading and the destination search bar is visible.
- Start a fresh search with no destination, dates, or guests selected.

**Test Steps**:

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open the add guests section. | The guest section expands and presents guest options. |
| 2 | Inspect the expanded guest options and set adults to 3. | The selected adult guest count is exactly 3. |
| 3 | Enter Chennai, Tamil Nadu as the destination. | The destination field shows Chennai, Tamil Nadu as selected. |
| 4 | Set check-in to 01-12-2026 and check-out to 04-12-2026. | The selected dates are 01-12-2026 through 04-12-2026. |
| 5 | Submit the search and wait for the results page to finish loading. | Multiple results are displayed for the selected destination, dates, and guest count. |
| 6 | Select the first search result and wait for its page to finish loading. | The loaded result is relevant to Chennai, Tamil Nadu and reflects the selected dates and 3 adults. |

**Expected Results**:
- The add guests section expands and provides guest options.
- The selected count is exactly 3 adults and is retained for the search.
- Multiple results are displayed, and the first result reflects the selected destination, dates, and guest count.

**Test Data**:
```json
{
  "url": "https://www.airbnb.co.in/",
  "destination": "Chennai, Tamil Nadu",
  "checkIn": "01-12-2026",
  "checkOut": "04-12-2026",
  "adults": 3
}
```

**Assertions**:
- Activating add guests expands the guest section.
- The expanded section exposes options for selecting guests.
- The selected adult count is exactly 3 before search submission.
- The results page displays more than one search result.
- The first result is relevant to Chennai, Tamil Nadu and reflects 01-12-2026, 04-12-2026, and 3 adults.

**Screenshots on Failure**:
- Expanded guest options
- Search form showing the selected guest count and search criteria
- Search results list
- Loaded first result showing destination, dates, and guest count




---

## Summary Table

| TC ID | Title | Priority | Type | Status |
|-------|-------|----------|------|--------|
| AIR-1-TC_P01 | Search Chennai for the specified dates and three adults | Critical | Positive | Pending |
| AIR-1-TC_P02 | Complete the search with dates and guests before destination | High | Positive | Pending |
| AIR-1-TC_P03 | Verify the guest options expand and retain three adults through search | High | Positive | Pending |

---

## Test Execution Summary

**Total Test Cases**: 3
- Happy Path: 3 (Critical)
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
