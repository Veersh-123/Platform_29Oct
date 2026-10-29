const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const orgUrl  = process.env.ADO_ORG_URL;
const project = process.env.ADO_PROJECT;
const pat     = process.env.ADO_PAT;
const id      = process.env.ADO_STORY1_ID || '54';

if (!orgUrl || !project || !pat) {
  console.error('❌ Missing ADO_ORG_URL, ADO_PROJECT, or ADO_PAT in .env');
  process.exit(1);
}

const auth = Buffer.from(':' + pat).toString('base64');
const encodedProject = encodeURIComponent(project);
const urlStr = `${orgUrl}${encodedProject}/_apis/wit/workitems/${id}?api-version=7.0`;

console.log(`\n🔗 Connecting to: ${urlStr}`);
console.log(`📋 Work Item ID : ${id}`);
console.log(`🏢 Org URL      : ${orgUrl}`);
console.log(`📁 Project      : ${project}\n`);

const u = new URL(urlStr);

const req = https.request({
  hostname: u.hostname,
  path: u.pathname + u.search,
  method: 'GET',
  headers: {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/json'
  },
  timeout: 15000
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(`📊 HTTP Status: ${res.statusCode}`);
    if (res.statusCode === 200) {
      const json = JSON.parse(data);
      const f = json.fields || {};
      console.log('\n✅ Work Item Retrieved Successfully!\n');
      console.log('─'.repeat(50));
      console.log(`  ID          : ${json.id}`);
      console.log(`  Type        : ${f['System.WorkItemType']}`);
      console.log(`  Title       : ${f['System.Title']}`);
      console.log(`  State       : ${f['System.State']}`);
      console.log(`  Priority    : ${f['Microsoft.VSTS.Common.Priority'] || 'N/A'}`);
      console.log(`  Iteration   : ${f['System.IterationPath']}`);
      console.log(`  Area        : ${f['System.AreaPath']}`);
      console.log(`  Assigned To : ${f['System.AssignedTo']?.displayName || 'Unassigned'}`);
      console.log('─'.repeat(50));

      const desc = (f['System.Description'] || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const ac   = (f['Microsoft.VSTS.Common.AcceptanceCriteria'] || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

      if (desc) console.log(`\n📝 Description:\n  ${desc}`);
      if (ac)   console.log(`\n✔️  Acceptance Criteria:\n  ${ac}`);

    } else {
      console.error(`\n❌ Failed — HTTP ${res.statusCode}`);
      try {
        const err = JSON.parse(data);
        console.error(`   Message: ${err.message || err.errorMessages?.[0] || data}`);
      } catch {
        console.error(`   Response: ${data.substring(0, 300)}`);
      }

      if (res.statusCode === 401) {
        console.error('\n💡 401 Unauthorized — possible causes:');
        console.error('   • PAT has expired');
        console.error('   • PAT lacks "Work Items (Read)" scope');
        console.error('   • Org name in ADO_ORG_URL is incorrect (should be org name, not account ID)');
      }
      if (res.statusCode === 404) {
        console.error('\n💡 404 Not Found — possible causes:');
        console.error('   • Work item ID 54 does not exist in this project');
        console.error('   • ADO_PROJECT name is incorrect');
      }
    }
  });
});

req.on('timeout', () => { req.destroy(); console.error('❌ Request timed out'); });
req.on('error', e => console.error('❌ Connection error:', e.message));
req.end();
