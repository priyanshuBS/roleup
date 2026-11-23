/**
 * Upsert cities and seed companies. Safe to re-run: worker-managed tags (yc, recently_funded)
 * and crawl state are preserved.
 *
 *   pnpm db:seed
 */
import { CITIES, domainFromUrl, slugify } from '@roleup/core';
import { cities, companies, eq, sql } from '@roleup/db';
import { readSeed } from './lib/csv';
import { openDb } from './lib/env';
import { repoPath } from './lib/paths';

const MANAGED_TAGS = new Set(['yc', 'recently_funded']);

const { db, close } = openDb();
try {
  for (const c of CITIES) {
    await db
      .insert(cities)
      .values({
        name: c.name,
        slug: c.slug,
        state: c.state,
        country: c.country,
        aliases: c.aliases,
      })
      .onConflictDoUpdate({
        target: cities.slug,
        set: { name: c.name, state: c.state, aliases: c.aliases },
      });
  }
  console.log(`cities: ${CITIES.length}`);

  const rows = readSeed(repoPath('data/companies.seed.csv'));
  let added = 0;
  let updated = 0;
  for (const r of rows) {
    const slug = slugify(r.name);
    const [existing] = await db
      .select({ id: companies.id, tags: companies.tags })
      .from(companies)
      .where(eq(companies.slug, slug));
    const values = {
      name: r.name,
      slug,
      website: r.website,
      domain: domainFromUrl(r.website),
      careersUrl: r.careers_url || null,
      ats: r.ats,
      atsSlug: r.ats_slug || null,
      hqCountry: r.hq_country || null,
      hasIndiaOffice: r.hq_country === 'IN',
    };
    if (existing) {
      const managed = existing.tags.filter((t) => MANAGED_TAGS.has(t));
      await db
        .update(companies)
        .set({
          ...values,
          tags: [...new Set([...r.tags, ...managed])],
          hasIndiaOffice: sql`${companies.hasIndiaOffice} OR ${values.hasIndiaOffice}`,
        })
        .where(eq(companies.id, existing.id));
      updated++;
    } else {
      await db.insert(companies).values({ ...values, tags: r.tags });
      added++;
    }
  }
  console.log(`companies: ${added} added, ${updated} updated`);
} finally {
  await close();
}
