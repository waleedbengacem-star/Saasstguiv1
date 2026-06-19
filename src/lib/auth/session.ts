// @ts-nocheck
import crypto from 'crypto';
import { prisma } from '@/lib/db/client';

let platformPrefsCache: {
  isPlatformClaudeConnected: boolean;
  isPlatformDocusignConnected: boolean;
  timestamp: number;
} | null = null;

const PLATFORM_PREFS_CACHE_TTL = 60 * 1000; // 1 minute cache duration


const SESSION_TTL_DAYS = 7;

/**
 * Helper to hash a plaintext session token using SHA-256.
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generates a secure random session token.
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

interface CreateSessionResult {
  sessionToken: string;
  expiresAt: Date;
}

/**
 * Creates a new stateful session in the database.
 * Stores the SHA-256 hash of the token.
 */
export async function createSession(
  userId: string,
  organizationId: string | null,
  ipAddress?: string,
  userAgent?: string
): Promise<CreateSessionResult> {
  const sessionToken = generateToken();
  const tokenHash = hashToken(sessionToken);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);

  await prisma.session.create({
    data: {
      userId,
      organizationId,
      tokenHash,
      ipAddress,
      userAgent,
      expiresAt,
    },
  });

  return { sessionToken, expiresAt };
}

interface SessionValidationResult {
  session: {
    id: string;
    organizationId: string | null;
  };
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    settings: any;
  } | null;
  roleSlug: string;
  permissions: string[];
}

/**
 * Verifies a plaintext session token against the database session hash.
 * Checks for expiration and returns user profile, organization, and role/permissions.
 */
export async function verifySession(sessionToken: string): Promise<SessionValidationResult | null> {
  const tokenHash = hashToken(sessionToken);

  // Wrap in a timeout to handle Neon cold-start hangs
  const timeoutMs = 18000; // 18 second timeout
  const sessionPromise = prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: {
          memberships: {
            include: {
              role: true,
            },
          },
        },
      },
      organization: true,
    },
  });

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('DB session query timed out (Neon cold-start)')), timeoutMs)
  );

  const session = await Promise.race([sessionPromise, timeoutPromise]);

  if (!session) return null;

  // Check if session has expired
  if (new Date() > session.expiresAt) {
    await revokeSession(sessionToken);
    return null;
  }

  // Check if the tenant/organization is suspended (ignoring global Super Admin)
  if (session.organization && !session.organization.isActive && session.user.email !== 'admin@holidayhomessas.com') {
    await revokeSession(sessionToken);
    return null;
  }

  // Retrieve user organization member details to extract roles and permissions
  let roleSlug = 'guest';
  let permissions: string[] = [];

  if (session.user.email === 'admin@holidayhomessas.com') {
    roleSlug = 'super_admin';
    permissions = ['*'];
  } else if (session.organizationId) {
    const member = session.user.memberships?.find(
      (m) => m.organizationId === session.organizationId
    );

    if (member && member.isActive) {
      roleSlug = member.role.slug;
      
      // Parse permissions JSON array
      const rawPermissions = member.role.permissions;
      if (Array.isArray(rawPermissions)) {
        permissions = rawPermissions as string[];
      }
    }
  } else {
    // If no organization is tied, check if user has a platform-level role (e.g. Super Admin)
    const member = session.user.memberships?.find(
      (m) => m.role?.slug === 'super_admin'
    );

    if (member && member.isActive) {
      roleSlug = 'super_admin';
      permissions = ['*']; // Wildcard permission for Super Admin
    }
  }

  let isPlatformClaudeConnected = false;
  let isPlatformDocusignConnected = false;

  const cacheNow = Date.now();
  if (platformPrefsCache && (cacheNow - platformPrefsCache.timestamp < PLATFORM_PREFS_CACHE_TTL)) {
    isPlatformClaudeConnected = platformPrefsCache.isPlatformClaudeConnected;
    isPlatformDocusignConnected = platformPrefsCache.isPlatformDocusignConnected;
  } else {
    try {
      const superAdmin = await prisma.user.findUnique({
        where: { email: 'admin@holidayhomessas.com' },
        select: { preferences: true }
      });
      if (superAdmin && superAdmin.preferences && typeof superAdmin.preferences === 'object') {
        const prefs = superAdmin.preferences;
        if (prefs.pms_claude_api_key && prefs.pms_claude_api_key.trim()) {
          isPlatformClaudeConnected = true;
        }
        if (prefs.pms_ds_client_id && prefs.pms_ds_client_id.trim()) {
          isPlatformDocusignConnected = true;
        }
      }
      platformPrefsCache = {
        isPlatformClaudeConnected,
        isPlatformDocusignConnected,
        timestamp: cacheNow
      };
    } catch (err) {
      console.error('Failed to retrieve superadmin platform preferences in verifySession:', err);
    }
  }

  return {
    session: {
      id: session.id,
      organizationId: session.user.email === 'admin@holidayhomessas.com' ? null : session.organizationId,
    },
    user: {
      id: session.user.id,
      email: session.user.email,
      firstName: session.user.firstName,
      lastName: session.user.lastName,
      avatarUrl: session.user.avatarUrl,
    },
    organization: session.user.email === 'admin@holidayhomessas.com' ? null : (session.organization
      ? {
          id: session.organization.id,
          name: session.organization.name,
          slug: session.organization.slug,
          settings: {
            ...(session.organization.settings && typeof session.organization.settings === 'object' ? session.organization.settings : {}),
            isPlatformClaudeConnected,
            isPlatformDocusignConnected,
          },
          logoUrl: session.organization.logoUrl,
        }
      : null),
    roleSlug,
    permissions,
  };
}

/**
 * Revokes a session by deleting it from the database.
 */
export async function revokeSession(sessionToken: string): Promise<void> {
  const tokenHash = hashToken(sessionToken);
  try {
    await prisma.session.delete({
      where: { tokenHash },
    });
  } catch (error) {
    // Silently ignore if session was already deleted or doesn't exist
  }
}
