import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as winston from 'winston';
import { createLogger } from './logger';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Mask a secret token.
 */
function maskToken(token?: string | null): string {
  // Always fully mask tokens to avoid exposing any characters
  return '***MASKED***';
}

/**
 * Validate that required environment variables are present.
 * Throws an Error with a helpful message when missing.
 */
function validateEnvVars(required: string[]): void {
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

/**
 * Ensure URL is HTTP/HTTPS and normalized (adds trailing slash if needed).
 */
function ensureHttpsUrl(raw: string): string {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new Error('URL must use http or https');
    }
    let out = parsed.toString();
    if (!out.endsWith('/')) out = out + '/';
    return out;
  } catch (e) {
    throw new Error(`Invalid JIRA_BASE_URL: ${raw}`);
  }
}

/**
 * Read properties file and get value
 */
function getProperty(propKey: string): string {
  const propsPath = path.join(__dirname, '../Jira_Connector/config/jira.properties');
  const content = fs.readFileSync(propsPath, 'utf-8');
  
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith(propKey + '=')) {
      return trimmed.split('=')[1].trim();
    }
  }
  
  throw new Error(`Property ${propKey} not found`);
}

/**
 * Get story configuration from jira.story.json using dynamic story name
 */
function getStoryFromCredentials(): any {
  const storyName = getProperty('StoryName'); // Get dynamic story name from properties

  const idxMatch = storyName.match(/\d+/);
  let prefix = '';
  if (idxMatch) {
    prefix = `JIRA_STORY${idxMatch[0]}`;
  } else {
    prefix = storyName.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  }

  const scrumNumber = process.env[`${prefix}_SCRUM_NUMBER`];
  const epic = process.env[`${prefix}_EPIC`];
  const storyNumber = process.env[`${prefix}_STORY`] || process.env[`${prefix}_STORY_NUMBER`];

  if (!storyNumber) {
    throw new Error(`Story information for "${storyName}" not found in environment variables (${prefix}_STORY)`);
  }

  return {
    storyName,
    scrumNumber: scrumNumber || '',
    epic: epic || '',
    storyNumber
  };
}

/**
 * Get Jira connection details from jira.cred.json and jira.story.json
 */
function getJiraConnection(): any {
  // Ensure required env vars exist
  validateEnvVars(['JIRA_BASE_URL', 'JIRA_EMAIL', 'JIRA_API_TOKEN']);

  const rawBase = process.env.JIRA_BASE_URL as string;
  const baseUrl = ensureHttpsUrl(rawBase);
  const email = process.env.JIRA_EMAIL as string;
  const apiToken = process.env.JIRA_API_TOKEN as string;

  const basicAuth = Buffer.from(`${email}:${apiToken}`).toString('base64');
  const basicAuthMasked = maskToken(basicAuth);

  // Do not expose raw secrets. Provide masked value and a getter for internal use.
  return {
    baseUrl,
    email,
    basicAuthMasked,
    // getAuthHeader returns the raw base64 auth token (no "Basic " prefix).
    getAuthHeader: () => basicAuth
  };
}

/**
 * Fetch story description from Jira board
 */
export async function getStoryDescription(): Promise<any> {
  const logger = createLogger('story-connector');
  
  try {
    const desiredStory = getStoryFromCredentials();
    const jira = getJiraConnection();

    console.log(`\n📋 Story Information (configured from .env):`);
    logger.info(`📋 Story Information (configured from .env):`);
    console.log(`   Story Name: ${desiredStory.storyName}`);
    logger.info(`   Story Name: ${desiredStory.storyName}`);
    console.log(`   Scrum Number: ${desiredStory.scrumNumber}`);
    logger.info(`   Scrum Number: ${desiredStory.scrumNumber}`);
    console.log(`   Epic: ${desiredStory.epic}`);
    logger.info(`   Epic: ${desiredStory.epic}`);
    console.log(`   Story Number: ${desiredStory.storyNumber}`);
    logger.info(`   Story Number: ${desiredStory.storyNumber}`);
    console.log(`\n✓ Using story from .env file (STRICT MODE - NO FALLBACK)\n`);
    logger.info(`✓ Using story from .env file (STRICT MODE - NO FALLBACK)`);

    // Validate API token length (presence already validated by guardrails)
    const apiTokenRaw = process.env.JIRA_API_TOKEN as string | undefined;
    if (!apiTokenRaw || apiTokenRaw.length < 20) {
      throw new Error('Invalid API token: Token is too short or missing. Please check JIRA_EMAIL/JIRA_API_TOKEN in .env');
    }

    // Use ONLY the configured story from .env - NO FALLBACK
    // This ensures the agent picks exactly what is specified in .env
    const description = await fetchFromJira(jira.baseUrl, desiredStory.storyNumber, jira.getAuthHeader(), logger);
    return {
      ...desiredStory,
      description,
      jiraUrl: `${jira.baseUrl}/browse/${desiredStory.storyNumber}`
    };
  } catch (error) {
    console.error(`Error: ${error}`);
    const logger = createLogger('story-connector');
    logger.error(`Error: ${error}`);
    throw error;
  }
}

/**
 * Fetch story details from Jira API
 */
function fetchFromJira(baseUrl: string, storyKey: string, basicAuth: string, logger?: winston.Logger): Promise<string> {
  return new Promise((resolve, reject) => {
    // Use REST API v2 /issue endpoint
    const url = new URL(`${baseUrl}/rest/api/2/issue/${storyKey}`);
    
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000  // 30 second timeout
    };

    console.log(`\n🔗 Fetching from: ${url.toString()}`);
    if (logger) logger.info(`🔗 Fetching from: ${url.toString()}`);
      const maskedAuth = maskToken(basicAuth);
      console.log(`🔐 Auth: ${maskedAuth}`);
      if (logger) logger.info(`🔐 Auth: ${maskedAuth}`);

    const req = https.request(options, (res) => {
      let data = '';
      
      console.log(`📊 Response Status: ${res.statusCode}`);
      if (logger) logger.info(`📊 Response Status: ${res.statusCode}`);
      
      res.on('data', chunk => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const response = JSON.parse(data);
            
            // REST API v2 format
            const description = response.fields?.description || 'No description available';
            
            console.log(`✅ Description fetched successfully`);
            if (logger) logger.info(`✅ Description fetched successfully`);
            resolve(description);
          } else {
            const response = JSON.parse(data);
            console.log(`⚠️  Status: ${res.statusCode}`);
            if (logger) logger.warn(`⚠️  Status: ${res.statusCode}`);
            const errorMsg = response.errorMessages?.[0] || 'Unknown error';
            console.log(`Error: ${errorMsg}`);
            if (logger) logger.error(`Error: ${errorMsg}`);
            reject(new Error(`Jira API error (${res.statusCode}): ${errorMsg}`));
          }
        } catch (e) {
          console.log(`❌ Parse error: ${e}`);
          if (logger) logger.error(`❌ Parse error: ${e}`);
          reject(new Error(`Failed to parse Jira response: ${e}`));
        }
      });
    });

    req.on('timeout', () => {
      console.warn('❌ Request timeout');
      if (logger) logger.error('❌ Request timeout');
      req.destroy();
      reject(new Error('Connection timeout: Request took too long'));
    });

    req.on('error', (error) => {
      console.warn('❌ Connection error:', error.message);
      if (logger) logger.error(`❌ Connection error: ${error.message}`);
      reject(new Error(`Connection failed: ${error.message}`));
    });

    req.end();
  });
}

/**
 * Main function - get all story details
 */
export async function getFullStoryDetails(): Promise<any> {
  return await getStoryDescription();
}

// Export helper functions
export { getStoryFromCredentials, getJiraConnection };
