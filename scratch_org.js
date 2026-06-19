const ws = require('ws');
const { neonConfig } = require('@neondatabase/serverless');
const { PrismaNeon } = require('@prisma/adapter-neon');
const { PrismaClient } = require('@prisma/client');

neonConfig.webSocketConstructor = ws;
neonConfig.forceDisablePgSSL = true;
neonConfig.fetchConnectionCache = true;

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const org = await prisma.organization.findUnique({
    where: { id: '43930e53-1e19-493f-a5ce-14cb83bf22ad' },
    select: { settings: true }
  });
  console.log("ORGANIZATION SETTINGS:", JSON.stringify(org?.settings, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
