require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  const res = await client.query('SELECT id, email, "firstName", "lastName", preferences FROM "users"');
  res.rows.forEach(r => {
    console.log(`\nUser: ${r.email} (${r.firstName} ${r.lastName})`);
    console.log('Preferences keys:', Object.keys(r.preferences || {}));
    const p = r.preferences || {};
    const relevantKeys = Object.keys(p).filter(k => k.toLowerCase().includes('claude') || k.toLowerCase().includes('api') || k.toLowerCase().includes('pms') || k.toLowerCase().includes('key'));
    console.log('Relevant keys:', relevantKeys);
    relevantKeys.forEach(k => {
      const v = p[k];
      if (v && typeof v === 'string') console.log(`  ${k}: ${v.substring(0, 20)}...`);
    });
  });
  
  await client.end();
}

main().catch(console.error);
