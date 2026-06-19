// @ts-nocheck
import { prisma } from '@/lib/db/client';

interface AuditLogParams {
  organizationId: string;
  userId: string | null;
  action: string; // CREATE, UPDATE, DELETE, LOGIN, SIGN, SYNC, etc.
  entityType: string; // property, task, booking, invoice, etc.
  entityId?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
}

/**
 * Creates an audit log entry in the database.
 * Designed to be immutable (writes only).
 */
export async function createAuditLog(params: AuditLogParams) {
  try {
    return await prisma.auditLog.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || null,
        oldValues: params.oldValues || null,
        newValues: params.newValues || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        metadata: params.metadata || {},
      },
    });
  } catch (error) {
    console.error('Audit Logging Failed:', error);
  }
}
