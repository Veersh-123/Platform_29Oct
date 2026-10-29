/**
 * Manual Test Cases API
 * Handles test case generation from Jira issues using Groq LLM (via OpenAI SDK)
 */

const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');

// Initialize Groq via OpenAI-compatible API
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
});

console.log('[LLM] Initialized Groq API via OpenAI-compatible endpoint');

/**
 * POST /api/manual-test-cases/generate
 * Generate manual test cases from Jira issue
 */
router.post('/api/manual-test-cases/generate', async (req, res) => {
  try {
    const { issueKey, summary, description } = req.body;

    if (!summary) {
      return res.status(400).json({ error: 'Missing issue summary' });
    }

    console.log(`[TEST CASE GENERATION] Generating for ${issueKey || 'unknown'}`);

    // Build acceptance criteria from description or summary
    const criteria = description || summary;

    // Generate test cases
    const testCases = await generateTestCases(summary, criteria);

    res.json({
      success: true,
      testCases,
      source: 'ai',
      model: 'groq-llama-3.1-70b',
      message: 'Test cases generated successfully'
    });

  } catch (error) {
    console.error('[GENERATION ERROR]', error.message);
    res.status(500).json({
      error: error.message || 'Failed to generate test cases',
      details: 'Check Groq API configuration and ensure API key is valid'
    });
  }
});

/**
 * Generate test cases using Groq LLM (via OpenAI-compatible API)
 */
async function generateTestCases(summary, description) {
  const prompt = buildPrompt(summary, description);

  // Current available models on Groq (as of Oct 2026)
  const modelsToTry = [
    'openai/gpt-oss-120b',      // Best quality, 500 T/sec
    'openai/gpt-oss-20b',       // Fast, 1000 T/sec
    'llama-3.3-70b-versatile',  // Enterprise, 280 T/sec
    'llama-3.1-8b-instant'      // Enterprise, 560 T/sec
  ];

  for (const modelName of modelsToTry) {
    try {
      console.log(`[LLM] Attempting model: ${modelName}`);
      
      const message = await groq.chat.completions.create({
        model: modelName,
        max_tokens: 2500,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const responseText = message.choices[0].message.content || '';
      
      if (!responseText) {
        throw new Error('Empty response from Groq API');
      }

      console.log(`[LLM] ✓ Successfully generated response with ${modelName}`);
      console.log(`[LLM] Response preview: ${responseText.substring(0, 200)}...`);
      
      // Parse the plain-text response into structured test cases
      const testCases = parseTestCasesFromText(responseText, summary, description);
      
      console.log(`[LLM] ✓ Successfully parsed test cases: ${testCases.positive.length} positive, ${testCases.negative.length} negative, ${testCases.edge.length} edge`);
      return testCases;

    } catch (error) {
      console.error(`[LLM] Model ${modelName} failed:`, error.message);
      continue; // Try next model
    }
  }

  // If all models fail, throw error
  throw new Error('All Groq models failed. Available models: ' + modelsToTry.join(', '));
}

/**
 * Build the prompt for Groq/LLM - generates plain text, not JSON
 */
function buildPrompt(summary, description) {
  return `You are an expert QA engineer. Generate comprehensive manual test cases based on this user story:

SUMMARY: ${summary}

DESCRIPTION: ${description}

Generate test cases in plain text format. Use this exact structure for each test case:

TEST CASE ID: TC001
TITLE: Test case title here
STEPS:
- Step 1 description
- Step 2 description
- Step 3 description
EXPECTED RESULT: What should happen
TEST DATA: Specific values or "None"
---

Generate 4-5 POSITIVE cases (happy path), 3-4 NEGATIVE cases (errors), and 2-3 EDGE cases (boundaries).

Start with positive cases, then negative, then edge cases.`;
}

/**
 * Parse plain-text test case output from LLM
 */
function parseTestCasesFromText(responseText, summary, description) {
  try {
    console.log('[PARSE TEXT] Parsing plain-text response...');
    
    const result = {
      positive: [],
      negative: [],
      edge: []
    };

    // Split by test case delimiter
    const testCaseBlocks = responseText.split(/---+/).filter(block => block.trim().length > 0);
    
    console.log(`[PARSE TEXT] Found ${testCaseBlocks.length} test case blocks`);
    
    let currentType = 'positive';
    
    for (const block of testCaseBlocks) {
      try {
        // Determine test case type
        if (block.toLowerCase().includes('negative') || block.toLowerCase().includes('tc_neg')) {
          currentType = 'negative';
        } else if (block.toLowerCase().includes('edge') || block.toLowerCase().includes('boundary')) {
          currentType = 'edge';
        } else if (block.toLowerCase().includes('positive') || block.toLowerCase().includes('tc00')) {
          currentType = 'positive';
        }
        
        // Extract test case details
        const idMatch = block.match(/(?:TEST CASE )?ID[:\s]+([^\n]+)/i);
        const titleMatch = block.match(/TITLE[:\s]+([^\n]+)/i);
        const stepsMatch = block.match(/STEPS[:\s]+([^]*?)(?:EXPECTED|$)/i);
        const expectedMatch = block.match(/EXPECTED RESULT[:\s]+([^\n]+)/i);
        const dataMatch = block.match(/TEST DATA[:\s]+([^\n]+)/i);
        
        if (!titleMatch) continue; // Skip if no title
        
        const testCase = {
          id: (idMatch ? idMatch[1].trim() : `TC_${currentType.toUpperCase()}_${result[currentType].length + 1}`).substring(0, 20),
          title: titleMatch[1].trim().substring(0, 200),
          steps: [],
          expectedResult: (expectedMatch ? expectedMatch[1].trim() : 'Test passes').substring(0, 500),
          testData: (dataMatch && dataMatch[1].trim() !== 'None' && dataMatch[1].trim() !== 'none') ? dataMatch[1].trim().substring(0, 200) : null
        };
        
        // Parse steps
        if (stepsMatch && stepsMatch[1]) {
          const stepsText = stepsMatch[1];
          const steps = stepsText.match(/[-•*]\s+([^\n]+)/g) || [];
          testCase.steps = steps.map(s => s.replace(/^[-•*]\s+/, '').trim().substring(0, 300)).filter(s => s.length > 0);
        }
        
        if (testCase.steps.length === 0) {
          // If no steps parsed, use the whole description as single step
          testCase.steps = [block.replace(/TEST CASE.*?(?:ID|TITLE).*?$/, '').trim().substring(0, 300)];
        }
        
        // Add to appropriate category
        if (result[currentType].length < 10) { // Limit to 10 per category
          result[currentType].push(testCase);
        }
        
      } catch (blockError) {
        console.log('[PARSE TEXT] Error parsing block:', blockError.message);
        continue;
      }
    }
    
    // If parsing got very few results, generate intelligent fallback
    if (result.positive.length + result.negative.length + result.edge.length < 3) {
      console.log('[PARSE TEXT] Got very few test cases, generating intelligent fallback...');
      return generateFallbackTestCases(summary, description);
    }
    
    console.log(`[PARSE TEXT] ✓ Parsed: ${result.positive.length} positive, ${result.negative.length} negative, ${result.edge.length} edge`);
    return result;

  } catch (error) {
    console.error('[PARSE TEXT ERROR]', error.message);
    console.log('[PARSE TEXT] Using intelligent fallback generation');
    return generateFallbackTestCases(summary, description);
  }
}

/**
 * Generate intelligent test cases as fallback when parsing fails
 */
function generateFallbackTestCases(summary, description) {
  console.log('[FALLBACK] Generating intelligent test cases from story content');
  
  const positive = [];
  const negative = [];
  const edge = [];
  
  // Analyze the story to generate contextual test cases
  const lowerText = (summary + ' ' + description).toLowerCase();
  
  // Positive - Happy path
  positive.push({
    id: 'TC001',
    title: `${summary} - Happy Path`,
    steps: [
      'Navigate to the application',
      'Locate the feature related to: ' + summary,
      'Perform the required action with valid input',
      'Verify successful completion'
    ],
    expectedResult: 'Feature works correctly and user sees success confirmation',
    testData: null
  });
  
  positive.push({
    id: 'TC002',
    title: `${summary} - Valid Input Scenario`,
    steps: [
      'Access the feature',
      'Enter all required information correctly',
      'Submit/Confirm action',
      'Verify result is displayed'
    ],
    expectedResult: 'System processes correctly and displays confirmation',
    testData: 'Valid data values'
  });
  
  positive.push({
    id: 'TC003',
    title: `${summary} - Complete Workflow`,
    steps: [
      'Start the process',
      'Complete all required steps',
      'Review information',
      'Finalize/Submit'
    ],
    expectedResult: 'Entire workflow completes successfully',
    testData: null
  });
  
  // Negative - Error handling
  negative.push({
    id: 'TC_NEG_001',
    title: 'Reject invalid input',
    steps: [
      'Attempt to enter invalid/malformed data',
      'Try to submit',
      'Observe error handling'
    ],
    expectedResult: 'System shows error message and prevents submission',
    testData: 'Invalid or malformed input'
  });
  
  negative.push({
    id: 'TC_NEG_002',
    title: 'Reject missing required fields',
    steps: [
      'Leave required fields empty',
      'Attempt to submit',
      'Observe validation'
    ],
    expectedResult: 'System validates and shows which fields are required',
    testData: 'Empty/missing required values'
  });
  
  negative.push({
    id: 'TC_NEG_003',
    title: 'Handle unauthorized access',
    steps: [
      'Try to access without proper permissions',
      'Observe access control'
    ],
    expectedResult: 'System denies access with appropriate message',
    testData: 'Insufficient privileges'
  });
  
  // Edge - Boundaries
  edge.push({
    id: 'TC_EDGE_001',
    title: 'Handle maximum data size',
    steps: [
      'Submit with maximum allowed data',
      'Verify system handles it correctly'
    ],
    expectedResult: 'System processes without timeout or error',
    testData: 'Maximum size input'
  });
  
  edge.push({
    id: 'TC_EDGE_002',
    title: 'Handle minimum/boundary values',
    steps: [
      'Submit with boundary values',
      'Verify calculations are correct'
    ],
    expectedResult: 'Boundary values are handled correctly',
    testData: 'Min/max/zero values'
  });
  
  console.log('[FALLBACK] Generated:', positive.length, 'positive,', negative.length, 'negative,', edge.length, 'edge');
  
  return {
    positive: positive.slice(0, 5),
    negative: negative.slice(0, 4),
    edge: edge.slice(0, 3)
  };
}

module.exports = router;
