/**
 * Upload Test Artifacts to Jira
 * Uploads test case specifications and test scripts to the Jira issue
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import FormData from 'form-data';
import * as dotenv from 'dotenv';
import * as winston from 'winston';
import { createLogger } from './logger';

dotenv.config();

const logger = createLogger('upload-test-artifacts');

interface JiraConnection {
  baseUrl: string;
  email: string;
  apiToken: string;
  basicAuth: string;
}

/**
 * Get Jira connection details from environment variables
 */
function getJiraConnection(): JiraConnection {
  const baseUrl = process.env.JIRA_BASE_URL;
  const email = process.env.JIRA_EMAIL;
  const apiToken = process.env.JIRA_API_TOKEN;

  if (!baseUrl || !email || !apiToken) {
    throw new Error('Missing JIRA connection environment variables');
  }

  const basicAuth = Buffer.from(`${email}:${apiToken}`).toString('base64');

  return {
    baseUrl,
    email,
    apiToken,
    basicAuth
  };
}

/**
 * Upload file to Jira
 */
function uploadToJira(
  baseUrl: string,
  storyKey: string,
  basicAuth: string,
  filePath: string,
  logger: winston.Logger
): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      reject(new Error(`File not found: ${filePath}`));
      return;
    }

    const fileName = path.basename(filePath);
    const fileStream = fs.createReadStream(filePath);

    const form = new FormData();
    form.append('file', fileStream);

    const url = new URL(`${baseUrl}/rest/api/2/issue/${storyKey}/attachments`);

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        ...form.getHeaders(),
        'Authorization': `Basic ${basicAuth}`,
        'X-Atlassian-Token': 'no-check'
      }
    };

    logger.info(`Uploading: ${fileName} to ${storyKey}`);

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          logger.info(`✅ Successfully uploaded: ${fileName}`);
          resolve(JSON.parse(data));
        } else {
          logger.error(`❌ Upload failed with status ${res.statusCode}`);
          reject(new Error(`Upload failed: ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      logger.error(`Upload error: ${error.message}`);
      reject(error);
    });

    form.pipe(req);
  });
}

/**
 * Main function to upload test artifacts
 */
async function uploadTestArtifacts(): Promise<void> {
  try {
    logger.info('Starting test artifacts upload...');

    // Get Jira connection details
    const jiraConnection = getJiraConnection();
    const storyKey = process.env.JIRA_STORY1_STORY || 'KAN-6';

    console.log(`\n📤 Uploading Test Artifacts for ${storyKey}\n`);

    // Define files to upload
    const filesToUpload = [
      {
        path: path.join(__dirname, '../specs/KAN-6-TEST-CASES.md'),
        description: 'Test Case Specification'
      },
      {
        path: path.join(__dirname, '../Test_Data/KAN-6-test-data.json'),
        description: 'Test Data'
      },
      {
        path: path.join(__dirname, '../tests/KAN-6/KAN-6-Script.spec.ts'),
        description: 'Playwright Test Script'
      }
    ];

    // Upload each file
    for (const file of filesToUpload) {
      try {
        if (fs.existsSync(file.path)) {
          console.log(`\n⏳ Uploading ${file.description}...`);
          await uploadToJira(
            jiraConnection.baseUrl,
            storyKey,
            jiraConnection.basicAuth,
            file.path,
            logger
          );
          console.log(`✅ ${file.description} uploaded successfully`);
        } else {
          console.log(`⚠️  File not found: ${file.path}`);
          logger.warn(`File not found: ${file.path}`);
        }
      } catch (error) {
        console.log(`❌ Failed to upload ${file.description}: ${error}`);
        logger.error(`Failed to upload ${file.description}: ${error}`);
      }
    }

    console.log(`\n✅ Test artifacts upload completed for ${storyKey}\n`);
    logger.info('Test artifacts upload completed');

    // Summary
    console.log('=== UPLOAD SUMMARY ===\n');
    console.log(`📋 Story: ${storyKey}`);
    console.log(`🔗 Jira URL: ${jiraConnection.baseUrl}/browse/${storyKey}`);
    console.log(`📁 Files Uploaded: ${filesToUpload.length}`);
    console.log('\nAttachments are now visible in the Jira issue.');

  } catch (error) {
    console.error('Error:', error);
    logger.error(`Error: ${error}`);
    process.exit(1);
  }
}

// Run the upload
uploadTestArtifacts();
