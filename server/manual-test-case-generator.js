'use strict';

function extractSearchContext(text, summary) {
  const urls = text.match(/https?:\/\/[^\s)]+/gi) || [];
  const dates = [...new Set(text.match(/\d{1,2}[-/]\d{1,2}[-/]\d{4}/g) || [])];
  const locationMatch = text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
  const guestMatch = text.match(/\b(\d+)\s*(adults|guests|children|pets)\b/i);
  const isHotelSearch = /airbnb|hotel|destination|check-in|check-out|guest/i.test(`${summary}\n${text}`);

  return {
    appUrl: (urls[0] || (isHotelSearch ? 'https://www.airbnb.co.in/' : 'Application URL')).replace(/[),.;]+$/, ''),
    destination: locationMatch
      ? `${locationMatch[1]}, ${locationMatch[2]}`
      : (isHotelSearch ? 'Chennai, Tamil Nadu' : 'destination'),
    city: locationMatch?.[1] || (isHotelSearch ? 'Chennai' : 'destination'),
    checkInDate: dates[0] || '01-12-2026',
    checkOutDate: dates[1] || '04-12-2026',
    guestCount: Number(guestMatch?.[1] || 3),
    guestLabel: guestMatch?.[2] || 'adults',
  };
}

function createTestCase(issueKey, type, suffix, details, context) {
  const stepsWithResults = details.steps.map(([action, result]) => ({ action, result }));
  return {
    id: `${issueKey}-TC_${suffix}`,
    title: details.title,
    type,
    priority: details.priority,
    automationPriority: details.automationPriority,
    component: details.component,
    preconditions: details.preconditions(context),
    steps: stepsWithResults.map(step => step.action),
    stepsWithResults,
    expectedResult: details.expectedResults(context).join('\n'),
    testData: JSON.stringify(details.testData(context), null, 2),
    assertions: details.assertions,
    screenshotsOnFailure: details.screenshotsOnFailure,
  };
}

function nextCalendarDay(value) {
  const match = value.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (!match) return '02-12-2026';
  const [, day, month, year] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day) + 1));
  return [
    String(date.getUTCDate()).padStart(2, '0'),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    date.getUTCFullYear(),
  ].join('-');
}

function generateDetailedFallback(issueKey, summary, acceptanceCriteria = '') {
  const context = extractSearchContext(`${summary}\n${acceptanceCriteria}`, summary);
  const { appUrl, destination, city, checkInDate, checkOutDate, guestCount, guestLabel } = context;
  const guestDescription = `${guestCount} ${guestLabel}`;
  const commonData = { destination, checkInDate, checkOutDate };
  const commonPreconditions = () =>
    `Application is accessible at ${appUrl}\nBrowser is Chrome/Chromium\nNetwork connectivity is available`;
  const sharedAssertions = [
    'Page URL should change to search results page',
    'Results count should be greater than 0',
    `Results should match destination "${city}"`,
    `Date range should match ${checkInDate} to ${checkOutDate}`,
    `Guest count should match ${guestDescription}`,
  ];
  const sharedScreenshots = [
    'Application not loaded',
    'Search bar not visible',
    'Results not displayed',
    'Search criteria do not match the results',
  ];

  const positive = [
    createTestCase(issueKey, 'Positive', 'P01', {
      title: 'User performs complete search with all criteria',
      priority: 'Critical',
      automationPriority: 'P0',
      component: 'AirBnb Search Page',
      preconditions: ctx => `${commonPreconditions(ctx)}\nJavaScript is enabled`,
      steps: [
        [`Navigate to ${appUrl}`, 'Page loads successfully'],
        ['Verify destination search bar is visible', 'Search bar is displayed on the page'],
        ['Click on destination search bar', 'Search bar becomes active and focused'],
        [`Enter destination text "${destination}"`, 'Text appears in the search bar'],
        [`Select "${destination}" from the dropdown`, 'Destination is selected'],
        ['Click on the check-in date field', 'Date picker opens'],
        [`Select check-in date ${checkInDate}`, `Date ${checkInDate} is highlighted`],
        ['Click on the check-out date field', 'Check-out date picker opens'],
        [`Select check-out date ${checkOutDate}`, `Date ${checkOutDate} is highlighted`],
        ['Click on "Add Guests"', 'Guest selection panel expands'],
        [`Select ${guestDescription}`, `${guestDescription} are selected`],
        ['Click on "Search"', 'Search is initiated'],
        ['Wait for results to load', 'Multiple results are displayed'],
        ['Verify the first result contains the selected destination', `Result shows ${city} or a relevant property`],
        ['Verify the dates in the result match the selection', `Dates show ${checkInDate} to ${checkOutDate}`],
        ['Verify the guest count in the result matches', `Result shows ${guestDescription} or equivalent`],
      ],
      expectedResults: () => [
        'Application loads without errors',
        'Search bar is visible and functional',
        `Destination "${destination}" can be entered and selected`,
        'Date picker works correctly for check-in and check-out',
        `Guest selection shows ${guestDescription}`,
        'Search results populate with multiple options',
        'First result matches all search criteria',
      ],
      testData: () => ({ ...commonData, adultsCount: guestCount, childrenCount: 0, petsCount: 0 }),
      assertions: sharedAssertions,
      screenshotsOnFailure: sharedScreenshots,
    }, context),
    createTestCase(issueKey, 'Positive', 'P02', {
      title: 'User searches with valid destination and future dates',
      priority: 'Critical',
      automationPriority: 'P0',
      component: 'AirBnb Search Page',
      preconditions: ctx => `${commonPreconditions(ctx)}\nCurrent date is before ${checkInDate}\nProperties exist in ${city}`,
      steps: [
        [`Navigate to ${appUrl}`, 'Search form is displayed'],
        [`Enter valid destination "${city}"`, 'Autocomplete suggestions appear'],
        ['Select the first autocomplete suggestion', 'Destination is selected'],
        [`Enter check-in date ${checkInDate}`, 'Date is accepted'],
        [`Enter check-out date ${checkOutDate}`, 'Date is accepted and is after check-in'],
        [`Set guests to ${guestDescription}`, 'Guest count is updated'],
        ['Click Submit/Search', 'Search completes'],
        ['Wait for the results page to load', 'Results are visible'],
        ['Count visible properties', 'At least one property is displayed'],
      ],
      expectedResults: () => [
        'Search completes successfully',
        'Results page loads within an acceptable time',
        'Properties are displayed',
        `Properties match destination "${city}"`,
        'Result count is at least 1',
      ],
      testData: () => ({ ...commonData, guests: guestCount }),
      assertions: sharedAssertions,
      screenshotsOnFailure: sharedScreenshots,
    }, context),
    createTestCase(issueKey, 'Positive', 'P03', {
      title: 'User can modify search criteria and perform a new search',
      priority: 'High',
      automationPriority: 'P0',
      component: 'AirBnb Search Page',
      preconditions: () => 'User has completed an initial search\nSearch results page is displayed',
      steps: [
        ['Click the search bar to modify the destination', 'Current search criteria are displayed'],
        [`Clear the current destination "${destination}"`, 'Destination field is empty'],
        ['Enter new destination "Bangalore"', 'New destination is entered'],
        ['Update check-in date to 05-12-2026', 'New check-in date is selected'],
        ['Update check-out date to 08-12-2026', 'New check-out date is selected'],
        ['Click Search again', 'New search is initiated'],
        ['Wait for results to load', 'New results load'],
        ['Verify results are for Bangalore', 'Results show Bangalore properties'],
        ['Verify dates are updated in results', 'Results show 05-12-2026 to 08-12-2026'],
      ],
      expectedResults: () => [
        'Search criteria can be modified',
        'New search completes successfully',
        'Results update to show Bangalore properties',
        'Results reflect the new date range 05-12-2026 to 08-12-2026',
      ],
      testData: () => ({
        newDestination: 'Bangalore',
        newCheckIn: '05-12-2026',
        newCheckOut: '08-12-2026',
      }),
      assertions: [
        'Results count should be greater than 0',
        'First result should contain "Bangalore"',
        'Date range should match 05-12-2026 to 08-12-2026',
      ],
      screenshotsOnFailure: sharedScreenshots,
    }, context),
  ];

  const negative = [
    createTestCase(issueKey, 'Negative', 'N01', {
      title: 'User attempts search with an invalid destination',
      priority: 'High',
      automationPriority: 'P1',
      component: 'AirBnb Search Page',
      preconditions: ctx => `${commonPreconditions(ctx)}\nNo properties exist for the invalid destination`,
      steps: [
        [`Navigate to ${appUrl}`, 'Search form loads'],
        ['Enter invalid destination "XYZ12345InvalidPlace"', 'Text is entered'],
        ['Check the autocomplete dropdown', 'No matching destination appears'],
        [`Set dates to ${checkInDate} - ${checkOutDate}`, 'Dates are set'],
        [`Set guests to ${guestDescription}`, 'Guest count is set'],
        ['Click Search', 'Search is submitted'],
        ['Wait for the result', 'Error message or "No results" is displayed'],
      ],
      expectedResults: () => [
        'Application handles the invalid destination gracefully',
        'Error message or "No results" message is displayed',
        'Application does not crash',
        'No server errors appear in the console',
      ],
      testData: () => ({ invalidDestination: 'XYZ12345InvalidPlace', ...commonData }),
      assertions: [
        'Error message is displayed or result count is 0',
        'No server errors appear in the console',
        'Application remains stable',
      ],
      screenshotsOnFailure: ['Error state is not shown', 'Unexpected data is accepted', 'Application crashes'],
    }, context),
    createTestCase(issueKey, 'Negative', 'N02', {
      title: 'User attempts search with check-out before check-in',
      priority: 'High',
      automationPriority: 'P1',
      component: 'AirBnb Search Page',
      preconditions: ctx => `${commonPreconditions(ctx)}\nDate validation is implemented`,
      steps: [
        [`Navigate to ${appUrl}`, 'Search form loads'],
        [`Enter destination "${city}"`, 'Destination is selected'],
        [`Select check-in date ${checkOutDate}`, 'Check-in date is set'],
        [`Try to select check-out date ${checkInDate}`, 'Date picker prevents selection or displays an error'],
        ['Verify check-out date is on or after check-in date', 'System enforces date logic'],
      ],
      expectedResults: () => [
        'Application prevents invalid date selection',
        'Error message or validation feedback is shown',
        'Search cannot be submitted with invalid dates',
        'Check-out date cannot be before check-in date',
      ],
      testData: () => ({ destination: city, checkInDate: checkOutDate, invalidCheckOutDate: checkInDate }),
      assertions: [
        'Error message is displayed or result count is 0',
        'No server errors appear in the console',
        'Application remains stable',
      ],
      screenshotsOnFailure: ['Error state is not shown', 'Unexpected data is accepted', 'Application crashes'],
    }, context),
    createTestCase(issueKey, 'Negative', 'N03', {
      title: 'User attempts search without filling mandatory fields',
      priority: 'High',
      automationPriority: 'P1',
      component: 'AirBnb Search Page',
      preconditions: ctx => `${commonPreconditions(ctx)}\nForm validation is implemented`,
      steps: [
        [`Navigate to ${appUrl}`, 'Search form is displayed'],
        ['Leave destination field empty', 'Destination remains blank'],
        [`Set dates to ${checkInDate} - ${checkOutDate}`, 'Dates are set'],
        [`Set guests to ${guestDescription}`, 'Guest count is set'],
        ['Click Search', 'Click is processed'],
        ['Verify validation for the missing destination', 'Error appears for the missing destination'],
        ['Enter a destination but leave dates empty', 'Search is attempted with missing dates'],
        ['Verify validation for the missing dates', 'Error appears for the missing dates'],
      ],
      expectedResults: () => [
        'Application validates mandatory fields',
        'Search button is disabled or validation error is shown',
        'Clear messages guide the user to complete required fields',
        'Search is not submitted with incomplete data',
      ],
      testData: () => ({ missingDestination: '', checkInDate, checkOutDate }),
      assertions: [
        'Error message is displayed or result count is 0',
        'No server errors appear in the console',
        'Application remains stable',
      ],
      screenshotsOnFailure: ['Error state is not shown', 'Unexpected data is accepted', 'Application crashes'],
    }, context),
  ];

  const edge = [
    createTestCase(issueKey, 'Edge', 'E01', {
      title: 'User searches with minimum and maximum guest combinations',
      priority: 'Medium',
      automationPriority: 'P2',
      component: 'AirBnb Search Page - Guest Selection',
      preconditions: ctx => `${commonPreconditions(ctx)}\nGuest selection supports minimum and maximum configurations`,
      steps: [
        [`Navigate to ${appUrl}`, 'Search form loads'],
        [`Enter destination "${city}"`, 'Destination is selected'],
        [`Set dates ${checkInDate} - ${checkOutDate}`, 'Dates are selected'],
        ['Click Add Guests', 'Guest selection panel opens'],
        ['Set guests to minimum (1 adult)', '1 adult is selected'],
        ['Submit search', 'Search completes with 1 guest'],
        ['Verify results show 1 guest', 'Results are updated for 1 guest'],
        ['Repeat search with maximum guests (8+ adults)', 'Maximum guests are selected'],
        ['Submit the new search', 'Search completes'],
        ['Verify results show the correct guest count', 'Results are updated appropriately'],
      ],
      expectedResults: () => [
        'System accepts the minimum guest count (1)',
        'System accepts the maximum guest count',
        'Results update based on guest count',
        'Property availability changes with guest count',
      ],
      testData: () => ({ ...commonData, minGuests: 1, maxGuests: 8 }),
      assertions: [
        'Search works with boundary values',
        'Results reflect the selected guest count',
        'Price and duration calculations are correct',
      ],
      screenshotsOnFailure: ['Boundary value is not accepted', 'Unexpected error at limits', 'Calculation mismatch'],
    }, context),
    createTestCase(issueKey, 'Edge', 'E02', {
      title: 'User searches for a one-night stay',
      priority: 'Medium',
      automationPriority: 'P2',
      component: 'AirBnb Search Page',
      preconditions: ctx => `Application allows one-night bookings\nCurrent date is before ${checkInDate}`,
      steps: [
        [`Navigate to ${appUrl}`, 'Search form loads'],
        [`Enter destination "${city}"`, 'Destination is selected'],
        [`Set check-in date to ${checkInDate}`, 'Check-in date is set'],
        ['Set check-out date to the next day', 'Check-out date is set to the next day'],
        ['Set guests to 2 adults', 'Guests are selected'],
        ['Submit search', 'Search processes a one-night stay'],
        ['Verify results show one-night duration', 'Duration is shown correctly'],
        ['Verify pricing reflects one night', 'Price calculation is correct'],
      ],
      expectedResults: () => [
        'Application accepts a one-night stay',
        'Results correctly show a one-night duration',
        'Pricing reflects the single-night rate',
        'Properties are available for one-night stays',
      ],
      testData: () => ({
        destination: city,
        checkInDate,
        checkOutDate: nextCalendarDay(checkInDate),
        nightsDuration: 1,
        guests: 2,
      }),
      assertions: [
        'Search works with boundary values',
        'Results reflect the selected guest count',
        'Price and duration calculations are correct',
      ],
      screenshotsOnFailure: ['Boundary value is not accepted', 'Unexpected error at limits', 'Calculation mismatch'],
    }, context),
  ];

  return { positive, negative, edge };
}

function normalizeAITestCases(testCases, issueKey) {
  const categories = ['positive', 'negative', 'edge'];
  for (const category of categories) {
    const type = category === 'edge' ? 'Edge' : category[0].toUpperCase() + category.slice(1);
    const defaultPriority = category === 'positive' ? 'High' : category === 'negative' ? 'High' : 'Medium';
    testCases[category] = (testCases[category] || []).map((testCase, index) => {
      const steps = Array.isArray(testCase.steps) ? testCase.steps : [];
      const stepsWithResults = Array.isArray(testCase.stepsWithResults)
        ? testCase.stepsWithResults
        : steps.map(action => ({ action, result: 'Expected behavior is observed' }));
      let testData = testCase.testData || {};
      if (typeof testData === 'string') {
        try {
          testData = JSON.parse(testData);
        } catch {
          testData = { input: testData };
        }
      }
      return {
        ...testCase,
        id: testCase.id || `${issueKey}-TC_${category.toUpperCase()}${String(index + 1).padStart(2, '0')}`,
        type,
        priority: testCase.priority || defaultPriority,
        automationPriority: testCase.automationPriority || (category === 'positive' ? 'P0' : category === 'negative' ? 'P1' : 'P2'),
        component: testCase.component || 'Application',
        steps: stepsWithResults.map(step => typeof step === 'string' ? step : step.action),
        stepsWithResults: stepsWithResults.map((step, stepIndex) => typeof step === 'string'
          ? { action: step, result: 'Expected behavior is observed' }
          : { action: step.action || steps[stepIndex] || '', result: step.result || 'Expected behavior is observed' }),
        testData: JSON.stringify(testData, null, 2),
        assertions: Array.isArray(testCase.assertions) ? testCase.assertions : ['Expected behavior is observed'],
        screenshotsOnFailure: Array.isArray(testCase.screenshotsOnFailure)
          ? testCase.screenshotsOnFailure
          : ['Unexpected behavior is displayed', 'Application error occurs'],
      };
    });
  }
  return testCases;
}

module.exports = { generateDetailedFallback, normalizeAITestCases };
