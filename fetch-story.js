const https = require('https');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const JIRA_BASE_URL = process.env.JIRA_BASE_URL;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const STORY_ID = process.env.JIRA_STORY1_STORY;

console.log(`Fetching story: ${STORY_ID}`);

const basicAuth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
const url = new URL(`${JIRA_BASE_URL}/rest/api/2/issue/${STORY_ID}`);

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

https.request(options, (res) => {
  let data = '';
  
  res.on('data', chunk => {
    data += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode === 200) {
      const response = JSON.parse(data);
      const fields = response.fields;
      
      const storyData = {
        id: response.key,
        summary: fields.summary,
        description: fields.description,
        acceptanceCriteria: fields.customfield_10016 || 'N/A',
        priority: fields.priority?.name || 'N/A',
        storyPoints: fields.customfield_10017 || 0,
        components: fields.components?.map(c => c.name) || [],
        labels: fields.labels || []
      };
      
      console.log('\n✅ Story fetched successfully:');
      console.log(JSON.stringify(storyData, null, 2));
      
      // Save to file for later use
      const fs = require('fs');
      fs.writeFileSync('Jira_Connector/story-context.json', JSON.stringify(storyData, null, 2));
      console.log('\n📁 Story context saved to: Jira_Connector/story-context.json');
    } else {
      const error = JSON.parse(data);
      console.error(`❌ Error: ${res.statusCode}`);
      console.error(error);
    }
  });
}).on('error', (error) => {
  console.error('Connection error:', error.message);
}).end();
