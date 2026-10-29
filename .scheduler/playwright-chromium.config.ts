import baseConfig from '../playwright.config';
import { defineConfig, devices } from '@playwright/test';
const baseProject = baseConfig.projects?.[0] || {};
export default defineConfig({ ...baseConfig, testDir: "C:\\Users\\PC\\Downloads\\Platform-2-main - Copy27Oct0719pm\\Platform-2-main - Copy27Oct0719pm\\tests", outputDir: "C:\\Users\\PC\\Downloads\\Platform-2-main - Copy27Oct0719pm\\Platform-2-main - Copy27Oct0719pm\\test-results", projects: [{ ...baseProject, name: 'scheduled', use: { ...(baseProject.use || {}), ...devices["Desktop Chrome"], browserName: "chromium" } }] });
