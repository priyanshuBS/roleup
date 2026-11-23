/** Pure helpers for first-party analytics ingestion. */
import { createHash, createHmac } from 'node:crypto';
import { z } from 'zod';

const BOT_RE =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|quora link|whatsapp|telegram|discord|preview|headless|lighthouse|pagespeed|gtmetrix|pingdom|uptime|monitor|curl|wget|python-requests|httpclient|axios|node-fetch|go-http/i;

export function isBot(ua: string | null | undefined): boolean {
  return !ua || BOT_RE.test(ua);
}

export function deviceFromUa(ua: string): 'mobile' | 'tablet' | 'desktop' {
  if (/ipad|tablet|kindle|silk|playbook|(android(?!.*mobile))/i.test(ua)) return 'tablet';
  if (/mobi|iphone|ipod|android.*mobile|windows phone|blackberry|opera mini/i.test(ua))
    return 'mobile';
  return 'desktop';
}

/** External referrer host only ("google.com"); null for direct traffic or our own site. */
export function referrerHost(
  referrer: string | null | undefined,
  ownHost: string | null,
): string | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, '').toLowerCase();
    if (!host || (ownHost && host === ownHost.replace(/^www\./, '').toLowerCase())) return null;
    if (host === 'localhost' || host === '127.0.0.1') return null;
    // Collapse Google ccTLDs and the Android app referrer.
    if (
      /^google\.[a-z.]+$/.test(host) ||
      host === 'com.google.android.gm' ||
      host === 'com.google.android.googlequicksearchbox'
    )
      return 'google.com';
    return host.slice(0, 100);
  } catch {
    return null;
  }
}

/**
 * Daily visitor id: HMAC(secret, date) used as salt for hash(ip + ua). Rotates every IST day,
 * so it can count unique visitors per day but can't link days or be reversed to an IP.
 */
export function visitorHash(
  secret: string,
  ip: string,
  ua: string,
  now: Date = new Date(),
): string {
  const istDay = new Date(now.getTime() + 330 * 60_000).toISOString().slice(0, 10);
  const salt = createHmac('sha256', secret).update(`visitor-salt:${istDay}`).digest('hex');
  return createHash('sha256').update(`${salt}|${ip}|${ua}`).digest('hex').slice(0, 20);
}

const path = z
  .string()
  .max(300)
  .regex(/^\/[^\s]*$/)
  .transform((p) => (p.length > 1 ? p.replace(/\/+$/, '') : p));

export const eventSchema = z.object({
  t: z.enum(['view', 'click']),
  p: path,
  r: z.string().max(500).optional(),
  k: z.string().max(300).optional(),
  l: z.string().max(100).optional(),
  q: z.string().max(100).optional(),
  e: z.literal(1).optional(),
});
export type EventPayload = z.infer<typeof eventSchema>;

/** Paths we never count (admin, API, Next internals). */
export function isIgnoredPath(p: string): boolean {
  return /^\/(admin|api|_next)(\/|$)/.test(p);
}
