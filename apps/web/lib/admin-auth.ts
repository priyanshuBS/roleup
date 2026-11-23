import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { rateLimit } from './rate-limit';

export { rateLimit };

export const ADMIN_COOKIE = 'roleup_admin';

export function adminEnabled(): boolean {
  return (process.env.ADMIN_TOKEN ?? '').length >= 16;
}

/** Session cookie value: HMAC of the token, so the token itself never sits in the cookie. */
function sessionValue(): string {
  return createHmac('sha256', process.env.ADMIN_TOKEN ?? '')
    .update('roleup-admin-session-v1')
    .digest('hex');
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function tokenMatches(candidate: string): boolean {
  const real = process.env.ADMIN_TOKEN ?? '';
  if (!adminEnabled()) return false;
  // Compare fixed-length digests so length differences don't leak through timing.
  const h = (s: string) => createHash('sha256').update(s).digest('hex');
  return safeEqual(h(candidate), h(real));
}

export async function isAdmin(): Promise<boolean> {
  if (!adminEnabled()) return false;
  const c = (await cookies()).get(ADMIN_COOKIE)?.value;
  return !!c && safeEqual(c, sessionValue());
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

/** For admin pages and actions: redirect to login unless signed in; throttle by IP. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect('/admin/login');
  const rl = await rateLimit('admin', 300, 60);
  if (!rl.allowed) throw new Error('Too many admin requests. Wait a minute.');
}
