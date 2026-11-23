import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  ADMIN_COOKIE,
  adminEnabled,
  isValidSession,
  sessionValue,
  tokenMatches,
} from './admin-session';
import { rateLimit } from './rate-limit';

export { ADMIN_COOKIE, adminEnabled, isValidSession, rateLimit, tokenMatches };

export async function isAdmin(): Promise<boolean> {
  return isValidSession((await cookies()).get(ADMIN_COOKIE)?.value);
}

export async function setAdminSession() {
  (await cookies()).set(ADMIN_COOKIE, sessionValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 7 * 86_400,
  });
}

export async function clearAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}

/**
 * For admin pages and actions: redirect to login unless signed in; throttle by IP.
 * Call it at the top of EVERY admin page and action, before reading data. A check in the
 * layout alone does not protect pages (Next renders layouts and pages in parallel and streams
 * the page into the response). proxy.ts adds a second gate in front of /admin.
 */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect('/admin/login');
  const rl = await rateLimit('admin', 300, 60);
  if (!rl.allowed) throw new Error('Too many admin requests. Wait a minute.');
}
