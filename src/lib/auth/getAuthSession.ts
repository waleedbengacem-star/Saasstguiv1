// @ts-nocheck
import { cookies } from 'next/headers';
import { verifySession } from './session';

/**
 * Server-side session gate for Server Components and Route Handlers.
 * 
 * Reads the session_id cookie, verifies it against the database,
 * and returns the authenticated user context (or null if invalid).
 * 
 * Usage in Server Components:
 *   const session = await getAuthSession();
 *   if (!session) redirect('/login');
 * 
 * Usage in API Route Handlers:
 *   const session = await getAuthSession();
 *   if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 */
export async function getAuthSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session_id')?.value;
  
  if (!sessionToken) {
    return null;
  }

  try {
    return await verifySession(sessionToken);
  } catch (error) {
    console.error('[getAuthSession] DB verification error:', error);
    throw error;
  }
}
