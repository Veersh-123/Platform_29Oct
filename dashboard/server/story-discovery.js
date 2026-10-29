/**
 * Story Discovery & Auto-Generation Module
 * =====================================================================
 * Automatically detects new user stories and generates test automation artifacts
 * Supports any story pattern: UMB-*, AIR-*, AFS-*, KAN-*, etc.
 * =====================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// Directories
const SPECS_DIR = path.join(ROOT, 'specs');
const TESTS_DIR = path.join(ROOT, 'tests');
const PAGES_DIR = path.join(ROOT, 'pages');
const LOCATORS_DIR = path.join(ROOT, 'Locators');
const TEST_DATA_DIR = path.join(ROOT, 'Test_Data');

/**
 * Discover all stories from spec files
 * Returns: { storyId, specFile, exists }[]
 */
function discoverStories() {
  const stories = [];
  
  if (!fs.existsSync(SPECS_DIR)) {
    console.log('[DISCOVERY] Specs directory not found');
    return stories;
  }

  const specFiles = fs.readdirSync(SPECS_DIR)
    .filter(f => f.endsWith('-TEST-CASES.md'));

  for (const file of specFiles) {
    // Extract story ID from filename: "UMB-1-TEST-CASES.md" → "UMB-1"
    const match = file.match(/^(.+?)-TEST-CASES\.md$/);
    if (!match) continue;

    const storyId = match[1];
    const specFile = path.join(SPECS_DIR, file);
    
    stories.push({
      storyId,
      specFile,
      exists: true,
      discoveredAt: new Date().toISOString()
    });
  }

  console.log(`[DISCOVERY] Found ${stories.length} stories: ${stories.map(s => s.storyId).join(', ')}`);
  return stories;
}

/**
 * Check if story has all required artifacts
 * Returns: { hasScript, hasPage, hasLocators, hasTestData }
 */
function checkArtifacts(storyId) {
  const artifacts = {
    storyId,
    script: {
      path: path.join(TESTS_DIR, storyId, `${storyId}-Script.spec.ts`),
      exists: false,
      hasTestCases: false
    },
    page: {
      path: path.join(PAGES_DIR, `${storyId}-Page.ts`),
      exists: false
    },
    locators: {
      path: path.join(LOCATORS_DIR, `${storyId}-Locators.ts`),
      exists: false
    },
    testData: {
      path: path.join(TEST_DATA_DIR, `${storyId}-test-data.json`),
      exists: false
    }
  };

  // Check script file
  if (fs.existsSync(artifacts.script.path)) {
    artifacts.script.exists = true;
    const content = fs.readFileSync(artifacts.script.path, 'utf8');
    artifacts.script.hasTestCases = /Test Cases \(\d+ total\)/.test(content) && !/Test Cases \(0 total\)/.test(content);
  }

  // Check page object
  if (fs.existsSync(artifacts.page.path)) {
    artifacts.page.exists = true;
  }

  // Check locators
  if (fs.existsSync(artifacts.locators.path)) {
    artifacts.locators.exists = true;
  }

  // Check test data
  if (fs.existsSync(artifacts.testData.path)) {
    artifacts.testData.exists = true;
  }

  return artifacts;
}

/**
 * Get all stories with their status
 * Returns comprehensive status for dashboard
 */
function getAllStoriesStatus() {
  const stories = discoverStories();
  const statuses = [];

  for (const story of stories) {
    const artifacts = checkArtifacts(story.storyId);
    const specContent = fs.readFileSync(story.specFile, 'utf8');
    
    // Count test cases in spec
    const testCaseMatches = specContent.match(/^(?:#### Test Case:|## Test Case ID:)/gm) || [];
    const testCaseCount = testCaseMatches.length;

    const status = {
      storyId: story.storyId,
      specFile: story.specFile,
      testCaseCount,
      artifacts,
      isComplete: artifacts.script.exists && artifacts.script.hasTestCases && 
                  artifacts.page.exists && artifacts.locators.exists && 
                  artifacts.testData.exists,
      readinessPercent: calculateReadiness(artifacts)
    };

    statuses.push(status);
  }

  return statuses;
}

/**
 * Calculate story readiness percentage
 */
function calculateReadiness(artifacts) {
  let completed = 0;
  const total = 5; // script, page, locators, testData, hasTestCases

  if (artifacts.script.exists) completed++;
  if (artifacts.script.hasTestCases) completed++;
  if (artifacts.page.exists) completed++;
  if (artifacts.locators.exists) completed++;
  if (artifacts.testData.exists) completed++;

  return Math.round((completed / total) * 100);
}

/**
 * Check if story needs regeneration
 * Returns true if spec file is newer than script file
 */
function needsRegeneration(storyId) {
  const specFile = path.join(SPECS_DIR, `${storyId}-TEST-CASES.md`);
  const scriptFile = path.join(TESTS_DIR, storyId, `${storyId}-Script.spec.ts`);

  if (!fs.existsSync(specFile)) return false;
  if (!fs.existsSync(scriptFile)) return true;

  const specTime = fs.statSync(specFile).mtime;
  const scriptTime = fs.statSync(scriptFile).mtime;

  return specTime > scriptTime;
}

/**
 * Get pending stories (missing artifacts or outdated)
 */
function getPendingStories() {
  const allStories = getAllStoriesStatus();
  return allStories.filter(s => !s.isComplete || needsRegeneration(s.storyId));
}

/**
 * Validate if story ID follows naming convention
 * Supports: UMB-1, AIR-1, AFS-2, KAN-1, etc.
 */
function isValidStoryId(storyId) {
  // Pattern: 3-4 uppercase letters followed by hyphen and number(s)
  return /^[A-Z]{3,4}-\d+$/.test(storyId);
}

/**
 * Extract story ID from various formats
 */
function normalizeStoryId(input) {
  // Handle: "UMB-1", "umb-1", "UMB1", "umb1"
  const normalized = input.toUpperCase().replace(/\s+/g, '');
  
  // Add hyphen if missing: "UMB1" → "UMB-1"
  const withHyphen = normalized.replace(/^([A-Z]+)(\d+)$/, '$1-$2');
  
  return isValidStoryId(withHyphen) ? withHyphen : null;
}

module.exports = {
  discoverStories,
  checkArtifacts,
  getAllStoriesStatus,
  getPendingStories,
  isValidStoryId,
  normalizeStoryId,
  needsRegeneration,
  calculateReadiness,
  SPECS_DIR,
  TESTS_DIR,
  PAGES_DIR,
  LOCATORS_DIR,
  TEST_DATA_DIR,
  ROOT
};
