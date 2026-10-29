export function loadConfig() {
    return {
        app: {
            logLevel: process.env.LOG_LEVEL || 'info',
            cucumberResultsPath: process.env.CUCUMBER_RESULTS_PATH || './data/sample-cucumber-results.json',
            junitResultsPath: process.env.JUNIT_RESULTS_PATH || './data/sample-mocha-junit-results.xml',
            dashboard: {
                title: process.env.DASHBOARD_TITLE || 'Test Automation Report',
                outputPath: process.env.DASHBOARD_OUTPUT_PATH || './output/cucumber-dashboard.html',
                logoUrl: process.env.LOGO_URL || '/assets/images/hexaware-logo.svg',
                generateAfterAnalysis: process.env.GENERATE_DASHBOARD !== 'false',
                autoOpen: process.env.AUTO_OPEN_DASHBOARD === 'true',
            },
        },
        ai: {
            baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
            model: process.env.OLLAMA_MODEL || 'mistral',
            timeout: parseInt(process.env.AI_TIMEOUT || '120000', 10),
        },
    };
}
export function validateConfig(config) {
    if (!config.app.logLevel) {
        throw new Error('LOG_LEVEL is not set');
    }
    if (!config.ai.baseUrl) {
        throw new Error('OLLAMA_BASE_URL is not set');
    }
    if (!config.ai.model) {
        throw new Error('OLLAMA_MODEL is not set');
    }
}
//# sourceMappingURL=app.config.js.map