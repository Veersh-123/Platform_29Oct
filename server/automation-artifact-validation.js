'use strict';

function getStepCount(testCase) {
  if (Array.isArray(testCase.stepsWithResults) && testCase.stepsWithResults.length) {
    return testCase.stepsWithResults.length;
  }
  return Array.isArray(testCase.steps) ? testCase.steps.length : 0;
}

function findMissingScriptSteps(testCases, testScript) {
  const stepCalls = [...testScript.matchAll(
    /\bawait\s+test\.step\s*\(\s*(['"`])([\s\S]*?)\1\s*,\s*async\s*\(\s*\)\s*=>\s*\{/g
  )];
  const stepTitles = stepCalls.map(match => match[2]);
  const missing = [];
  const expectedStepCount = testCases.reduce((total, testCase) => total + getStepCount(testCase), 0);

  for (const testCase of testCases) {
    const stepCount = getStepCount(testCase);
    if (!stepCount) {
      missing.push(`${testCase.id} (no steps supplied)`);
      continue;
    }

    let previousIndex = -1;
    for (let stepNumber = 1; stepNumber <= stepCount; stepNumber++) {
      const marker = `${testCase.id} | Step ${stepNumber}:`;
      const titleIndex = stepTitles.findIndex(title => title.startsWith(marker));
      if (titleIndex === -1) {
        missing.push(marker);
      } else if (titleIndex <= previousIndex) {
        missing.push(`${marker} (out of order)`);
      } else {
        previousIndex = titleIndex;
        const bodyStart = stepCalls[titleIndex].index + stepCalls[titleIndex][0].length;
        const bodyEnd = stepCalls[titleIndex + 1]?.index ?? testScript.length;
        const body = testScript.slice(bodyStart, bodyEnd);
        if (!/\bawait\s+[^;\n]+|\bexpect\s*\(/.test(body)) {
          missing.push(`${marker} (no executable action or assertion)`);
        }
      }
    }
  }

  if (stepCalls.length !== expectedStepCount) {
    missing.push(`expected ${expectedStepCount} executable test.step calls, found ${stepCalls.length}`);
  }
  return missing;
}

module.exports = { findMissingScriptSteps };
