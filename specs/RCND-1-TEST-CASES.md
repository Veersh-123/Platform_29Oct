# Test Cases for Story RCND-1: FlightSearch

**Story ID**: RCND-1  
**Story Title**: FlightSearch  
**Story Type**: Feature  
**Test Case Creation Date**: October 26, 2026  
**Framework**: Playwright POM (Pure Page Object Model)

---

## Story Summary

FlightSearch

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

#### Test Case: RCND-1-TC_P01

**Title**: Search YYZ to YHZ and verify first flight is On Time
**Type**: Positive / Critical
**Priority**: Critical
**Automation Priority**: P0
**Component**: Air Canada Flight Status — By Route search and flight details

**Preconditions**:
- Chrome is available and can access the internet.
- The Air Canada flight-status page is reachable.
- The date picker offers a selectable date displayed as Fri Oct 16; the story does not specify a year.

**Test Steps**:

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Launch Chrome and navigate to https://www.aircanada.com/home/ca/en/aco/flight-status. | The Air Canada flight-status page loads in Chrome. |
| 2 | Select the By Route radio button. | By Route is selected. |
| 3 | Enter YYZ in the From field, wait for the city suggestion to appear, and select the first option displayed. | The first displayed suggestion is selected for From and the field displays the selected city. |
| 4 | Wait 5 seconds. | Five seconds elapse before entering the destination. |
| 5 | Enter YHZ in the To field, wait for the city suggestion to appear, and select the first option displayed. | The first displayed suggestion is selected for To and the field displays the selected city. |
| 6 | Wait 5 seconds. | Five seconds elapse before continuing to the departure date. |
| 7 | Select the departure date displayed as Fri Oct 16. | The selected departure date is displayed as Fri Oct 16. |
| 8 | Click Search. | The search is submitted with the selected route and date. |
| 9 | Wait until flight results are displayed. | Flight results for the submitted search are displayed. |
| 10 | Open the first flight details displayed. | Details for the first displayed flight are opened. |
| 11 | Verify that the On Time text is displayed in the flight details. | On Time is visible in the first flight's details. |

**Expected Results**:
- The page loads at the specified URL and By Route is selected.
- The first displayed suggestions are selected for YYZ and YHZ, with a 5-second wait after each selection.
- Fri Oct 16 is selected as the departure date and the search returns flight results.
- The first displayed flight's details show On Time.

**Test Data**:
```json
{
  "url": "https://www.aircanada.com/home/ca/en/aco/flight-status",
  "searchMode": "By Route",
  "fromCode": "YYZ",
  "toCode": "YHZ",
  "departureDateLabel": "Fri Oct 16",
  "waitAfterOriginSelectionSeconds": 5,
  "waitAfterDestinationSelectionSeconds": 5,
  "flightDetailStatusText": "On Time"
}
```

**Assertions**:
- The browser URL is https://www.aircanada.com/home/ca/en/aco/flight-status.
- By Route is selected.
- The From field contains the first selected suggestion for YYZ.
- The To field contains the first selected suggestion for YHZ.
- A 5-second wait occurs after selecting the From suggestion and after selecting the To suggestion.
- The departure date is displayed as Fri Oct 16.
- Flight results are displayed after Search is clicked.
- The first displayed flight's details show On Time.

**Screenshots on Failure**:
- Flight-status page after navigation
- By Route search form after route and date selection
- Flight-results page
- First flight details showing the status area
---

#### Test Case: RCND-1-TC_P02

**Title**: Search the reverse route using the displayed airport suggestions
**Type**: Positive / Medium
**Priority**: Medium
**Automation Priority**: P1
**Component**: Air Canada Flight Status — By Route search

**Preconditions**:
- Chrome is available and can access the internet.
- The Air Canada flight-status page is reachable.
- The date picker offers a selectable date displayed as Fri Oct 16; the story does not specify a year.

**Test Steps**:

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Launch Chrome and navigate to https://www.aircanada.com/home/ca/en/aco/flight-status. | The Air Canada flight-status page loads in Chrome. |
| 2 | Select the By Route radio button. | By Route is selected. |
| 3 | Enter YHZ in the From field, wait for the city suggestion to appear, and select the first option displayed. | The first displayed suggestion is selected for From and the field displays the selected city. |
| 4 | Wait 5 seconds. | Five seconds elapse before entering the destination. |
| 5 | Enter YYZ in the To field, wait for the city suggestion to appear, and select the first option displayed. | The first displayed suggestion is selected for To and the field displays the selected city. |
| 6 | Wait 5 seconds. | Five seconds elapse before continuing to the departure date. |
| 7 | Select the departure date displayed as Fri Oct 16. | The selected departure date is displayed as Fri Oct 16. |
| 8 | Click Search. | The search is submitted with the selected reverse route and date. |
| 9 | Wait until flight results are displayed. | Flight results for the submitted reverse route are displayed. |

**Expected Results**:
- The first displayed suggestions for YHZ and YYZ are selected in the reverse route fields.
- The departure date is displayed as Fri Oct 16.
- Submitting the search displays flight results for the selected route.

**Test Data**:
```json
{
  "url": "https://www.aircanada.com/home/ca/en/aco/flight-status",
  "searchMode": "By Route",
  "fromCode": "YHZ",
  "toCode": "YYZ",
  "departureDateLabel": "Fri Oct 16",
  "waitAfterOriginSelectionSeconds": 5,
  "waitAfterDestinationSelectionSeconds": 5
}
```

**Assertions**:
- By Route is selected.
- The From field contains the first selected suggestion for YHZ.
- The To field contains the first selected suggestion for YYZ.
- A 5-second wait occurs after selecting each airport suggestion.
- The departure date is displayed as Fri Oct 16.
- Flight results are displayed after Search is clicked.

**Screenshots on Failure**:
- By Route form with the reverse route entered
- Flight-results page


### Category: Negative Flow

---

#### Test Case: RCND-1-TC_N01

**Title**: Prevent a route search when the From field is empty
**Type**: Negative / High
**Priority**: High
**Automation Priority**: P1
**Component**: Air Canada Flight Status — By Route required-field handling

**Preconditions**:
- Chrome is available and can access the internet.
- The Air Canada flight-status page is reachable.
- The date picker offers a selectable date displayed as Fri Oct 16; the story does not specify a year.

**Test Steps**:

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Launch Chrome and navigate to https://www.aircanada.com/home/ca/en/aco/flight-status. | The Air Canada flight-status page loads in Chrome. |
| 2 | Select the By Route radio button. | By Route is selected. |
| 3 | Leave the From field empty. | The From field remains blank. |
| 4 | Enter YHZ in the To field, wait for the city suggestion to appear, and select the first option displayed. | The first displayed suggestion is selected for To and the field displays the selected city. |
| 5 | Wait 5 seconds. | Five seconds elapse before continuing. |
| 6 | Select the departure date displayed as Fri Oct 16. | The selected departure date is displayed as Fri Oct 16. |
| 7 | Click Search. | The application does not return route results for a search with no From value and indicates that the required value is missing or invalid. |
| 8 | Check whether results are displayed or the missing From value is identified. | No flight results are displayed for the incomplete route, and the missing From value can be identified from the form state or validation. |

**Expected Results**:
- A search with an empty From field does not produce flight results.
- The form identifies the missing or invalid From value.

**Test Data**:
```json
{
  "url": "https://www.aircanada.com/home/ca/en/aco/flight-status",
  "searchMode": "By Route",
  "fromCode": "",
  "toCode": "YHZ",
  "departureDateLabel": "Fri Oct 16",
  "waitAfterDestinationSelectionSeconds": 5
}
```

**Assertions**:
- The From field is empty when Search is clicked.
- No flight results are displayed for the incomplete route.
- The missing or invalid From value is identifiable in the form state or validation.

**Screenshots on Failure**:
- By Route form with the empty From field after Search
- Any results or validation state displayed after Search



---

## Summary Table

| TC ID | Title | Priority | Type | Status |
|-------|-------|----------|------|--------|
| RCND-1-TC_P01 | Search YYZ to YHZ and verify first flight is On Time | Critical | Positive | Pending |
| RCND-1-TC_P02 | Search the reverse route using the displayed airport suggestions | Medium | Positive | Pending |
| RCND-1-TC_N01 | Prevent a route search when the From field is empty | High | Negative | Pending |

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
