'use strict';

/**
 * Mobile test configuration for WebdriverIO + pCloudy Appium.
 * Credentials are read from environment variables (same values as the
 * mobile-automation MCP server in .kiro/settings/mcp.json).
 */
const getConfig = async () => ({
  hostname: 'device.pcloudy.com',
  port: 443,
  path: '/appiumcloud/wd/hub',
  protocol: 'https',
  logLevel: 'warn',
  connectionRetryCount: 0,
  capabilities: {
    platformName: 'Android',
    'appium:deviceName':       process.env.PCLOUDY_DEVICE_NAME      || 'SAMSUNG_GalaxyM53_Android_16.0.0_c47c5',
    'appium:automationName':   'UiAutomator2',
    'appium:noReset':          false,
    'appium:appPackage':       process.env.PCLOUDY_APP_PACKAGE       || 'com.swaglabsmobileapp',
    'appium:appActivity':      process.env.PCLOUDY_APP_ACTIVITY      || 'com.swaglabsmobileapp.MainActivity',
    'pCloudy:options': {
      pCloudy_Username:        process.env.PCLOUDY_USERNAME          || '',
      pCloudy_ApiKey:          process.env.PCLOUDY_API_KEY           || '',
      pCloudy_ApplicationName: process.env.PCLOUDY_APPLICATION_NAME  || 'swaglab.apk',
      pCloudy_WildCardSearch:  'false',
      pCloudy_EnableVideo:     true,
      pCloudy_EnablePerformanceData: true,
    },
  },
});

module.exports = { getConfig };
