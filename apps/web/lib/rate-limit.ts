import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import { getDb, hitRateLimit } from '@roleup/db';

/** Salted hash of the client IP for rate-limit keys. Raw IPs are never stored. */
export async function clientKey(scope: string): Promise<string> {
  const h = await headers();
  const ip = (h.get('x-forwarded-for')?.split(',')[0] ?? h.get('x-real-ip') ?? 'unknown').trim();
  const salt = process.env.ADMIN_TOKEN || process.env.DATABASE_URL || 'roleup';
  return `${scope}:${createHash('sha256').update(`${salt}|${ip}`).digest('hex').slice(0, 32)}`;
}

export async function rateLimit(scope: string, limit: number, windowSeconds: number) {
  return hitRateLimit(getDb(), await clientKey(scope), limit, windowSeconds);
}
