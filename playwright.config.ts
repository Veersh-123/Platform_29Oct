import { defineConfig, devices } from '@playwright/test';

const slowMo = Number(process.env.PLAYWRIGHT_SLOW_MO || 0);
if (!Number.isInteger(slowMo) || slowMo < 0 || slowMo > 2000) {
  throw new Error('PLAYWRIGHT_SLOW_MO must be an integer between 0 and 2000 milliseconds.');
}
const retries = Number(process.env.PLAYWRIGHT_RETRIES ?? 2);
if (!Number.isInteger(retries) || retries < 0 || retries > 10) {
  throw new Error('PLAYWRIGHT_RETRIES must be an integer between 0 and 10.');
}

export default defineConfig({
  fullyParallel : false,
  testDir: './tests',
  timeout: 120_000,
  retries,
  workers: 1, // 1 worker in headed mode for debugging and self-healing verification

  reporter: [
    ['list'],
    ['html', { outputFolder: process.env.PLAYWRIGHT_HTML_OUTPUT_DIR || 'playwright-report', open: 'never' }],
  ],

  use: {
    headless: false, // HEADED MODE - see browser interactions and self-healing in action
    viewport: { width: 1280, height: 720 },
    screenshot: 'on',
    video: 'on',
    trace: 'on-first-retry', // Capture trace on first retry for diagnostics
    actionTimeout: 30_000,
    navigationTimeout: 90_000,
    launchOptions: { slowMo },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  outputDir: 'test-results',
});
