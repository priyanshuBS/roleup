/**
 * Read funding-news RSS feeds, extract facts with deterministic rules, then verify them
 * (verify-funding.ts). Verified entries are approved automatically when that is switched on in
 * /admin/settings; the rest wait in the admin review queue.
 *
 *   pnpm track-funding            # all feeds
 *   pnpm track-funding --dry-run  # print what would be queued, no DB writes
 */
import { extractFunding } from '@roleup/core';
import {
  crawlRuns,
  ensureCompany,
  eq,
  fundings,
  inArray,
  refreshRecentlyFundedTags,
} from '@roleup/db';
import { FUNDING_SOURCES } from './funding-sources';
import { hasFlag, loadEnv, openDb, usdInrRate } from './lib/env';
import { politeFetch } from './lib/http';
import { parseFeed, type FeedItem } from './lib/rss';
import { verifyFundings } from './verify-funding';

/** Normalize URLs so the same article from two feeds dedupes (drop tracking params, fragments). */
export function canonicalUrl(u: string): string {
  try {
    const url = new URL(u);
    url.hash = '';
    for (const k of [...url.searchParams.keys()])
      if (/^(utm_|ref$|from$|source$)/i.test(k)) url.searchParams.delete(k);
    return url.toString().replace(/\/$/, '');
  } catch {
    return u;
  }
}

async function fetchItems(): Promise<{ source: string; item: FeedItem }[]> {
  const all: { source: string; item: FeedItem }[] = [];
  for (const s of FUNDING_SOURCES) {
    try {
      const res = await politeFetch(s.url, {
        accept: 'application/rss+xml, application/xml, text/xml',
        retries: 2,
      });
      const items = parseFeed(await res.text());
      console.log(`feed ${s.name}: ${items.length} items`);
      for (const item of items) all.push({ source: s.name, item });
    } catch (err) {
      console.warn(`feed ${s.name} failed: ${err instanceof Error ? err.message : err}`);
    }
  }
  return all;
}

async function main() {
  const dry = hasFlag('dry-run');
  const rate = usdInrRate();
  if (dry) loadEnv();
  const items = await fetchItems();
  const extracted = items
    .map(({ source, item }) => ({
      source,
      item,
      f: extractFunding(item.title, rate, item.summary),
    }))
    .filter((x) => x.f !== null);
  console.log(`${extracted.length} funding items extracted from ${items.length}`);

  if (dry) {
    for (const x of extracted)
      console.log(
        `  ${x.f!.company} | ${x.f!.round} | ${x.f!.currency} ${x.f!.amount} | ${x.item.title}`,
      );
    return;
  }

  const { db, close } = openDb();
  try {
    const [run] = await db
      .insert(crawlRuns)
      .values({ worker: 'track-funding' })
      .returning({ id: crawlRuns.id });
    const urls = extracted.map((x) => canonicalUrl(x.item.link));
    const existing = new Set(
      urls.length
        ? (
            await db
              .select({ u: fundings.sourceUrl })
              .from(fundings)
              .where(inArray(fundings.sourceUrl, urls))
          ).map((r) => r.u)
        : [],
    );
    let added = 0;
    let newCompanies = 0;
    const errors: { company?: string; message: string }[] = [];
    for (const x of extracted) {
      const url = canonicalUrl(x.item.link);
      if (existing.has(url)) continue;
      existing.add(url);
      const f = x.f!;
      try {
        const { company, created } = await ensureCompany(db, f.company);
        if (created) newCompanies++;
        await db
          .insert(fundings)
          .values({
            companyId: company.id,
            round: f.round,
            amount: f.amount,
            currency: f.currency,
            amountUsd: f.amountUsd,
            amountInr: f.amountInr,
            announcedOn: (x.item.publishedAt ?? new Date()).toISOString().slice(0, 10),
            sourceUrl: url,
            sourceName: x.source,
            // Headline kept only while pending so the reviewer has context; cleared on review.
            headline: x.item.title.slice(0, 300),
            status: 'pending',
          })
          .onConflictDoNothing({ target: fundings.sourceUrl });
        added++;
        console.log(
          `queued ${f.company} ${f.round} ${f.currency ?? ''} ${f.amount ?? ''}${created ? ' (new company)' : ''}`,
        );
      } catch (err) {
        errors.push({
          company: f.company,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }
    // Score everything new (and re-check older entries); approve what passes.
    const verified = await verifyFundings(db);
    const retagged = await refreshRecentlyFundedTags(db);
    await db
      .update(crawlRuns)
      .set({
        finishedAt: new Date(),
        jobsAdded: added,
        companiesOk: newCompanies,
        jobsUpdated: retagged + verified.autoApproved,
        errors,
      })
      .where(eq(crawlRuns.id, run!.id));
    console.log(
      `done: ${added} new, ${verified.autoApproved} auto-approved, ${newCompanies} new companies, ${retagged} tag changes`,
    );
  } finally {
    await close();
  }
}

await main();
