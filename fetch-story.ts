import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as dotenv from 'dotenv';

dotenv.config();

const baseUrl = 'https://veeresh-devani.atlassian.net/';
const email = 'veerdevani8@gmail.com';
const apiToken = 'ATATT3xFfGF0R4MUEi_rIyr9rVgPy54KmGlzyL27Df6TM0vrju0Bzg7wwKB9_d0vNEKq6dFocWNFvkJPREel-cO0tCc6tlxy4TwdpUkep96JciE-euW0A3UMHYXY5DfkfIDvpE63fVtGlfRakkQdT5MK6xkV__GvGh-UZmu0NSKN_jZV6rgUoiQ=1FE27DCC';
const basicAuth = Buffer.from(`${email}:${apiToken}`).toString('base64');

const url = new URL(`${baseUrl}rest/api/2/issue/KAN-8`);
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

console.log('Fetching KAN-8 from Jira...');

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      const storyData = {
        id: response.key,
        summary: response.fields?.summary || '',
        description: response.fields?.description || '',
        acceptanceCriteria: response.fields?.customfield_10038 || 'N/A',
        priority: response.fields?.priority?.name || 'Medium',
        storyPoints: response.fields?.customfield_10028 || 0,
        components: response.fields?.components?.map((c: any) => c.name) || [],
        labels: response.fields?.labels || []
      };
      
      fs.writeFileSync(
        path.join(__dirname, 'Jira_Connector', 'story-context.json'),
        JSON.stringify(storyData, null, 2)
      );
      
      console.log('✅ Story fetched and saved:', storyData.id);
      console.log('Summary:', storyData.summary);
      console.log('Description:', storyData.description.substring(0, 100) + '...');
    } catch (e) {
      console.error('Error parsing response:', e);
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error.message);
});

req.end();
