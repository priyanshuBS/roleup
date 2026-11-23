/** Write helpers shared by workers and the admin panel. */
import { and, eq, gte, sql } from 'drizzle-orm';
import { RECENT_FUNDING_DAYS, slugify } from '@roleup/core';
import type { Db } from './client';
import { companies, fundings, rateLimits } from './schema';

/**
 * Fixed-window rate limit. Returns whether this hit is allowed, and the remaining count.
 * `key` should already be hashed/namespaced by the caller (never a raw IP).
 */
export async function hitRateLimit(
  db: Db,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const now = new Date();
  const windowStart = new Date(
    Math.floor(now.getTime() / (windowSeconds * 1000)) * windowSeconds * 1000,
  );
  const [row] = await db
    .insert(rateLimits)
    .values({ key, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`case when ${rateLimits.windowStart} = ${windowStart.toISOString()}::timestamptz then ${rateLimits.count} + 1 else 1 end`,
        windowStart: sql`${windowStart.toISOString()}::timestamptz`,
      },
    })
    .returning({ count: rateLimits.count });
  const count = row?.count ?? 1;
  // Opportunistic cleanup of stale windows (cheap, indexed by PK scan is fine at this size).
  if (Math.random() < 0.02) {
    await db.delete(rateLimits).where(sql`${rateLimits.windowStart} < now() - interval '1 day'`);
  }
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt: new Date(windowStart.getTime() + windowSeconds * 1000),
  };
}

export const normalizeName = (n: string) =>
  n
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|limited|pvt|private|technologies|labs|corp)\b\.?/g, '')
    .replace(/[^a-z0-9]+/g, '');

/** Find a company by slug or normalized name. */
export async function findCompanyByName(db: Db, name: string) {
  const slug = slugify(name);
  const [bySlug] = await db.select().from(companies).where(eq(companies.slug, slug)).limit(1);
  if (bySlug) return bySlug;
  const key = normalizeName(name);
  if (key.length < 2) return null;
  const [byName] = await db
    .select()
    .from(companies)
    .where(sql`regexp_replace(lower(${companies.name}), '[^a-z0-9]+', '', 'g') = ${key}`)
    .limit(1);
  return byName ?? null;
}

/** Existing company, or a new one with no ATS yet, queued for ATS detection. */
export async function ensureCompany(db: Db, name: string, opts: { website?: string | null } = {}) {
  const existing = await findCompanyByName(db, name);
  if (existing) return { company: existing, created: false };
  let slug = slugify(name);
  for (let i = 2; ; i++) {
    const [taken] = await db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.slug, slug))
      .limit(1);
    if (!taken) break;
    slug = `${slugify(name)}-${i}`;
  }
  const [company] = await db
    .insert(companies)
    .values({
      name: name.slice(0, 120),
      slug,
      website: opts.website ?? null,
      ats: 'none',
      tags: ['startup'],
      atsDetectRequestedAt: new Date(),
    })
    .returning();
  return { company: company!, created: true };
}

/** Recompute the `recently_funded` tag from approved funding in the last RECENT_FUNDING_DAYS. */
export async function refreshRecentlyFundedTags(db: Db): Promise<number> {
  const since = new Date(Date.now() - RECENT_FUNDING_DAYS * 86_400_000).toISOString().slice(0, 10);
  const funded = new Set(
    (
      await db
        .selectDistinct({ id: fundings.companyId })
        .from(fundings)
        .where(and(eq(fundings.status, 'approved'), gte(fundings.announcedOn, since)))
    ).map((r) => r.id),
  );
  const all = await db.select({ id: companies.id, tags: companies.tags }).from(companies);
  let changed = 0;
  for (const c of all) {
    const has = c.tags.includes('recently_funded');
    const should = funded.has(c.id);
    if (has === should) continue;
    const tags = should
      ? [...c.tags, 'recently_funded']
      : c.tags.filter((t) => t !== 'recently_funded');
    await db.update(companies).set({ tags }).where(eq(companies.id, c.id));
    changed++;
  }
  return changed;
}
