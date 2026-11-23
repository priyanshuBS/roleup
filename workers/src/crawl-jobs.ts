/**
 * Crawl every company with a known ATS board, normalize, and upsert tech jobs.
 *
 *   pnpm crawl                     # all companies
 *   pnpm crawl --company stripe    # one company (by slug)
 *
 * Invariants:
 *  - Upsert by (source, source_job_id); last_seen_at = this run's timestamp.
 *  - If a company's fetch SUCCEEDED, its jobs not seen in this run are closed.
 *    If it FAILED, nothing is closed.
 *  - 404/410 marks the company invalid_slug; those are retried weekly, not every run.
 */
import { jobSlug, normalizeJob, type NormalizedJob } from '@roleup/core';
import {
  and,
  cities,
  companies,
  count,
  crawlRuns,
  eq,
  inArray,
  isNotNull,
  isNull,
  jobs,
  lt,
  ne,
  or,
  sql,
  type Company,
  type Db,
  type NewJob,
} from '@roleup/db';
import { argValue, openDb, usdInrRate } from './lib/env';
import { HttpError, mapLimit } from './lib/http';
import { FETCHERS } from './sources';

const INVALID_RETRY_DAYS = 7;
const CHUNK = 100;

export interface CompanyCrawlResult {
  ok: boolean;
  added: number;
  updated: number;
  closed: number;
  kept: number;
  fetched: number;
  error?: string;
}

const excluded = (col: string) => sql.raw(`excluded."${col}"`);

function toRow(
  job: NormalizedJob,
  company: Company,
  cityIds: Map<string, number>,
  seenAt: Date,
): NewJob {
  return {
    companyId: company.id,
    source: job.source,
    sourceJobId: job.sourceJobId,
    title: job.title.slice(0, 300),
    slug: jobSlug(job.title, company.slug, job.source, job.sourceJobId),
    roleCategory: job.roleCategory,
    level: job.level,
    minYears: job.minYears,
    department: job.department?.slice(0, 200) ?? null,
    descriptionText: job.descriptionText,
    applyUrl: job.applyUrl,
    locationRaw: job.locationRaw.slice(0, 500),
    cityId: job.citySlug ? (cityIds.get(job.citySlug) ?? null) : null,
    country: job.country,
    remoteType: job.remoteType,
    employmentType: job.employmentType,
    salaryMin: job.salary?.min ?? null,
    salaryMax: job.salary?.max ?? null,
    salaryCurrency: job.salary?.currency ?? null,
    salaryInterval: job.salary?.interval ?? null,
    salaryMinInrAnnual: job.salaryMinInrAnnual,
    salaryMaxInrAnnual: job.salaryMaxInrAnnual,
    salaryBand: job.salaryBand,
    salarySource: job.salarySource,
    postedAt: job.postedAt ?? seenAt,
    firstSeenAt: seenAt,
    lastSeenAt: seenAt,
    closedAt: null,
    fingerprint: job.fingerprint,
  };
}

export async function crawlCompany(
  db: Db,
  company: Company,
  cityIds: Map<string, number>,
  rate: number,
): Promise<CompanyCrawlResult> {
  const ats = company.ats;
  if (ats === 'none' || !company.atsSlug)
    return { ok: false, added: 0, updated: 0, closed: 0, kept: 0, fetched: 0, error: 'no ats' };
  const seenAt = new Date();

  let raw;
  try {
    raw = await FETCHERS[ats](company.atsSlug);
  } catch (err) {
    const gone = err instanceof HttpError && err.isGone;
    const message = err instanceof Error ? err.message.slice(0, 500) : String(err);
    await db
      .update(companies)
      .set({
        crawlStatus: gone ? 'invalid_slug' : 'error',
        crawlError: message,
        lastCrawledAt: seenAt,
      })
      .where(eq(companies.id, company.id));
    return { ok: false, added: 0, updated: 0, closed: 0, kept: 0, fetched: 0, error: message };
  }

  const ctx = {
    id: company.id,
    slug: company.slug,
    hqCountry: company.hqCountry,
    tags: company.tags,
  };
  const byId = new Map<string, NormalizedJob>();
  for (const r of raw) {
    const n = normalizeJob(r, ctx, rate);
    if (n.kept) byId.set(n.job.sourceJobId, n.job);
  }

  // Cross-source duplicates: skip if another source already has this open fingerprint.
  const otherFps = new Set(
    (
      await db
        .select({ fp: jobs.fingerprint })
        .from(jobs)
        .where(and(eq(jobs.companyId, company.id), ne(jobs.source, ats), isNull(jobs.closedAt)))
    ).map((r) => r.fp),
  );
  const rows = [...byId.values()]
    .filter((j) => !otherFps.has(j.fingerprint))
    .map((j) => toRow(j, company, cityIds, seenAt));

  let added = 0;
  let updated = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const res = await db
      .insert(jobs)
      .values(rows.slice(i, i + CHUNK))
      .onConflictDoUpdate({
        target: [jobs.source, jobs.sourceJobId],
        set: {
          title: excluded('title'),
          roleCategory: excluded('role_category'),
          level: excluded('level'),
          minYears: excluded('min_years'),
          department: excluded('department'),
          descriptionText: excluded('description_text'),
          applyUrl: excluded('apply_url'),
          locationRaw: excluded('location_raw'),
          cityId: excluded('city_id'),
          country: excluded('country'),
          remoteType: excluded('remote_type'),
          employmentType: excluded('employment_type'),
          salaryMin: excluded('salary_min'),
          salaryMax: excluded('salary_max'),
          salaryCurrency: excluded('salary_currency'),
          salaryInterval: excluded('salary_interval'),
          salaryMinInrAnnual: excluded('salary_min_inr_annual'),
          salaryMaxInrAnnual: excluded('salary_max_inr_annual'),
          salaryBand: excluded('salary_band'),
          salarySource: excluded('salary_source'),
          postedAt: sql`coalesce(${jobs.postedAt}, excluded."posted_at")`,
          lastSeenAt: excluded('last_seen_at'),
          closedAt: sql`null`,
          fingerprint: excluded('fingerprint'),
        },
      })
      .returning({ inserted: sql<boolean>`(xmax = 0)` });
    for (const r of res) {
      if (r.inserted) added++;
      else updated++;
    }
  }

  // Fetch succeeded: anything from this board not seen in this run has closed.
  const closedRows = await db
    .update(jobs)
    .set({ closedAt: seenAt })
    .where(
      and(
        eq(jobs.companyId, company.id),
        eq(jobs.source, ats),
        isNull(jobs.closedAt),
        lt(jobs.lastSeenAt, seenAt),
      ),
    )
    .returning({ id: jobs.id });

  const [open] = await db
    .select({ n: count() })
    .from(jobs)
    .where(and(eq(jobs.companyId, company.id), isNull(jobs.closedAt)));
  const [indiaOffice] = await db
    .select({ n: count() })
    .from(jobs)
    .where(
      and(
        eq(jobs.companyId, company.id),
        isNull(jobs.closedAt),
        eq(jobs.country, 'IN'),
        inArray(jobs.remoteType, ['onsite', 'hybrid']),
      ),
    );

  await db
    .update(companies)
    .set({
      openJobsCount: open?.n ?? 0,
      lastCrawledAt: seenAt,
      crawlStatus: 'ok',
      crawlError: null,
      ...((indiaOffice?.n ?? 0) > 0 ? { hasIndiaOffice: true } : {}),
    })
    .where(eq(companies.id, company.id));

  return {
    ok: true,
    added,
    updated,
    closed: closedRows.length,
    kept: byId.size,
    fetched: raw.length,
  };
}

async function main() {
  const { db, close } = openDb();
  const rate = usdInrRate();
  const only = argValue('company');
  try {
    const cityIds = new Map(
      (await db.select({ id: cities.id, slug: cities.slug }).from(cities)).map((c) => [
        c.slug,
        c.id,
      ]),
    );
    if (cityIds.size === 0) console.warn('No cities in the database. Run `pnpm db:seed` first.');

    const retryBefore = new Date(Date.now() - INVALID_RETRY_DAYS * 86_400_000);
    const list = await db
      .select()
      .from(companies)
      .where(
        and(
          ne(companies.ats, 'none'),
          isNotNull(companies.atsSlug),
          only
            ? eq(companies.slug, only)
            : or(
                ne(companies.crawlStatus, 'invalid_slug'),
                isNull(companies.lastCrawledAt),
                lt(companies.lastCrawledAt, retryBefore),
              ),
        ),
      );

    const [run] = await db
      .insert(crawlRuns)
      .values({ worker: 'crawl-jobs' })
      .returning({ id: crawlRuns.id });
    const errors: { company: string; message: string }[] = [];
    const t0 = Date.now();

    const results = await mapLimit(list, 5, async (c) => {
      const r = await crawlCompany(db, c, cityIds, rate);
      if (!r.ok) errors.push({ company: c.slug, message: r.error ?? 'unknown' });
      console.log(
        `${r.ok ? 'ok  ' : 'FAIL'} ${c.slug.padEnd(22)} fetched=${r.fetched} kept=${r.kept} +${r.added} ~${r.updated} -${r.closed}${r.error ? ` ${r.error}` : ''}`,
      );
      return r;
    });

    const sum = (k: 'added' | 'updated' | 'closed') => results.reduce((a, r) => a + r[k], 0);
    const ok = results.filter((r) => r.ok).length;
    await db
      .update(crawlRuns)
      .set({
        finishedAt: new Date(),
        companiesOk: ok,
        companiesFailed: results.length - ok,
        jobsAdded: sum('added'),
        jobsUpdated: sum('updated'),
        jobsClosed: sum('closed'),
        errors,
      })
      .where(eq(crawlRuns.id, run!.id));

    const [openJobs] = await db.select({ n: count() }).from(jobs).where(isNull(jobs.closedAt));
    console.log(
      `\ncrawl done in ${((Date.now() - t0) / 1000).toFixed(1)}s: companies ok=${ok} failed=${results.length - ok}; ` +
        `jobs added=${sum('added')} updated=${sum('updated')} closed=${sum('closed')}; open jobs now=${openJobs?.n ?? 0}`,
    );
    // Fail the CI job only if everything failed (likely a network or DB problem).
    if (results.length > 0 && ok === 0) process.exitCode = 1;
  } finally {
    await close();
  }
}

await main();
