import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE, isValidSession } from './lib/admin-session';

/**
 * Gate in front of /admin: requests without a valid admin session are redirected to the login
 * page before anything renders (a real 307, nothing streamed). Every admin page and action also
 * checks the session itself (lib/admin-auth.ts requireAdmin), so this is defence in depth.
 */
export function proxy(req: NextRequest) {
  if (isValidSession(req.cookies.get(ADMIN_COOKIE)?.value)) return NextResponse.next();
  // The CSV export answers 404 to strangers rather than revealing a login.
  if (req.nextUrl.pathname.startsWith('/admin/export'))
    return new NextResponse('Not found', { status: 404 });
  return NextResponse.redirect(new URL('/admin/login', req.url));
}

export const config = {
  // Everything under /admin except the login page itself.
  matcher: ['/admin', '/admin/((?!login).*)'],
};
