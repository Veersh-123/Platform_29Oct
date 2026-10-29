/**
 * Express Server Setup
 * Complete setup for test case generation API with Gemini integration
 */

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Import routes
const testCaseRoutes = require("./test-case-api");

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(cors());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    geminiConfigured: !!process.env.GEMINI_API_KEY,
  });
});

// API Routes
app.use("/", testCaseRoutes);

// Test endpoint to verify Gemini setup
app.get("/api/test-case-generator/verify", (req, res) => {
  try {
    const { GoogleGenerativeAI } = require("@google/generative-ai");
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        error: "GEMINI_API_KEY not configured in .env file",
        instructions:
          "1. Get API key from https://ai.google.dev/\n2. Add GEMINI_API_KEY to .env file\n3. Restart the server",
      });
    }

    const client = new GoogleGenerativeAI(apiKey);
    res.json({
      status: "verified",
      message: "Gemini API is properly configured",
      model: "gemini-1.5-flash",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      details: "Failed to verify Gemini configuration",
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("[ERROR]", err);
  res.status(500).json({
    error: err.message,
    details: "An unexpected error occurred",
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    path: req.path,
    method: req.method,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║     Test Case Generator Server - Powered by Gemini LLM        ║
╚═══════════════════════════════════════════════════════════════╝

📍 Server running at: http://localhost:${PORT}
🤖 Gemini API: ${process.env.GEMINI_API_KEY ? "✓ Configured" : "✗ Not configured"}
📡 Health check: GET http://localhost:${PORT}/health
🔍 Verify setup: GET http://localhost:${PORT}/api/test-case-generator/verify

API Endpoints:
  POST   /api/test-cases/generate    - Generate test cases from acceptance criteria
  POST   /api/test-cases/validate    - Validate generated test cases
  POST   /api/test-cases/format      - Format test cases for export

Documentation:
  - Generate endpoint accepts: storyId, storyTitle, acceptanceCriteria, description
  - Format endpoint accepts: testCases array, format (json/markdown/csv)

═══════════════════════════════════════════════════════════════
  `);
});

module.exports = app;
