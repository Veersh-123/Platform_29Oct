import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as winston from 'winston';
import { createLogger } from './logger';
import { maskToken, validateEnvVars, ensureHttpsUrl } from './guardrails';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Read properties file and get value
 */
function getProperty(propKey: string): string {
  const propsPath = path.join(__dirname, './config/ado.properties');
  const content = fs.readFileSync(propsPath, 'utf-8');

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith(propKey + '=')) {
      return trimmed.split('=').slice(1).join('=').trim();
    }
  }

  throw new Error(`Property ${propKey} not found in ado.properties`);
}

/**
 * Get work item configuration from ado.properties + environment variables.
 * Env var pattern: ADO_STORY{n}_ID, ADO_STORY{n}_ITERATION, ADO_STORY{n}_AREA
 */
function getStoryFromCredentials(): any {
  const storyName = getProperty('StoryName');

  const idxMatch = storyName.match(/\d+/);
  let prefix = '';
  if (idxMatch) {
    prefix = `ADO_STORY${idxMatch[0]}`;
  } else {
    prefix = storyName.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  }

  const workItemId = process.env[`${prefix}_ID`];
  const iteration  = process.env[`${prefix}_ITERATION`] || '';
  const area       = process.env[`${prefix}_AREA`] || '';

  if (!workItemId) {
    throw new Error(
      `Work item information for "${storyName}" not found in environment variables (${prefix}_ID)`
    );
  }

  return { storyName, workItemId, iteration, area };
}

/**
 * Get ADO connection details from environment variables.
 * Required: ADO_ORG_URL, ADO_PROJECT, ADO_PAT
 */
function getAdoConnection(): any {
  validateEnvVars(['ADO_ORG_URL', 'ADO_PROJECT', 'ADO_PAT']);

  const baseUrl  = ensureHttpsUrl(process.env.ADO_ORG_URL as string);
  const project  = process.env.ADO_PROJECT as string;
  const pat      = process.env.ADO_PAT as string;

  // ADO uses Basic auth with empty username and PAT as password
  const basicAuth = Buffer.from(`:${pat}`).toString('base64');

  return {
    baseUrl,
    project,
    basicAuthMasked: maskToken(basicAuth),
    getAuthHeader: () => basicAuth,
  };
}

/**
 * Fetch a work item's description/acceptance criteria from ADO REST API.
 * Uses: GET {org}/{project}/_apis/wit/workitems/{id}?api-version=7.0
 */
function fetchFromAdo(
  baseUrl: string,
  project: string,
  workItemId: string,
  basicAuth: string,
  logger?: winston.Logger
): Promise<{ description: string; title: string; type: string; state: string; iterationPath: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(
      `${baseUrl}${encodeURIComponent(project)}/_apis/wit/workitems/${workItemId}?api-version=7.0`
    );

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    };

    console.log(`\n🔗 Fetching from ADO: ${url.toString()}`);
    if (logger) logger.info(`🔗 Fetching from ADO: ${url.toString()}`);
    console.log(`🔐 Auth: ${maskToken(basicAuth)}`);
    if (logger) logger.info(`🔐 Auth: ${maskToken(basicAuth)}`);

    const req = https.request(options, (res) => {
      let data = '';

      console.log(`📊 Response Status: ${res.statusCode}`);
      if (logger) logger.info(`📊 Response Status: ${res.statusCode}`);

      res.on('data', (chunk) => { data += chunk; });

      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const response = JSON.parse(data);
            const fields = response.fields || {};

            // ADO stores description in System.Description (HTML)
            // Acceptance criteria in Microsoft.VSTS.Common.AcceptanceCriteria
            const rawDescription =
              fields['System.Description'] ||
              fields['Microsoft.VSTS.Common.AcceptanceCriteria'] ||
              'No description available';

            // Strip basic HTML tags for clean text
            const description = rawDescription.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

            console.log('✅ Work item fetched successfully');
            if (logger) logger.info('✅ Work item fetched successfully');

            resolve({
              description,
              title:         fields['System.Title'] || '',
              type:          fields['System.WorkItemType'] || '',
              state:         fields['System.State'] || '',
              iterationPath: fields['System.IterationPath'] || '',
            });
          } else {
            let errorMsg = `HTTP ${res.statusCode}`;
            try {
              const response = JSON.parse(data);
              errorMsg = response.message || response.errorMessages?.[0] || errorMsg;
            } catch { /* ignore parse error */ }

            console.log(`⚠️  Status: ${res.statusCode} — ${errorMsg}`);
            if (logger) logger.warn(`⚠️  ADO API error: ${errorMsg}`);
            reject(new Error(`ADO API error (${res.statusCode}): ${errorMsg}`));
          }
        } catch (e) {
          console.log(`❌ Parse error: ${e}`);
          if (logger) logger.error(`❌ Parse error: ${e}`);
          reject(new Error(`Failed to parse ADO response: ${e}`));
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
 * Fetch work item description from ADO, with fallback to other configured stories.
 */
export async function getStoryDescription(): Promise<any> {
  const logger = createLogger('ado-story-connector');

  try {
    const desiredStory = getStoryFromCredentials();
    const ado = getAdoConnection();

    console.log(`\n📋 ADO Work Item (configured):`);
    logger.info('📋 ADO Work Item (configured):');
    console.log(`   Story Name: ${desiredStory.storyName}`);
    logger.info(`   Story Name: ${desiredStory.storyName}`);
    console.log(`   Work Item ID: ${desiredStory.workItemId}`);
    logger.info(`   Work Item ID: ${desiredStory.workItemId}`);
    console.log(`   Iteration: ${desiredStory.iteration}`);
    logger.info(`   Iteration: ${desiredStory.iteration}`);

    const patRaw = process.env.ADO_PAT as string | undefined;
    if (!patRaw || patRaw.length < 20) {
      throw new Error('Invalid PAT: Token is too short or missing. Please check ADO_PAT in .env');
    }

    try {
      const workItemData = await fetchFromAdo(
        ado.baseUrl,
        ado.project,
        desiredStory.workItemId,
        ado.getAuthHeader(),
        logger
      );

      return {
        ...desiredStory,
        ...workItemData,
        storyNumber: desiredStory.workItemId,
        adoUrl: `${ado.baseUrl}${encodeURIComponent(ado.project)}/_workitems/edit/${desiredStory.workItemId}`,
      };
    } catch (firstError) {
      console.warn(
        `Configured work item '${desiredStory.workItemId}' failed: ${firstError}. Attempting fallback...`
      );
      if (logger) logger.warn(`Work item '${desiredStory.workItemId}' failed: ${firstError}. Attempting fallback...`);

      // Look for fallback stories in environment: ADO_STORY{n}_ID
      const candidates: Array<{ key: string; workItemId: string }> = [];
      for (const envKey of Object.keys(process.env)) {
        const m = envKey.match(/^ADO_STORY(\d+)_ID$/);
        if (m) {
          const candidateId = process.env[envKey] || '';
          if (candidateId && candidateId !== desiredStory.workItemId) {
            candidates.push({ key: `ADO_STORY${m[1]}`, workItemId: candidateId });
          }
        }
      }

      for (const c of candidates) {
        try {
          console.log(`Trying alternative work item: ${c.workItemId}`);
          if (logger) logger.info(`Trying alternative work item: ${c.workItemId}`);
          const workItemData = await fetchFromAdo(
            ado.baseUrl,
            ado.project,
            c.workItemId,
            ado.getAuthHeader(),
            logger
          );
          return {
            storyName: c.key,
            workItemId: c.workItemId,
            storyNumber: c.workItemId,
            iteration: process.env[`${c.key}_ITERATION`] || '',
            area: process.env[`${c.key}_AREA`] || '',
            ...workItemData,
            adoUrl: `${ado.baseUrl}${encodeURIComponent(ado.project)}/_workitems/edit/${c.workItemId}`,
          };
        } catch (e) {
          if (logger) logger.warn(`Candidate ${c.workItemId} failed: ${e}`);
        }
      }

      throw firstError;
    }
  } catch (error) {
    console.error(`Error: ${error}`);
    const logger = createLogger('ado-story-connector');
    logger.error(`Error: ${error}`);
    throw error;
  }
}

/**
 * Main function — get all work item details from ADO
 */
export async function getFullStoryDetails(): Promise<any> {
  return await getStoryDescription();
}

export { getStoryFromCredentials, getAdoConnection };
