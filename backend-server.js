/**
 * Backend Server for Test Case Generation
 * Integrates Gemini LLM with Orchestrator Platform
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Import routes
const manualTestCasesRouter = require('./manual-test-cases-api');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Serve static dashboard files
app.use(express.static(path.join(__dirname, 'dashboard')));

// Root endpoint - serve Orchestrator Platform dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard', 'Orchestrator-Platform.html'));
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Orchestrator Platform - Backend Server',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: 'GET /health',
      generateTestCases: 'POST /api/manual-test-cases/generate'
    },
    description: 'Backend server for test case generation using Groq LLM'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    groqConfigured: !!process.env.GROQ_API_KEY
  });
});

// Stats endpoint - for dashboard status check
app.get('/api/stats', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    server: 'Orchestrator Platform Backend',
    version: '1.0.0',
    groqConfigured: !!process.env.GROQ_API_KEY,
    uptime: process.uptime()
  });
});

// Server status endpoint
app.get('/api/server/status', (req, res) => {
  res.json({
    ok: true,
    status: 'online',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    port: PORT,
    startedAt: new Date(Date.now() - process.uptime() * 1000).toISOString()
  });
});

// API Routes
app.use('/', manualTestCasesRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(500).json({
    error: err.message,
    details: 'An unexpected error occurred'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║      Orchestrator Platform - Backend Server               ║
║      Powered by Groq LLM (OpenAI-compatible API)          ║
╚════════════════════════════════════════════════════════════╝

📍 Server: http://localhost:${PORT}
🤖 Groq API: ${process.env.GROQ_API_KEY ? '✓ Configured' : '✗ Not configured - Get free key at https://console.groq.com'}
📡 Health: GET http://localhost:${PORT}/health

API Endpoints:
  POST /api/manual-test-cases/generate

═══════════════════════════════════════════════════════════
  `);
});

module.exports = app;
