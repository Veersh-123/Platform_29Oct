#!/usr/bin/env node
/**
 * Upload Test Artifacts for AIR-1 to Jira
 * Uploads test case specifications and test scripts to the Jira issue
 * Story: AIR-1 (AirBnb Destination Search)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const FormData = require('form-data');
require('dotenv').config();

const storyKey = 'AIR-1';
const baseUrl = process.env.JIRA_BASE_URL;
const email = process.env.JIRA_EMAIL;
const apiToken = process.env.JIRA_API_TOKEN;

function validateConnection() {
  if (!baseUrl || !email || !apiToken) {
    throw new Error('Missing JIRA connection environment variables: JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN');
  }
  console.log(`\n✅ Jira Configuration Valid`);
  console.log(`   Base URL: ${baseUrl}`);
  console.log(`   Email: ${email}`);
  console.log(`   Story: ${storyKey}`);
}

function uploadToJira(filePath, fileName) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      reject(new Error(`File not found: ${filePath}`));
      return;
    }

    const fileStream = fs.createReadStream(filePath);
    const form = new FormData();
    form.append('file', fileStream);

    const url = new URL(`${baseUrl}/rest/api/2/issue/${storyKey}/attachments`);
    const basicAuth = Buffer.from(`${email}:${apiToken}`).toString('base64');

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        ...form.getHeaders(),
        'Authorization': `Basic ${basicAuth}`,
        'X-Atlassian-Token': 'no-check'
      },
      timeout: 30000
    };

    console.log(`\n⏳ Uploading: ${fileName}`);

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const response = JSON.parse(data);
            console.log(`✅ Successfully uploaded: ${fileName}`);
            resolve(response);
          } else if (res.statusCode === 401 || res.statusCode === 403) {
            reject(new Error(`Authentication failed (${res.statusCode}): Check JIRA credentials`));
          } else {
            const errorMsg = data ? JSON.parse(data).errorMessages?.[0] || 'Unknown error' : 'Unknown error';
            reject(new Error(`Upload failed (${res.statusCode}): ${errorMsg}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Connection error: ${error.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    form.pipe(req);
  });
}

async function uploadAIR1Artifacts() {
  try {
    console.log('\n🚀 AIR-1: AirBnb Search - Test Artifacts Upload');
    console.log('=====================================================\n');

    // Validate Jira connection
    validateConnection();

    // Define files to upload
    const filesToUpload = [
      {
        path: path.join(__dirname, '../specs/AIR-1-TEST-CASES.md'),
        description: 'Test Case Specification'
      },
      {
        path: path.join(__dirname, '../Test_Data/AIR-1-test-data.json'),
        description: 'Test Data (JSON)'
      },
      {
        path: path.join(__dirname, '../tests/AIR-1/AIR-1-Script.spec.ts'),
        description: 'Playwright Test Script'
      }
    ];

    console.log(`\n📋 Files to Upload: ${filesToUpload.length}`);
    filesToUpload.forEach((file, index) => {
      const exists = fs.existsSync(file.path);
      const status = exists ? '✅' : '❌';
      console.log(`   ${index + 1}. ${status} ${file.description}`);
    });

    // Upload each file
    const uploadedFiles = [];
    const failedFiles = [];

    for (const file of filesToUpload) {
      try {
        if (fs.existsSync(file.path)) {
          const fileName = path.basename(file.path);
          await uploadToJira(file.path, fileName);
          uploadedFiles.push(file.description);
        } else {
          console.log(`⚠️  File not found: ${file.path}`);
          failedFiles.push({ description: file.description, reason: 'File not found' });
        }
      } catch (error) {
        console.log(`❌ Failed to upload ${file.description}: ${error.message}`);
        failedFiles.push({ description: file.description, reason: error.message });
      }
    }

    // Print summary
    console.log(`\n\n📊 UPLOAD SUMMARY`);
    console.log('=====================================================\n');
    console.log(`📋 Story: ${storyKey}`);
    console.log(`🔗 Jira URL: ${baseUrl}/browse/${storyKey}`);
    console.log(`\n✅ Successfully Uploaded: ${uploadedFiles.length}/${filesToUpload.length}`);

    uploadedFiles.forEach((file, index) => {
      console.log(`   ${index + 1}. ✅ ${file}`);
    });

    if (failedFiles.length > 0) {
      console.log(`\n❌ Failed: ${failedFiles.length}/${filesToUpload.length}`);
      failedFiles.forEach((file, index) => {
        console.log(`   ${index + 1}. ❌ ${file.description} - ${file.reason}`);
      });
    }

    console.log(`\n✨ Test artifacts for AIR-1 are now attached to the Jira issue!`);
    console.log(`\n🔍 View in Jira: ${baseUrl}/browse/${storyKey}`);
    console.log(`\n📝 Next Steps:`);
    console.log(`   1. Review test cases in Jira`);
    console.log(`   2. Run DRY RUN: npm run pw:test:headed --workers=1`);
    console.log(`   3. Open the Playwright HTML report: npx playwright show-report`);
    console.log('\n');

    if (failedFiles.length > 0) {
      process.exit(1);
    }

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Run the upload
uploadAIR1Artifacts();
