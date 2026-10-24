import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Protected paths requiring authenticated session
const PROTECTED_PREFIXES = ['/dashboard', '/documents', '/audit', '/admin', '/security'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const sessionCookie = request.cookies.get('trustvault_session_id')?.value;
  // Check for standard Supabase token cookies (e.g. sb-...-auth-token)
  const hasSupabaseCookie = Array.from(request.cookies.getAll()).some(
    (c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
  );

  const isAuthenticated = Boolean(sessionCookie || hasSupabaseCookie);

  // 1. Redirect already logged-in users away from /login to /dashboard
  if (pathname === '/login' && isAuthenticated) {
    const dashUrl = request.nextUrl.clone();
    dashUrl.pathname = '/dashboard';
    dashUrl.search = '';
    return NextResponse.redirect(dashUrl);
  }

  // 2. Protect authenticated page routes
  const isProtectedPath = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isProtectedPath && !isAuthenticated) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('redirect', pathname);
    loginUrl.searchParams.set('message', 'session_required');
    return NextResponse.redirect(loginUrl);
  }

  // 3. Protect internal API routes (excluding auth endpoints)
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/')) {
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized: Valid authenticated session required.' },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
