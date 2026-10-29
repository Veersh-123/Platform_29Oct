import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import FormData from 'form-data';
import * as winston from 'winston';
import { createLogger } from './logger';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Read properties file and get value
 */
function getProperty(propKey: string): string {
  const propsPath = path.join(__dirname, './config/jira.properties');
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
  const storyName = getProperty('StoryName');

  // Support environment variables for stories. If StoryName is like 'JiraStory1',
  // read JIRA_STORY1_SCRUM_NUMBER, JIRA_STORY1_EPIC, JIRA_STORY1_STORY
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
  // Read Jira connection details from environment variables
  const baseUrl = process.env.JIRA_BASE_URL;
  const email = process.env.JIRA_EMAIL;
  const apiToken = process.env.JIRA_API_TOKEN;

  if (!baseUrl || !email || !apiToken) {
    throw new Error('Missing JIRA connection environment variables (JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN)');
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
 * Upload file to Jira issue using FormData
 */
function uploadToJira(baseUrl: string, storyKey: string, basicAuth: string, filePath: string, logger: winston.Logger): Promise<any> {
  return new Promise((resolve, reject) => {
    const fileName = path.basename(filePath);
    const fileStream = fs.createReadStream(filePath);

    const form = new FormData();
    form.append('file', fileStream);

    // Use REST API v2 /issue/{key}/attachments endpoint
    const url = new URL(`${baseUrl}/rest/api/2/issue/${storyKey}/attachments`);

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'X-Atlassian-Token': 'no-check',
        ...form.getHeaders()
      }
    };

    console.log(`\n📤 Uploading: ${fileName}`);
    logger.info(`📤 Uploading: ${fileName}`);
    console.log(`   to Story: ${storyKey}`);
    logger.info(`   to Story: ${storyKey}`);

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const response = JSON.parse(data);
            console.log(`✅ Successfully uploaded: ${fileName}`);
            logger.info(`✅ Successfully uploaded: ${fileName}`);
            resolve({
              fileName,
              status: 'success',
              response
            });
          } else {
            let errorMsg = 'Unknown error';
            try {
              const response = JSON.parse(data);
              errorMsg = response.errorMessages?.[0] || response.errors?.attachment || data || 'Unknown error';
            } catch {
              errorMsg = data || `HTTP ${res.statusCode}`;
            }
            console.log(`❌ Upload failed (${res.statusCode}): ${errorMsg}`);
            logger.error(`❌ Upload failed (${res.statusCode}): ${errorMsg}`);
            reject(new Error(`Failed to upload ${fileName}: ${errorMsg}`));
          }
        } catch (e) {
          console.log(`❌ Parse error: ${e}`);
          logger.error(`❌ Parse error: ${e}`);
          reject(new Error(`Failed to parse Jira response: ${e}`));
        }
      });
    });

    req.on('error', (e) => {
      console.error(`❌ Request error: ${e}`);
      logger.error(`❌ Request error: ${e}`);
      reject(e);
    });

    form.pipe(req);
  });
}

/**
 * Delete attachment from Jira issue
 */
function deleteAttachmentFromJira(baseUrl: string, attachmentId: string, basicAuth: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = new URL(`${baseUrl}/rest/api/2/attachment/${attachmentId}`);

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'DELETE',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'X-Atlassian-Token': 'no-check'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 204) {
          resolve();
        } else {
          reject(new Error(`Failed to delete attachment: ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * Get attachments from Jira issue
 */
function getAttachmentsFromJira(baseUrl: string, storyKey: string, basicAuth: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const url = new URL(`${baseUrl}/rest/api/2/issue/${storyKey}`);

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const response = JSON.parse(data);
            const attachments = response.fields?.attachment || [];
            resolve(attachments);
          } else {
            resolve([]);
          }
        } catch (e) {
          resolve([]);
        }
      });
    });

    req.on('error', () => resolve([]));
    req.end();
  });
}

/**
 * Main function to upload specs to Jira
 */
export async function uploadSpecsToJira(): Promise<void> {
  const logger = createLogger('upload-specs-to-jira');

  try {
    const story = getStoryFromCredentials();
    const jira = getJiraConnection();

    console.log('\n═══════════════════════════════════════════════════════════════');
    logger.info('═══════════════════════════════════════════════════════════════');
    console.log('📚 JIRA SPECS UPLOAD - FEATURE FILES & TEST DOCUMENTATION');
    logger.info('📚 JIRA SPECS UPLOAD - FEATURE FILES & TEST DOCUMENTATION');
    console.log('═══════════════════════════════════════════════════════════════');
    logger.info('═══════════════════════════════════════════════════════════════');

    console.log(`\n📋 Story Information:`);
    logger.info(`📋 Story Information:`);
    console.log(`   Story Name: ${story.storyName}`);
    logger.info(`   Story Name: ${story.storyName}`);
    console.log(`   Story Key: ${story.storyNumber}`);
    logger.info(`   Story Key: ${story.storyNumber}`);
    console.log(`   Epic: ${story.epic}`);
    logger.info(`   Epic: ${story.epic}`);
    console.log(`   Scrum: ${story.scrumNumber}`);
    logger.info(`   Scrum: ${story.scrumNumber}`);
    console.log(`   Jira URL: ${jira.baseUrl}/browse/${story.storyNumber}`);
    logger.info(`   Jira URL: ${jira.baseUrl}/browse/${story.storyNumber}`);

    // Files to upload from different directories (use dynamic story key)
    const featureFileName = `${story.storyNumber}.feature`;
    const planFileName = `${story.storyNumber}-TEST-PLAN.md`;
    const casesFileName = `${story.storyNumber}-TEST-CASES.md`;

    const filesToUpload = [
      { name: featureFileName, description: 'Feature File', dir: 'features' },
      { name: planFileName, description: 'Test Plan', dir: 'specs' },
      { name: casesFileName, description: 'Test Cases', dir: 'specs' }
    ];
    console.log(`\n🔍 Files to upload:`);
    logger.info(`🔍 Files to upload:`);
    filesToUpload.forEach((file, index) => {
      const sourceDir = path.join(__dirname, `../${file.dir}`);
      const filePath = path.join(sourceDir, file.name);
      const exists = fs.existsSync(filePath);
      const status = exists ? '✓' : '✗';
      console.log(`   ${index + 1}. ${file.name} (${file.description}) from ${file.dir}/ - ${status}`);
      logger.info(`   ${index + 1}. ${file.name} (${file.description}) from ${file.dir}/ - ${status}`);
    });

    // Get existing attachments
    console.log(`\n📥 Fetching existing attachments from Jira...`);
    logger.info(`📥 Fetching existing attachments from Jira...`);
    const existingAttachments = await getAttachmentsFromJira(jira.baseUrl, story.storyNumber, jira.basicAuth);

    console.log(`\n📋 Found ${existingAttachments.length} existing attachment(s)`);
    logger.info(`📋 Found ${existingAttachments.length} existing attachment(s)`);

    // Delete existing files if they exist
    console.log(`\n🗑️  Checking for existing files to replace...`);
    logger.info(`🗑️  Checking for existing files to replace...`);
    for (const file of filesToUpload) {
      const existingAttachment = existingAttachments.find(
        (att: any) => att.filename === file.name
      );

      if (existingAttachment) {
        console.log(`   ⟳ Removing old version of ${file.name} (ID: ${existingAttachment.id})`);
        logger.info(`   ⟳ Removing old version of ${file.name} (ID: ${existingAttachment.id})`);
        try {
          await deleteAttachmentFromJira(jira.baseUrl, existingAttachment.id, jira.basicAuth);
          console.log(`   ✅ Deleted: ${file.name}`);
          logger.info(`   ✅ Deleted: ${file.name}`);
        } catch (error) {
          console.warn(`   ⚠️  Could not delete ${file.name}: ${error}`);
          logger.warn(`   ⚠️  Could not delete ${file.name}: ${error}`);
        }
      }
    }

    // Upload new files
    console.log(`\n📤 Uploading files to Jira...`);
    logger.info(`📤 Uploading files to Jira...`);
    const uploadResults: any[] = [];

    for (const file of filesToUpload) {
      const sourceDir = path.join(__dirname, `../${file.dir}`);
      const filePath = path.join(sourceDir, file.name);

      if (!fs.existsSync(filePath)) {
        console.log(`\n⚠️  File not found: ${file.name} in ${file.dir}/`);
        logger.warn(`⚠️  File not found: ${file.name} in ${file.dir}/`);
        continue;
      }

      try {
        const result = await uploadToJira(jira.baseUrl, story.storyNumber, jira.basicAuth, filePath, logger);
        uploadResults.push(result);
      } catch (error) {
        console.log(`\n❌ Error uploading ${file.name}: ${error}`);
        logger.error(`❌ Error uploading ${file.name}: ${error}`);
        uploadResults.push({
          fileName: file.name,
          status: 'failed',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Summary
    console.log(`\n═══════════════════════════════════════════════════════════════`);
    logger.info(`═══════════════════════════════════════════════════════════════`);
    console.log('📊 UPLOAD SUMMARY');
    logger.info('📊 UPLOAD SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');
    logger.info('═══════════════════════════════════════════════════════════════');

    const successCount = uploadResults.filter(r => r.status === 'success').length;
    const failedCount = uploadResults.filter(r => r.status === 'failed').length;

    console.log(`\n✅ Successfully uploaded: ${successCount} file(s)`);
    logger.info(`✅ Successfully uploaded: ${successCount} file(s)`);
    console.log(`❌ Failed uploads: ${failedCount} file(s)`);
    logger.info(`❌ Failed uploads: ${failedCount} file(s)`);

    console.log(`\n📎 Jira Issue: ${story.storyNumber}`);
    logger.info(`📎 Jira Issue: ${story.storyNumber}`);
    console.log(`🔗 Link: ${jira.baseUrl}/browse/${story.storyNumber}`);
    logger.info(`🔗 Link: ${jira.baseUrl}/browse/${story.storyNumber}`);

    console.log(`\n═══════════════════════════════════════════════════════════════\n`);
    logger.info(`═══════════════════════════════════════════════════════════════`);

    if (failedCount > 0) {
      const errorMsg = `Upload completed with ${failedCount} failure(s)`;
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    console.log('✅ All files uploaded successfully!\n');
    logger.info('✅ All files uploaded successfully!');
  } catch (error) {
    console.error(`\n❌ Error: ${error}`);
    logger.error(`❌ Error: ${error}`);
    throw error;
  }
}

// Run if this is the main module
if (require.main === module) {
  uploadSpecsToJira()
    .then(() => {
      console.log('✅ Specs upload completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Specs upload failed:', error);
      process.exit(1);
    });
}
