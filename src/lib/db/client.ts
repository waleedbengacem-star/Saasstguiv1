// @ts-nocheck
import { PrismaClient } from '@prisma/client';
import { neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';

// Configure Neon serverless connection for Node.js environments
if (typeof globalThis.WebSocket === 'undefined') {
  const ws = require('ws');
  neonConfig.webSocketConstructor = ws;
}
// Disable redundant double-encryption inside secure WebSocket tunnel
neonConfig.forceDisablePgSSL = true;

// Increase fetch timeout for cold-start scenarios
neonConfig.fetchConnectionCache = true;

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaNeon({ connectionString });

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Executes queries inside a PostgreSQL transaction, pre-setting Row-Level Security (RLS) context
 * for app.current_org_id and app.current_user_id.
 * 
 * @param orgId The active organization/tenant UUID
 * @param userId The active user UUID
 * @param fn Callback passing the transactional client to execute operations
 */
export async function runInTenantContext<T>(
  orgId: string,
  userId: string,
  fn: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>
): Promise<T> {
  return await prisma.$transaction(async (tx) => {
    // Set local session context variables for RLS policies
    await tx.$executeRawUnsafe(`SET LOCAL app.current_org_id = '${orgId}';`);
    await tx.$executeRawUnsafe(`SET LOCAL app.current_user_id = '${userId}';`);
    return await fn(tx);
  }, { maxWait: 20000, timeout: 25000 });
}
