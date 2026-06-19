const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const { neonConfig } = require('@neondatabase/serverless');
const { PrismaNeon } = require('@prisma/adapter-neon');
const ws = require('ws');

if (fs.existsSync('.env')) {
  const envText = fs.readFileSync('.env', 'utf8');
  envText.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) return;
    const key = trimmed.substring(0, eqIdx).trim();
    let val = trimmed.substring(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.substring(1, val.length - 1);
    }
    process.env[key] = val;
  });
}

neonConfig.webSocketConstructor = ws;
neonConfig.forceDisablePgSSL = true;

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const contacts = await prisma.contact.findMany({
    where: { organizationId: 'a02fe671-b0c3-4b08-956d-15a252656d79' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      companyName: true,
      contactType: true,
      bankDetails: true,
    }
  });
  console.log('--- ALL CONTACTS IN STAY LOCAL WORKSPACE ---');
  console.log(JSON.stringify(contacts, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
