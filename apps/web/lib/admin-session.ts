/**
 * Admin session primitives with no Next.js or database imports, so proxy.ts can use them.
 * The cookie holds an HMAC of ADMIN_TOKEN, never the token itself.
 */
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const ADMIN_COOKIE = 'roleup_admin';

export function adminEnabled(): boolean {
  return (process.env.ADMIN_TOKEN ?? '').length >= 16;
}

export function sessionValue(): string {
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
  if (!adminEnabled()) return false;
  // Compare fixed-length digests so length differences don't leak through timing.
  const h = (s: string) => createHash('sha256').update(s).digest('hex');
  return safeEqual(h(candidate), h(process.env.ADMIN_TOKEN ?? ''));
}

export function isValidSession(cookieValue: string | undefined): boolean {
  if (!adminEnabled() || !cookieValue) return false;
  return safeEqual(cookieValue, sessionValue());
}
