#!/usr/bin/env node

/**
 * Test Observability Server
 * Serves the observability dashboard and provides test result APIs
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3001;
const RESULTS_DIR = path.join(__dirname, '../results');
const DASHBOARD_DIR = __dirname;

// Ensure results directory exists
if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

// MIME types
const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// Parse request URL and body
async function parseRequest(req) {
    return new Promise((resolve) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                resolve({ body: body ? JSON.parse(body) : {} });
            } catch {
                resolve({ body: {} });
            }
        });
    });
}

// Get MIME type
function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return MIME_TYPES[ext] || 'application/octet-stream';
}

// Serve static file
function serveFile(filePath, res) {
    const fullPath = path.join(DASHBOARD_DIR, filePath);
    const normalizedPath = path.normalize(fullPath);
    
    // Security: prevent path traversal
    if (!normalizedPath.startsWith(DASHBOARD_DIR)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Access denied');
        return;
    }

    fs.readFile(normalizedPath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not found');
            return;
        }
        res.writeHead(200, { 'Content-Type': getMimeType(normalizedPath) });
        res.end(data);
    });
}

// Get latest test results
function getLatestResults() {
    try {
        const reportsDir = path.resolve(DASHBOARD_DIR, '../../playwright-reports');
        const reports = fs.existsSync(reportsDir)
            ? fs.readdirSync(reportsDir, { withFileTypes: true })
                .filter(entry => entry.isDirectory())
                .map(entry => path.join(reportsDir, entry.name, 'summary.json'))
                .filter(file => fs.existsSync(file))
                .map(file => JSON.parse(fs.readFileSync(file, 'utf8')))
                .sort((a, b) => (b.lastRun || 0) - (a.lastRun || 0))
            : [];
        if (reports.length) return reports[0];

        return {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            tests: []
        };
    } catch (error) {
        console.error('Error reading results:', error);
        return {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            tests: []
        };
    }
}

// Request handler
async function handleRequest(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    // API Routes
    if (pathname === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
        return;
    }

    if (pathname === '/api/results') {
        const results = getLatestResults();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(results));
        return;
    }

    if (pathname === '/api/metrics') {
        const results = getLatestResults();
        const metrics = {
            timestamp: new Date().toISOString(),
            total: results.total || 0,
            passed: results.passed || 0,
            failed: results.failed || 0,
            skipped: results.skipped || 0,
            passRate: results.total ? ((results.passed / results.total) * 100).toFixed(2) : 0,
            failRate: results.total ? ((results.failed / results.total) * 100).toFixed(2) : 0
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(metrics));
        return;
    }

    // Static file serving
    if (pathname === '/' || pathname === '') {
        serveFile('/test-observability-loader.html', res);
        return;
    }

    serveFile(pathname, res);
}

// Create server
const server = http.createServer(handleRequest);

server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════╗
║   Test Observability Server Started        ║
╠════════════════════════════════════════════╣
║  🌐 URL: http://localhost:${PORT}            ║
║  📊 Dashboard: http://localhost:${PORT}/     ║
║  🏥 Health: http://localhost:${PORT}/api/health ║
╚════════════════════════════════════════════╝
    `);
    console.log('📡 Waiting for connections...');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Shutting down...');
    server.close();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\nShutting down...');
    server.close();
    process.exit(0);
});
