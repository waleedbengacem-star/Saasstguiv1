require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  const res = await client.query("SELECT id, name, settings FROM organizations LIMIT 5");
  res.rows.forEach(r => {
    console.log(`\nOrg: ${r.name} (${r.id})`);
    console.log('Settings keys:', Object.keys(r.settings || {}));
    // Look for any key containing 'claude' or 'api'
    const s = r.settings || {};
    const relevantKeys = Object.keys(s).filter(k => k.toLowerCase().includes('claude') || k.toLowerCase().includes('api') || k.toLowerCase().includes('pms'));
    console.log('Relevant keys:', relevantKeys);
    relevantKeys.forEach(k => {
      const v = s[k];
      if (v && typeof v === 'string') console.log(`  ${k}: ${v.substring(0, 20)}...`);
    });
  });
  
  await client.end();
}

main().catch(console.error);
