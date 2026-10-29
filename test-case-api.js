/**
 * Test Case Generation API
 * Express.js backend for Gemini-powered test case generation
 */

const express = require("express");
const router = express.Router();
const GeminiTestCaseGenerator = require("./gemini-test-case-generator");

// Initialize Gemini generator
const geminiGenerator = new GeminiTestCaseGenerator(process.env.GEMINI_API_KEY);

/**
 * POST /api/test-cases/generate
 * Generate test cases for a user story using Gemini LLM
 */
router.post("/api/test-cases/generate", async (req, res) => {
  try {
    const { storyId, storyTitle, acceptanceCriteria, description } = req.body;

    // Validation
    if (!storyTitle || !acceptanceCriteria) {
      return res.status(400).json({
        error: "Missing required fields: storyTitle, acceptanceCriteria",
      });
    }

    console.log(`[TEST CASE GENERATION] Starting for story: ${storyId}`);

    // Generate test cases using Gemini
    const generatedTestCases = await geminiGenerator.generateTestCases({
      storyId,
      storyTitle,
      acceptanceCriteria,
      description,
    });

    console.log(
      `[TEST CASE GENERATION] Generated ${generatedTestCases.testCases.length} test cases`
    );

    res.json({
      success: true,
      data: generatedTestCases,
      message: `Successfully generated ${generatedTestCases.testCases.length} test cases`,
    });
  } catch (error) {
    console.error("[TEST CASE GENERATION ERROR]", error.message);
    res.status(500).json({
      error: error.message,
      details: "Failed to generate test cases. Please check the Gemini API configuration.",
    });
  }
});

/**
 * POST /api/test-cases/validate
 * Validate and process generated test cases before saving
 */
router.post("/api/test-cases/validate", async (req, res) => {
  try {
    const { testCases } = req.body;

    if (!Array.isArray(testCases)) {
      return res.status(400).json({
        error: "testCases must be an array",
      });
    }

    // Validation logic
    const validationResults = testCases.map((tc, index) => {
      const errors = [];

      if (!tc.title) errors.push("Missing test case title");
      if (!tc.steps || !Array.isArray(tc.steps) || tc.steps.length === 0) {
        errors.push("Missing or empty test steps");
      }
      if (!tc.expectedResult) errors.push("Missing expected result");

      return {
        index,
        id: tc.id,
        valid: errors.length === 0,
        errors,
      };
    });

    const allValid = validationResults.every((r) => r.valid);

    res.json({
      success: true,
      allValid,
      validationResults,
      message: allValid ? "All test cases are valid" : "Some test cases have validation errors",
    });
  } catch (error) {
    console.error("[VALIDATION ERROR]", error.message);
    res.status(500).json({
      error: error.message,
      details: "Validation failed",
    });
  }
});

/**
 * POST /api/test-cases/format
 * Format test cases for display and storage
 */
router.post("/api/test-cases/format", async (req, res) => {
  try {
    const { testCases, format = "json" } = req.body;

    if (!Array.isArray(testCases)) {
      return res.status(400).json({
        error: "testCases must be an array",
      });
    }

    let formatted;

    if (format === "markdown") {
      formatted = formatAsMarkdown(testCases);
    } else if (format === "csv") {
      formatted = formatAsCSV(testCases);
    } else {
      formatted = testCases;
    }

    res.json({
      success: true,
      format,
      data: formatted,
    });
  } catch (error) {
    console.error("[FORMAT ERROR]", error.message);
    res.status(500).json({
      error: error.message,
    });
  }
});

/**
 * Format test cases as Markdown
 */
function formatAsMarkdown(testCases) {
  let markdown = "# Test Cases\n\n";

  testCases.forEach((tc) => {
    markdown += `## ${tc.id}: ${tc.title}\n`;
    markdown += `**Scenario:** ${tc.scenario}\n`;
    markdown += `**Priority:** ${tc.priority}\n`;
    markdown += `**Description:** ${tc.description}\n\n`;

    markdown += "### Test Steps\n";
    if (tc.steps && Array.isArray(tc.steps)) {
      tc.steps.forEach((step) => {
        markdown += `${step.step}. ${step.action}\n`;
      });
    }
    markdown += "\n";

    markdown += `### Expected Result\n${tc.expectedResult}\n\n`;

    if (tc.testData) {
      markdown += `### Test Data\n${tc.testData}\n\n`;
    }

    markdown += "---\n\n";
  });

  return markdown;
}

/**
 * Format test cases as CSV
 */
function formatAsCSV(testCases) {
  const headers = [
    "Test Case ID",
    "Title",
    "Scenario",
    "Priority",
    "Steps",
    "Expected Result",
    "Test Data",
  ];

  let csv = headers.join(",") + "\n";

  testCases.forEach((tc) => {
    const steps = tc.steps ? tc.steps.map((s) => s.action).join("; ") : "";
    const row = [
      tc.id,
      `"${tc.title}"`,
      tc.scenario,
      tc.priority,
      `"${steps}"`,
      `"${tc.expectedResult}"`,
      `"${tc.testData || ""}"`,
    ];
    csv += row.join(",") + "\n";
  });

  return csv;
}

module.exports = router;
