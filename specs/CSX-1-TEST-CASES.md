# Test Cases for Story CSX-1: CSX_CarbonEstimator

**Story ID**: CSX-1  
**Story Title**: CSX_CarbonEstimator  
**Story Type**: Feature  
**Test Case Creation Date**: October 26, 2026  
**Framework**: Playwright POM (Pure Page Object Model)

---

## Story Summary

CSX_CarbonEstimator

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

#### Test Case: CSX-1-TC_P01

**Title**: Estimate emissions for Groceries from Birmingham to Boston at 2500 Tons
**Type**: Positive / Critical
**Priority**: Critical
**Automation Priority**: P0
**Component**: CSX Carbon Estimator page

**Preconditions**:
- A browser is available.
- The carbon estimator page is reachable at the story URL.
- No authentication is specified for this scenario.

**Test Steps**:

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to the story URL and wait for the estimator to load. | The carbon estimator page loads and its Goods, Start City, End City, and Freight Volume inputs are available. |
| 2 | In the Goods section, select Groceries. | Groceries is selected in the Goods section. |
| 3 | Select Birmingham as the Start City. | Birmingham is selected as the Start City. |
| 4 | Select Boston as the End City. | Boston is selected as the End City. |
| 5 | Select 2500 Tons as the Freight Volume. | 2500 Tons is selected as the Freight Volume. |
| 6 | Review the displayed carbon emission estimation. | An estimation is displayed, and its value is below 300 tons. |

**Expected Results**:
- The estimator accepts the specified Goods, Start City, End City, and Freight Volume selections.
- A carbon emission estimation is displayed for the completed selection.
- The displayed estimate is strictly less than 300 tons.

**Test Data**:
```json
{
  "url": "https://www.csx.com/index.cfm/about-us/sustainability/environment/carbon-estimator/",
  "goods": "Groceries",
  "startCity": "Birmingham",
  "endCity": "Boston",
  "freightVolume": "2500 Tons",
  "maximumEstimateExclusive": 300,
  "estimateUnit": "tons"
}
```

**Assertions**:
- The selected Goods value is Groceries.
- The selected Start City is Birmingham.
- The selected End City is Boston.
- The selected Freight Volume is 2500 Tons.
- A carbon emission estimation is visible after all specified inputs are selected.
- The displayed estimate, interpreted as a number of tons, is less than 300.

**Screenshots on Failure**:
- Carbon estimator page after initial load if the estimator or required inputs are unavailable.
- Completed input selections if the estimate is missing.
- Displayed estimate if it is 300 tons or greater.
---

#### Test Case: CSX-1-TC_P02

**Title**: Generate the specified estimate when selections are entered in a different order
**Type**: Positive / High
**Priority**: High
**Automation Priority**: P1
**Component**: CSX Carbon Estimator page

**Preconditions**:
- A browser is available.
- The carbon estimator page is reachable at the story URL.
- The estimator is loaded with no prior test selections.

**Test Steps**:

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to the story URL and wait for the estimator to load. | The carbon estimator page and its inputs are available. |
| 2 | Select Birmingham as the Start City. | Birmingham is selected as the Start City. |
| 3 | Select Boston as the End City. | Boston is selected as the End City. |
| 4 | In the Goods section, select Groceries. | Groceries is selected in the Goods section. |
| 5 | Select 2500 Tons as the Freight Volume. | 2500 Tons is selected as the Freight Volume. |
| 6 | Review the displayed carbon emission estimation. | An estimation is displayed and is below 300 tons. |

**Expected Results**:
- The estimator accepts the specified values when the route is selected before Goods.
- A carbon emission estimation is displayed for the completed selection.
- The displayed estimate is strictly less than 300 tons.

**Test Data**:
```json
{
  "url": "https://www.csx.com/index.cfm/about-us/sustainability/environment/carbon-estimator/",
  "goods": "Groceries",
  "startCity": "Birmingham",
  "endCity": "Boston",
  "freightVolume": "2500 Tons",
  "selectionOrder": [
    "Birmingham Start City",
    "Boston End City",
    "Groceries",
    "2500 Tons"
  ],
  "maximumEstimateExclusive": 300,
  "estimateUnit": "tons"
}
```

**Assertions**:
- Each specified value can be selected in the stated order.
- A carbon emission estimation is visible after all specified inputs are selected.
- The displayed estimate, interpreted as a number of tons, is less than 300.

**Screenshots on Failure**:
- Estimator with the completed selections if the estimate is missing.
- Displayed estimate if it is 300 tons or greater.


### Category: Negative Flow

---

#### Test Case: CSX-1-TC_N01

**Title**: Do not display a completed estimate when Goods is not selected
**Type**: Negative / High
**Priority**: High
**Automation Priority**: P1
**Component**: CSX Carbon Estimator page

**Preconditions**:
- A browser is available.
- The carbon estimator page is reachable at the story URL.
- The estimator is loaded with no prior test selections.

**Test Steps**:

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to the story URL and wait for the estimator to load. | The estimator and its inputs are available. |
| 2 | Leave the Goods selection unset. | No Goods value is selected. |
| 3 | Select Birmingham, Boston, and 2500 Tons for the remaining inputs. | The specified Start City, End City, and Freight Volume are selected; Goods remains unset. |
| 4 | Check whether a carbon emission estimation is displayed. | The estimator does not present a completed estimate for an incomplete selection; if it provides validation feedback, that feedback identifies the missing Goods selection. |

**Expected Results**:
- With Goods unset, the input set is incomplete.
- A completed carbon emission estimation is not displayed for this incomplete input set.
- If validation feedback is provided, it identifies the missing Goods selection without implying that an estimate was successfully calculated.

**Test Data**:
```json
{
  "url": "https://www.csx.com/index.cfm/about-us/sustainability/environment/carbon-estimator/",
  "goods": null,
  "startCity": "Birmingham",
  "endCity": "Boston",
  "freightVolume": "2500 Tons"
}
```

**Assertions**:
- Goods has no selected value.
- No completed carbon emission estimate is displayed while Goods is unset.
- Any displayed validation feedback identifies the missing Goods selection.

**Screenshots on Failure**:
- Incomplete input state with Goods unset if a completed estimate is displayed.
- Any validation feedback that does not identify the missing selection.



---

## Summary Table

| TC ID | Title | Priority | Type | Status |
|-------|-------|----------|------|--------|
| CSX-1-TC_P01 | Estimate emissions for Groceries from Birmingham to Boston at 2500 Tons | Critical | Positive | Pending |
| CSX-1-TC_P02 | Generate the specified estimate when selections are entered in a different order | High | Positive | Pending |
| CSX-1-TC_N01 | Do not display a completed estimate when Goods is not selected | High | Negative | Pending |

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
