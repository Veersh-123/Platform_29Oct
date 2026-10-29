/**
 * Gemini Test Case Generator
 * Integrates Google Gemini LLM to generate context-aware test cases
 * with positive, negative, and boundary scenarios
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");

class GeminiTestCaseGenerator {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured in .env file");
    }
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = this.client.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  /**
   * Generate test cases based on user story acceptance criteria
   * @param {Object} storyData - User story data with acceptance criteria
   * @returns {Promise<Object>} Generated test cases
   */
  async generateTestCases(storyData) {
    const { storyId, storyTitle, acceptanceCriteria, description } = storyData;

    if (!acceptanceCriteria) {
      throw new Error("Acceptance criteria is required to generate test cases");
    }

    const prompt = this._buildPrompt(
      storyTitle,
      acceptanceCriteria,
      description
    );

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const generatedText = response.text();

      return this._parseTestCases(generatedText, storyId);
    } catch (error) {
      throw new Error(`Gemini API Error: ${error.message}`);
    }
  }

  /**
   * Build the prompt for Gemini to generate test cases
   * @private
   */
  _buildPrompt(storyTitle, acceptanceCriteria, description) {
    return `You are an expert QA engineer. Generate comprehensive test cases based on the following user story.

STORY TITLE: ${storyTitle}
${description ? `DESCRIPTION: ${description}` : ""}

ACCEPTANCE CRITERIA:
${acceptanceCriteria}

Generate test cases covering:
1. POSITIVE SCENARIOS - Tests that verify the happy path and expected behavior
2. NEGATIVE SCENARIOS - Tests that verify error handling and invalid inputs
3. BOUNDARY SCENARIOS - Tests that verify edge cases and limits

For each test case, provide:
- Test Case ID (e.g., TC001, TC002, etc.)
- Test Case Title (descriptive name)
- Scenario Type (Positive/Negative/Boundary)
- Test Steps (numbered list of actions)
- Expected Result (what should happen)
- Test Data (any specific data needed)
- Priority (High/Medium/Low)

Format the output as JSON with the following structure:
{
  "testCases": [
    {
      "id": "TC001",
      "title": "Test case title",
      "scenario": "Positive",
      "description": "Brief description",
      "steps": [
        {"step": 1, "action": "Action description"},
        {"step": 2, "action": "Action description"}
      ],
      "expectedResult": "Expected outcome",
      "testData": "Any test data needed",
      "priority": "High"
    }
  ],
  "summary": {
    "totalTestCases": number,
    "positiveCount": number,
    "negativeCount": number,
    "boundaryCount": number
  }
}

Generate at least 8-12 comprehensive test cases. Ensure good coverage across all three scenario types.`;
  }

  /**
   * Parse and structure the generated test cases
   * @private
   */
  _parseTestCases(generatedText, storyId) {
    try {
      // Extract JSON from the response
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Could not extract JSON from Gemini response");
      }

      const testCaseData = JSON.parse(jsonMatch[0]);

      // Enrich test cases with metadata
      return {
        storyId,
        generatedAt: new Date().toISOString(),
        testCases: testCaseData.testCases.map((tc, index) => ({
          ...tc,
          id: tc.id || `TC${String(index + 1).padStart(3, "0")}`,
          status: "pending",
          createdAt: new Date().toISOString(),
        })),
        summary: testCaseData.summary || this._calculateSummary(testCaseData.testCases),
      };
    } catch (error) {
      console.error("Parse error:", error);
      throw new Error(`Failed to parse Gemini response: ${error.message}`);
    }
  }

  /**
   * Calculate test case summary statistics
   * @private
   */
  _calculateSummary(testCases) {
    const summary = {
      totalTestCases: testCases.length,
      positiveCount: 0,
      negativeCount: 0,
      boundaryCount: 0,
    };

    testCases.forEach((tc) => {
      const scenario = tc.scenario || "";
      if (scenario.toLowerCase().includes("positive")) summary.positiveCount++;
      else if (scenario.toLowerCase().includes("negative")) summary.negativeCount++;
      else if (scenario.toLowerCase().includes("boundary")) summary.boundaryCount++;
    });

    return summary;
  }
}

module.exports = GeminiTestCaseGenerator;
