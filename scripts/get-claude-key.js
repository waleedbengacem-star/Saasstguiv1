require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  const res = await client.query(
    "SELECT settings FROM organizations WHERE settings::text LIKE '%pms_claude_api_key%' LIMIT 1"
  );
  
  let key = null;
  if (res.rows.length > 0) {
    const settings = res.rows[0].settings;
    key = settings.pms_claude_api_key;
  }

  if (!key) {
    console.log('Key not found in organizations, checking User table for admin@holidayhomessas.com...');
    const userRes = await client.query(
      "SELECT preferences FROM \"users\" WHERE email = 'admin@holidayhomessas.com' LIMIT 1"
    );
    if (userRes.rows.length > 0) {
      const preferences = userRes.rows[0].preferences || {};
      console.log('Superadmin preferences:', JSON.stringify(preferences));
      key = preferences.pms_claude_api_key || preferences.claude_api_key;
    }
  }
  
  if (key) {
    console.log('Key found:', key.substring(0, 20) + '...');
    require('fs').writeFileSync(require('path').join(__dirname, '.claude-key'), key);
    console.log('Key saved to scripts/.claude-key');
  } else {
    console.log('No Claude API key found in organizations or User preferences');
  }
  
  await client.end();
}

main().catch(console.error);
