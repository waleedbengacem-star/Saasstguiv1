// @ts-nocheck
import { headers } from 'next/headers';

/**
 * Checks if the current authenticated request contains a specific permission.
 * Reads headers injected by Next.js middleware.
 * 
 * @param requiredPermission The permission slug (e.g. 'properties.create')
 */
export async function hasPermission(requiredPermission: string): Promise<boolean> {
  const headerList = await headers();
  const permissionsJson = headerList.get('x-user-permissions');

  if (!permissionsJson) return false;

  try {
    const permissions: string[] = JSON.parse(permissionsJson);

    // Wildcard admin overrides
    if (permissions.includes('*') || permissions.includes('admin.*')) {
      return true;
    }

    return permissions.includes(requiredPermission);
  } catch (error) {
    return false;
  }
}

/**
 * Enforces a specific permission scope on API routes or Server Components.
 * Throws a 403 Forbidden error if missing.
 */
export async function requirePermission(requiredPermission: string): Promise<void> {
  const allowed = await hasPermission(requiredPermission);
  if (!allowed) {
    throw new Error(`Forbidden: missing required permission '${requiredPermission}'`);
  }
}
