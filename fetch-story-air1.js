#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Minimal implementation to fetch story AIR-1
const https = require('https');

function maskToken(token) {
  return '***MASKED***';
}

function ensureHttpsUrl(raw) {
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

function getProperty(propKey) {
  const propsPath = path.join(__dirname, 'Jira_Connector/config/jira.properties');
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

function getStoryFromCredentials() {
  const storyName = getProperty('StoryName');
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

function fetchFromJira(baseUrl, storyKey, basicAuth) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${baseUrl}/rest/api/2/issue/${storyKey}`);
    
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    };

    console.log(`\n🔗 Fetching from: ${url.toString()}`);
    console.log(`🔐 Auth: ${maskToken(basicAuth)}`);

    const req = https.request(options, (res) => {
      let data = '';
      
      console.log(`📊 Response Status: ${res.statusCode}`);
      
      res.on('data', chunk => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const response = JSON.parse(data);
            const description = response.fields?.description || 'No description available';
            console.log(`✅ Description fetched successfully`);
            resolve(description);
          } else {
            const response = JSON.parse(data);
            console.log(`⚠️  Status: ${res.statusCode}`);
            const errorMsg = response.errorMessages?.[0] || 'Unknown error';
            console.log(`Error: ${errorMsg}`);
            reject(new Error(`Jira API error (${res.statusCode}): ${errorMsg}`));
          }
        } catch (e) {
          console.log(`❌ Parse error: ${e}`);
          reject(new Error(`Failed to parse Jira response: ${e}`));
        }
      });
    });

    req.on('timeout', () => {
      console.warn('❌ Request timeout');
      req.destroy();
      reject(new Error('Connection timeout: Request took too long'));
    });

    req.on('error', (error) => {
      console.warn('❌ Connection error:', error.message);
      reject(new Error(`Connection failed: ${error.message}`));
    });

    req.end();
  });
}

async function main() {
  try {
    const rawBase = process.env.JIRA_BASE_URL;
    const email = process.env.JIRA_EMAIL;
    const apiToken = process.env.JIRA_API_TOKEN;

    if (!rawBase || !email || !apiToken) {
      throw new Error('Missing required environment variables: JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN');
    }

    const baseUrl = ensureHttpsUrl(rawBase);
    const basicAuth = Buffer.from(`${email}:${apiToken}`).toString('base64');

    const desiredStory = getStoryFromCredentials();

    console.log(`\n📋 Story Information (configured from .env):`);
    console.log(`   Story Name: ${desiredStory.storyName}`);
    console.log(`   Scrum Number: ${desiredStory.scrumNumber}`);
    console.log(`   Epic: ${desiredStory.epic}`);
    console.log(`   Story Number: ${desiredStory.storyNumber}`);
    console.log(`\n✓ Using story from .env file (STRICT MODE - NO FALLBACK)\n`);

    const description = await fetchFromJira(baseUrl, desiredStory.storyNumber, basicAuth);
    
    const result = {
      ...desiredStory,
      description,
      jiraUrl: `${baseUrl}/browse/${desiredStory.storyNumber}`
    };

    // Save to JSON file
    const outputPath = path.join(__dirname, 'Jira_Connector/story-context.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    
    console.log(`\n✅ Story context saved to: ${outputPath}`);
    console.log(`\n📄 Story Details:`);
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main();
