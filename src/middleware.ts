// @ts-nocheck
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Lightweight middleware for route protection.
 * 
 * We intentionally do NOT fetch internal API routes from the middleware because
 * Next.js middleware runs in the Edge Runtime, which causes "fetch failed" errors
 * when calling back to the same dev server (self-referencing fetch).
 *
 * Instead, the middleware only checks for the presence of the session cookie.
 * Full DB session verification happens in server components and API route handlers
 * via the verifySession() function.
 */

// Routes accessible without authentication
const publicRoutes = [
  '/login',
  '/register',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
  '/api/auth/session',
  '/api/auth/verify-session',
  '/api/webhooks',
  '/api/bookings/engine',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log(`[Middleware] Requesting path: ${pathname}`);

  // Let public routes and the root page proceed immediately
  if (pathname === '/' || publicRoutes.some(route => pathname.startsWith(route))) {
    console.log(`[Middleware] Public route allowed: ${pathname}`);
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get('session_id')?.value;
  console.log(`[Middleware] Session Token for ${pathname}: ${sessionToken ? 'Present (' + sessionToken.substring(0, 8) + '...)' : 'MISSING'}`);

  if (!sessionToken) {
    // No session cookie — block the request
    console.log(`[Middleware] Blocking unauthorized access to: ${pathname}`);
    if (pathname.startsWith('/api')) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing session token' },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Session cookie exists — allow the request to proceed.
  // The actual DB-level verification is handled by server components and
  // API handlers calling verifySession().
  return NextResponse.next();
}

export const config = {
  /*
   * Match all request paths except for the ones starting with:
   * - _next/static (static files)
   * - _next/image (image optimization files)
   * - favicon.ico (favicon file)
   * - public images/logos
   */
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg).*)'],
};
