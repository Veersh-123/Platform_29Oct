#!/usr/bin/env node

/**
 * Test Observability Integration Verification Script
 * 
 * This script verifies that the observability module is properly integrated
 * and all components are working correctly.
 * 
 * Checks:
 * - File structure
 * - Dependencies
 * - MCP server build
 * - Configuration files
 * - Sample data
 * - Dashboard generation
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const COLORS = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m',
};

function log(type, message) {
    switch (type) {
        case 'success':
            console.log(`${COLORS.green}✅${COLORS.reset} ${message}`);
            break;
        case 'error':
            console.log(`${COLORS.red}❌${COLORS.reset} ${message}`);
            break;
        case 'warning':
            console.log(`${COLORS.yellow}⚠️${COLORS.reset}  ${message}`);
            break;
        case 'info':
            console.log(`${COLORS.cyan}ℹ️${COLORS.reset}  ${message}`);
            break;
        case 'detail':
            console.log(`${COLORS.gray}   ${message}${COLORS.reset}`);
            break;
        case 'header':
            console.log(`\n${COLORS.cyan}${'─'.repeat(60)}${COLORS.reset}`);
            console.log(`${COLORS.cyan}${message}${COLORS.reset}`);
            console.log(`${COLORS.cyan}${'─'.repeat(60)}${COLORS.reset}\n`);
            break;
    }
}

function fileExists(filePath) {
    return fs.existsSync(filePath);
}

function dirExists(dirPath) {
    return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
}

function runCommand(cmd, cwd = process.cwd()) {
    try {
        const result = execSync(cmd, { 
            cwd, 
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe']
        });
        return { success: true, output: result.trim() };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Verification checks
const checks = [];

function addCheck(name, condition, details = '') {
    checks.push({ name, condition, details });
    if (condition) {
        log('success', name);
        if (details) log('detail', details);
    } else {
        log('error', name);
        if (details) log('detail', details);
    }
}

// Main verification
async function verify() {
    log('header', '🔍 Test Observability Integration Verification');

    const rootDir = path.resolve(__dirname, '..');
    const mcpDir = path.join(rootDir, 'mcp-server');
    const mcpDistDir = path.join(mcpDir, 'dist');
    const mcpSrcDir = path.join(mcpDir, 'src');
    const dataDir = path.join(rootDir, 'data');
    const dashboardDir = path.join(rootDir, 'dashboard');
    const scriptsDir = path.join(rootDir, 'scripts');
    const kiroSettingsDir = path.resolve(rootDir, '..', '.kiro', 'settings');

    let passedChecks = 0;
    let failedChecks = 0;

    // ── Directory Structure Checks ──
    log('header', '📁 Directory Structure');
    
    const dirChecks = [
        { path: mcpDir, name: 'MCP Server Directory' },
        { path: mcpSrcDir, name: 'MCP Source Code' },
        { path: dataDir, name: 'Sample Data Directory' },
        { path: dashboardDir, name: 'Dashboard Directory' },
        { path: scriptsDir, name: 'Scripts Directory' },
        { path: kiroSettingsDir, name: 'Kiro Settings Directory' },
    ];

    dirChecks.forEach(({ path: dirPath, name }) => {
        const exists = dirExists(dirPath);
        addCheck(
            name,
            exists,
            exists ? `Found at: ${dirPath}` : `Missing at: ${dirPath}`
        );
        if (exists) passedChecks++;
        else failedChecks++;
    });

    // ── File Checks ──
    log('header', '📄 Configuration Files');

    const fileChecks = [
        { path: path.join(mcpDir, 'package.json'), name: 'MCP package.json' },
        { path: path.join(mcpDir, 'tsconfig.json'), name: 'MCP TypeScript Config' },
        { path: path.join(mcpDir, '.env.example'), name: 'MCP .env.example' },
        { path: path.join(rootDir, 'SETUP.md'), name: 'Setup Guide' },
        { path: path.join(rootDir, '..', 'OBSERVABILITY_INTEGRATION_GUIDE.md'), name: 'Integration Guide' },
        { path: path.join(rootDir, '..', 'OBSERVABILITY_QUICK_REFERENCE.md'), name: 'Quick Reference' },
        { path: path.join(rootDir, '..', '.kiro', 'settings', 'mcp.json'), name: 'MCP Configuration (mcp.json)' },
        { path: path.join(dataDir, 'sample-cucumber-results.json'), name: 'Sample Test Data' },
        { path: path.join(dashboardDir, 'test-observability-loader.html'), name: 'Dashboard Loader' },
        { path: path.join(scriptsDir, 'generate-dashboard.js'), name: 'Dashboard Generator Script' },
    ];

    fileChecks.forEach(({ path: filePath, name }) => {
        const exists = fileExists(filePath);
        addCheck(
            name,
            exists,
            exists ? `Found at: ${filePath}` : `Missing at: ${filePath}`
        );
        if (exists) passedChecks++;
        else failedChecks++;
    });

    // ── MCP Server Build Checks ──
    log('header', '🔨 MCP Server Build');

    // Check if dist directory exists and has files
    const distExists = dirExists(mcpDistDir);
    addCheck(
        'MCP Compiled Directory',
        distExists,
        distExists ? 'dist/ directory found' : 'dist/ directory not found - needs build'
    );

    if (distExists) {
        passedChecks++;
        const files = fs.readdirSync(mcpDistDir);
        const hasIndexJs = files.includes('index.js');
        addCheck(
            'MCP index.js Exists',
            hasIndexJs,
            hasIndexJs ? `Found MCP entry point: ${mcpDistDir}/index.js` : 'Missing index.js'
        );
        if (hasIndexJs) passedChecks++;
        else failedChecks++;
    } else {
        failedChecks++;
    }

    // ── Dependencies Checks ──
    log('header', '📦 Dependencies');

    const mcpPackageJson = path.join(mcpDir, 'package.json');
    if (fileExists(mcpPackageJson)) {
        try {
            const mcpPkg = JSON.parse(fs.readFileSync(mcpPackageJson, 'utf-8'));
            
            const requiredDeps = [
                '@modelcontextprotocol/sdk',
                'axios',
                'dotenv',
                'openai',
                'handlebars',
            ];

            const allDepsPresent = requiredDeps.every(dep => 
                mcpPkg.dependencies && mcpPkg.dependencies[dep]
            );

            addCheck(
                'Required MCP Dependencies',
                allDepsPresent,
                allDepsPresent 
                    ? `All required dependencies found`
                    : `Some dependencies missing`
            );
            if (allDepsPresent) passedChecks++;
            else failedChecks++;

            // Check individual deps
            requiredDeps.forEach(dep => {
                const hasDep = mcpPkg.dependencies && mcpPkg.dependencies[dep];
                if (hasDep) {
                    log('detail', `✓ ${dep}: ${mcpPkg.dependencies[dep]}`);
                } else {
                    log('detail', `✗ ${dep}: MISSING`);
                }
            });
        } catch (error) {
            log('error', `Failed to parse package.json: ${error.message}`);
            failedChecks++;
        }
    }

    // ── Configuration Validation ──
    log('header', '⚙️  Configuration Validation');

    const mpcJsonPath = path.join(kiroSettingsDir, 'mcp.json');
    if (fileExists(mpcJsonPath)) {
        try {
            const mpcConfig = JSON.parse(fs.readFileSync(mpcJsonPath, 'utf-8'));
            
            const hasServer = mpcConfig.mcpServers && mpcConfig.mcpServers['test-analyzer'];
            addCheck(
                'MCP Configuration (mcp.json)',
                hasServer,
                hasServer ? 'Valid MCP configuration found' : 'Invalid or missing MCP server config'
            );
            if (hasServer) passedChecks++;
            else failedChecks++;

            if (hasServer) {
                const serverConfig = mpcConfig.mcpServers['test-analyzer'];
                log('detail', `Command: ${serverConfig.command}`);
                log('detail', `Args: ${serverConfig.args?.[0] || 'N/A'}`);
                log('detail', `Ollama URL: ${serverConfig.env?.OLLAMA_BASE_URL || 'Not set'}`);
                log('detail', `Model: ${serverConfig.env?.OLLAMA_MODEL || 'Not set'}`);
            }
        } catch (error) {
            log('error', `Failed to parse mcp.json: ${error.message}`);
            failedChecks++;
        }
    } else {
        addCheck(
            'MCP Configuration (mcp.json)',
            false,
            `Not found at: ${mpcJsonPath}`
        );
        failedChecks++;
    }

    // ── Sample Data Validation ──
    log('header', '📊 Sample Data Validation');

    const sampleDataPath = path.join(dataDir, 'sample-cucumber-results.json');
    if (fileExists(sampleDataPath)) {
        try {
            const sampleData = JSON.parse(fs.readFileSync(sampleDataPath, 'utf-8'));
            const isArray = Array.isArray(sampleData);
            addCheck(
                'Sample Test Data Format',
                isArray && sampleData.length > 0,
                isArray 
                    ? `Valid JSON array with ${sampleData.length} features`
                    : 'Invalid format'
            );
            if (isArray && sampleData.length > 0) {
                passedChecks++;
                let totalScenarios = 0;
                sampleData.forEach(feature => {
                    totalScenarios += (feature.elements || []).length;
                });
                log('detail', `Total scenarios: ${totalScenarios}`);
            } else {
                failedChecks++;
            }
        } catch (error) {
            log('error', `Failed to parse sample data: ${error.message}`);
            failedChecks++;
        }
    } else {
        addCheck(
            'Sample Test Data',
            false,
            `Not found at: ${sampleDataPath}`
        );
        failedChecks++;
    }

    // ── Dashboard Generation Test ──
    log('header', '🎨 Dashboard Generation');

    const generatorPath = path.join(scriptsDir, 'generate-dashboard.js');
    if (fileExists(generatorPath)) {
        try {
            // Test dashboard generation with sample data
            const result = runCommand(
                `node generate-dashboard.js ../data/sample-cucumber-results.json --output ../dashboard/test-report.html`,
                scriptsDir
            );
            
            const generatedPath = path.join(dashboardDir, 'test-report.html');
            const dashboardGenerated = result.success && fileExists(generatedPath);
            
            addCheck(
                'Dashboard Generation',
                dashboardGenerated,
                dashboardGenerated 
                    ? 'Successfully generated test dashboard'
                    : `Failed: ${result.error || 'Dashboard file not created'}`
            );
            if (dashboardGenerated) {
                passedChecks++;
                const fileSize = fs.statSync(generatedPath).size;
                log('detail', `Generated: ${generatedPath} (${(fileSize / 1024).toFixed(2)} KB)`);
            } else {
                failedChecks++;
            }
        } catch (error) {
            log('error', `Dashboard generation error: ${error.message}`);
            failedChecks++;
        }
    }

    // ── Summary ──
    log('header', '📈 Verification Summary');

    const totalChecks = passedChecks + failedChecks;
    const passPercentage = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;

    console.log(`
${COLORS.cyan}Total Checks:${COLORS.reset} ${totalChecks}
${COLORS.green}Passed:${COLORS.reset}      ${passedChecks}
${COLORS.red}Failed:${COLORS.reset}      ${failedChecks}
${COLORS.yellow}Success Rate:${COLORS.reset} ${passPercentage}%
    `);

    if (failedChecks === 0) {
        log('success', 'Integration verification complete! All checks passed.');
        console.log(`
${COLORS.green}🎉 Integration is ready for use!${COLORS.reset}

Next steps:
  1. Build MCP server if not already done:
     ${COLORS.cyan}npm run obs:build${COLORS.reset}
  
  2. Open Orchestrator Platform in Kiro IDE and reconnect MCP servers
  
  3. Test with sample data:
     ${COLORS.cyan}Use utility-check-ollama-connection${COLORS.reset}
  
  4. View Test Observability in frontend by clicking the card in Value Added Services
        `);
        return 0;
    } else {
        log('warning', `Integration verification found ${failedChecks} issue(s).`);
        console.log(`
${COLORS.yellow}Please address the following issues:${COLORS.reset}

  • Ensure all files are properly copied to the observability directory
  • Run: ${COLORS.cyan}npm install${COLORS.reset} in the project root
  • Build MCP server: ${COLORS.cyan}npm run obs:build${COLORS.reset}
  • Check that Ollama is running: ${COLORS.cyan}ollama serve${COLORS.reset}
  
For detailed setup instructions, see: ${COLORS.cyan}observability/SETUP.md${COLORS.reset}
        `);
        return 1;
    }
}

// Execute verification
verify().then(code => process.exit(code)).catch(error => {
    console.error('Verification error:', error);
    process.exit(1);
});
