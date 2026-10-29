#!/usr/bin/env node

/**
 * Test Observability Dashboard Generator
 * 
 * This script generates an interactive HTML dashboard from test execution results.
 * Supports both Cucumber JSON and JUnit XML formats.
 * 
 * Usage:
 *   node generate-dashboard.js <resultsPath> [options]
 * 
 * Examples:
 *   node generate-dashboard.js ../data/sample-cucumber-results.json
 *   node generate-dashboard.js ../data/junit-results.xml --format junit
 *   node generate-dashboard.js ../data/results.json --output ../dashboard/report.html
 */

const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

// Configuration
const CONFIG = {
    defaultOutput: '../dashboard/cucumber-dashboard.html',
    defaultFormat: 'cucumber',
    supportedFormats: ['cucumber', 'junit'],
};

// Parse command line arguments
function parseArgs(args) {
    const result = {
        resultsPath: args[0],
        format: CONFIG.defaultFormat,
        output: CONFIG.defaultOutput,
        help: args.includes('--help') || args.includes('-h'),
    };

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--format' && args[i + 1]) result.format = args[i + 1];
        if (args[i] === '--output' && args[i + 1]) result.output = args[i + 1];
    }

    return result;
}

// Read and parse test results
async function parseResults(filePath, format) {
    console.log(`📖 Reading ${format} results from: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');

    if (format === 'cucumber') {
        return JSON.parse(content);
    } else if (format === 'junit') {
        return await parseJunitXml(content);
    } else {
        throw new Error(`Unsupported format: ${format}`);
    }
}

// Parse JUnit XML to Cucumber-like structure
async function parseJunitXml(xmlContent) {
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(xmlContent);
    
    // Convert JUnit structure to Cucumber-like format
    const suites = result.testsuites?.testsuite || [result.testsuite];
    
    return suites.map((suite, idx) => ({
        uri: suite.$.name || `test-suite-${idx}`,
        id: suite.$.name?.replace(/\s+/g, '-') || `suite-${idx}`,
        keyword: 'Feature',
        name: suite.$.name || `Test Suite ${idx + 1}`,
        elements: (suite.testcase || []).map((testcase) => ({
            id: testcase.$.name?.replace(/\s+/g, '-'),
            keyword: 'Scenario',
            name: testcase.$.name,
            type: 'scenario',
            steps: [
                {
                    keyword: 'When ',
                    name: 'test executes',
                    result: {
                        status: testcase.failure || testcase.error ? 'failed' : 'passed',
                        duration: (parseFloat(testcase.$.time) || 0) * 1000000000,
                        error_message: testcase.failure?.[0]?._ || testcase.error?.[0]?._ || '',
                    },
                },
            ],
        })),
    }));
}

// Generate HTML dashboard
function generateDashboard(testResults) {
    console.log('📊 Generating dashboard HTML...');

    // Calculate metrics
    const metrics = calculateMetrics(testResults);

    // Generate HTML
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Execution Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0a1628;
            color: #e0e0e0;
            padding: 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .header {
            background: linear-gradient(135deg, #0f1f35, #1a2f4a);
            border: 1px solid #1e3a5a;
            border-radius: 8px;
            padding: 24px;
            margin-bottom: 24px;
        }
        .title {
            font-size: 28px;
            font-weight: 700;
            color: white;
            margin-bottom: 8px;
        }
        .timestamp {
            font-size: 12px;
            color: #64748b;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }
        .metric-card {
            background: #0f1f35;
            border: 1px solid #1a2f4a;
            border-radius: 6px;
            padding: 16px;
            text-align: center;
        }
        .metric-value {
            font-size: 32px;
            font-weight: 700;
            color: white;
            margin-bottom: 4px;
        }
        .metric-label {
            font-size: 11px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .metric-card.pass .metric-value { color: #10b981; }
        .metric-card.fail .metric-value { color: #f87171; }
        .metric-card.skip .metric-value { color: #f59e0b; }
        .features-section {
            background: #0f1f35;
            border: 1px solid #1a2f4a;
            border-radius: 8px;
            overflow: hidden;
        }
        .section-header {
            background: #0a1628;
            border-bottom: 1px solid #1a2f4a;
            padding: 16px 20px;
            font-size: 14px;
            font-weight: 600;
            color: white;
        }
        .feature-block {
            border-bottom: 1px solid #1a2f4a;
            padding: 16px 20px;
        }
        .feature-block:last-child { border-bottom: none; }
        .feature-name {
            font-size: 14px;
            font-weight: 600;
            color: #3b82f6;
            margin-bottom: 10px;
        }
        .scenarios-list {
            margin-left: 12px;
        }
        .scenario {
            font-size: 12px;
            color: #cbd5e1;
            padding: 4px 0;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .scenario.passed::before { content: "✅"; }
        .scenario.failed::before { content: "❌"; }
        .scenario.skipped::before { content: "⊘"; }
        .error-msg {
            font-size: 11px;
            color: #f87171;
            margin-top: 6px;
            padding: 6px 8px;
            background: rgba(248,113,113,0.08);
            border-left: 2px solid #f87171;
            border-radius: 2px;
            font-family: monospace;
        }
        .footer {
            text-align: center;
            margin-top: 32px;
            font-size: 11px;
            color: #475569;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="title">🔭 Test Execution Report</div>
            <div class="timestamp">Generated: ${new Date().toLocaleString()}</div>
        </div>

        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value">${metrics.totalScenarios}</div>
                <div class="metric-label">Total Scenarios</div>
            </div>
            <div class="metric-card pass">
                <div class="metric-value">${metrics.passedScenarios}</div>
                <div class="metric-label">Passed</div>
            </div>
            <div class="metric-card fail">
                <div class="metric-value">${metrics.failedScenarios}</div>
                <div class="metric-label">Failed</div>
            </div>
            <div class="metric-card skip">
                <div class="metric-value">${metrics.skippedScenarios}</div>
                <div class="metric-label">Skipped</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${metrics.passRate.toFixed(1)}%</div>
                <div class="metric-label">Pass Rate</div>
            </div>
        </div>

        <div class="features-section">
            <div class="section-header">📋 Features & Scenarios</div>
            ${generateFeatureBlocks(testResults)}
        </div>

        <div class="footer">
            <p>Test Observability Dashboard • Powered by Orchestrator Platform</p>
            <p style="margin-top: 8px; font-size: 10px; color: #334155;">
                For more detailed analysis, use the MCP tools in Kiro IDE
            </p>
        </div>
    </div>
</body>
</html>`;

    return html;
}

// Calculate test metrics
function calculateMetrics(testResults) {
    let totalScenarios = 0;
    let passedScenarios = 0;
    let failedScenarios = 0;
    let skippedScenarios = 0;

    testResults.forEach((feature) => {
        if (feature.elements) {
            feature.elements.forEach((scenario) => {
                totalScenarios++;
                const scenarioStatus = getScenarioStatus(scenario);

                if (scenarioStatus === 'passed') passedScenarios++;
                else if (scenarioStatus === 'failed') failedScenarios++;
                else if (scenarioStatus === 'skipped') skippedScenarios++;
            });
        }
    });

    const passRate = totalScenarios > 0 ? (passedScenarios / totalScenarios) * 100 : 0;

    return {
        totalScenarios,
        passedScenarios,
        failedScenarios,
        skippedScenarios,
        passRate,
    };
}

// Generate feature HTML blocks
function generateFeatureBlocks(testResults) {
    return testResults
        .map((feature) => {
            const scenarios = (feature.elements || [])
                .map((scenario) => {
                    const status = getScenarioStatus(scenario);
                    const errorMsg = getScenarioError(scenario);
                    return `
            <div class="scenario ${status}">
                <span>${scenario.name}</span>
                ${errorMsg ? `<div class="error-msg">${escapeHtml(errorMsg)}</div>` : ''}
            </div>`;
                })
                .join('');

            return `
        <div class="feature-block">
            <div class="feature-name">📄 ${escapeHtml(feature.name)}</div>
            <div class="scenarios-list">
                ${scenarios}
            </div>
        </div>`;
        })
        .join('');
}

// Get scenario status from steps
function getScenarioStatus(scenario) {
    if (!scenario.steps) return 'unknown';

    let hasFailure = false;
    let hasSkipped = false;

    for (const step of scenario.steps) {
        if (step.result?.status === 'failed') hasFailure = true;
        if (step.result?.status === 'skipped') hasSkipped = true;
    }

    if (hasFailure) return 'failed';
    if (hasSkipped && !hasFailure) return 'skipped';
    return 'passed';
}

// Get error message from scenario
function getScenarioError(scenario) {
    if (!scenario.steps) return '';

    for (const step of scenario.steps) {
        if (step.result?.error_message) {
            return step.result.error_message;
        }
    }

    return '';
}

// Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.length === 0) {
        console.log(`
Test Observability Dashboard Generator

Usage:
  node generate-dashboard.js <resultsPath> [options]

Options:
  --format <format>   Format: cucumber (default) or junit
  --output <path>     Output file path (default: ../dashboard/cucumber-dashboard.html)
  --help              Show this help message

Examples:
  node generate-dashboard.js ../data/sample-cucumber-results.json
  node generate-dashboard.js ../data/junit-results.xml --format junit
  node generate-dashboard.js ../data/results.json --output ./report.html
        `);
        process.exit(0);
    }

    try {
        const options = parseArgs(args);

        if (!options.resultsPath) {
            throw new Error('Results path is required. Use --help for usage info.');
        }

        // Parse results
        const testResults = await parseResults(options.resultsPath, options.format);
        console.log(`✅ Parsed ${testResults.length} features`);

        // Generate dashboard
        const html = generateDashboard(testResults);

        // Write output
        const outputPath = path.resolve(options.output);
        const outputDir = path.dirname(outputPath);

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        fs.writeFileSync(outputPath, html);
        console.log(`✅ Dashboard generated: ${outputPath}`);
        console.log(`🎉 Success! Open in browser to view the report.`);

    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
}

// Execute
if (require.main === module) {
    main().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = { parseResults, generateDashboard };
