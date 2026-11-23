import { getDb, recordEvent } from '@roleup/db';
import {
  deviceFromUa,
  eventSchema,
  isBot,
  isIgnoredPath,
  referrerHost,
  visitorHash,
} from '@/lib/analytics';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-dynamic';

/** Best-effort per-instance throttle (no DB writes for rate limiting on this hot path). */
const recent = new Map<string, { n: number; at: number }>();
const LIMIT_PER_MIN = 120;

function throttled(key: string): boolean {
  const now = Date.now();
  const cur = recent.get(key);
  if (!cur || now - cur.at > 60_000) {
    recent.set(key, { n: 1, at: now });
    if (recent.size > 5000) for (const [k, v] of recent) if (now - v.at > 60_000) recent.delete(k);
    return false;
  }
  cur.n++;
  return cur.n > LIMIT_PER_MIN;
}

const ownHost = (() => {
  try {
    return new URL(SITE_URL).hostname;
  } catch {
    return null;
  }
})();

/**
 * POST /api/e. First-party page view / click beacon. Responds 204 always (beacons ignore the
 * response); invalid, bot, admin and over-limit events are silently dropped.
 */
export async function POST(req: Request) {
  const done = new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  const ua = req.headers.get('user-agent') ?? '';
  if (isBot(ua)) return done;
  // Same-origin only: beacons from our own pages.
  const origin = req.headers.get('origin');
  if (
    origin &&
    ownHost &&
    new URL(origin).hostname !== ownHost &&
    process.env.NODE_ENV === 'production'
  )
    return done;

  const len = Number(req.headers.get('content-length') ?? 0);
  if (len > 4000) return done;
  let body: unknown;
  try {
    body = JSON.parse(await req.text());
  } catch {
    return done;
  }
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success || isIgnoredPath(parsed.data.p)) return done;

  const ip = (
    req.headers.get('x-forwarded-for')?.split(',')[0] ??
    req.headers.get('x-real-ip') ??
    '0.0.0.0'
  ).trim();
  const secret = process.env.ADMIN_TOKEN || process.env.DATABASE_URL || 'roleup';
  const visitor = visitorHash(secret, ip, ua);
  if (throttled(visitor)) return done;

  const e = parsed.data;
  try {
    await recordEvent(getDb(), {
      type: e.t,
      path: e.p,
      target: e.t === 'click' ? (e.k ?? null) : null,
      label: e.t === 'click' ? e.l?.replace(/\s+/g, ' ').trim().slice(0, 100) || null : null,
      referrer: e.t === 'view' ? referrerHost(e.r, ownHost) : null,
      device: deviceFromUa(ua),
      // Vercel adds the visitor's country; nothing is looked up or stored beyond the code.
      country: req.headers.get('x-vercel-ip-country')?.slice(0, 2) ?? null,
      visitor,
    });
  } catch (err) {
    console.error('analytics write failed:', err instanceof Error ? err.name : 'unknown');
  }
  return done;
}
