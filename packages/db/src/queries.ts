/**
 * Read queries shared by the website (server components) and the public API.
 * Everything returns the DTOs from @roleup/core so web and mobile see the same shapes.
 */
import {
  and,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  ne,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import {
  CLOSED_JOB_GRACE_DAYS,
  COMPANY_TAG_LABELS,
  COMPANY_TAGS,
  LEVEL_LABELS,
  LEVELS,
  POSTED_WITHIN_HOURS,
  RECENT_FUNDING_DAYS,
  REMOTE_TYPE_LABELS,
  REMOTE_TYPES,
  ROLE_CATEGORIES,
  ROLE_CATEGORY_LABELS,
  SALARY_BAND_META,
  SALARY_BANDS,
  type CompanyBrief,
  type CompanyListItem,
  type CompanyTag,
  type FilterMeta,
  type FundingItem,
  type JobDetail,
  type JobFilters,
  type JobListItem,
  type Paginated,
} from '@roleup/core';
import type { Db } from './client';
import { cities, companies, fundings, jobs } from './schema';

const INDIA_ELIGIBLE = ['onsite', 'hybrid', 'remote_india', 'remote_global'] as const;
const REMOTE_KINDS = ['remote_india', 'remote_global', 'remote_restricted'] as const;

/* ---------------- cursor ---------------- */

export function encodeCursor(postedAt: Date, id: number): string {
  return Buffer.from(`${postedAt.toISOString()}|${id}`).toString('base64url');
}

export function decodeCursor(cursor: string | undefined): { postedAt: Date; id: number } | null {
  if (!cursor) return null;
  try {
    const [iso, id] = Buffer.from(cursor, 'base64url').toString('utf8').split('|');
    const d = new Date(iso ?? '');
    const n = Number(id);
    if (Number.isNaN(d.getTime()) || !Number.isInteger(n)) return null;
    return { postedAt: d, id: n };
  } catch {
    return null;
  }
}

/* ---------------- mappers ---------------- */

const companyBriefCols = {
  id: companies.id,
  name: companies.name,
  slug: companies.slug,
  logoUrl: companies.logoUrl,
  domain: companies.domain,
  tags: companies.tags,
  ycBatch: companies.ycBatch,
};

const jobListCols = {
  id: jobs.id,
  slug: jobs.slug,
  title: jobs.title,
  roleCategory: jobs.roleCategory,
  level: jobs.level,
  locationRaw: jobs.locationRaw,
  remoteType: jobs.remoteType,
  salaryMin: jobs.salaryMin,
  salaryMax: jobs.salaryMax,
  salaryCurrency: jobs.salaryCurrency,
  salaryInterval: jobs.salaryInterval,
  salaryMinInr: jobs.salaryMinInrAnnual,
  salaryMaxInr: jobs.salaryMaxInrAnnual,
  salaryBand: jobs.salaryBand,
  salarySource: jobs.salarySource,
  postedAt: jobs.postedAt,
  firstSeenAt: jobs.firstSeenAt,
  lastSeenAt: jobs.lastSeenAt,
  closedAt: jobs.closedAt,
  cityName: cities.name,
  citySlug: cities.slug,
  company: companyBriefCols,
};

type JobListRow = {
  id: number;
  slug: string;
  title: string;
  roleCategory: JobListItem['roleCategory'];
  level: JobListItem['level'];
  locationRaw: string;
  remoteType: JobListItem['remoteType'];
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryInterval: string | null;
  salaryMinInr: number | null;
  salaryMaxInr: number | null;
  salaryBand: (typeof SALARY_BANDS)[number];
  salarySource: 'employer' | 'none';
  postedAt: Date | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
  closedAt: Date | null;
  cityName: string | null;
  citySlug: string | null;
  company: Omit<CompanyBrief, 'tags'> & { tags: string[] };
};

function toCompanyBrief(c: JobListRow['company']): CompanyBrief {
  return {
    ...c,
    tags: c.tags.filter((t): t is CompanyTag => (COMPANY_TAGS as readonly string[]).includes(t)),
  };
}

function toJobListItem(r: JobListRow): JobListItem {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    company: toCompanyBrief(r.company),
    roleCategory: r.roleCategory,
    level: r.level,
    locationRaw: r.locationRaw,
    city: r.citySlug && r.cityName ? { name: r.cityName, slug: r.citySlug } : null,
    remoteType: r.remoteType,
    salary:
      r.salarySource === 'employer'
        ? {
            minInr: r.salaryMinInr,
            maxInr: r.salaryMaxInr,
            band: r.salaryBand,
            currency: r.salaryCurrency,
            min: r.salaryMin,
            max: r.salaryMax,
            interval: r.salaryInterval,
          }
        : null,
    postedAt: r.postedAt?.toISOString() ?? null,
    firstSeenAt: r.firstSeenAt.toISOString(),
    lastSeenAt: r.lastSeenAt.toISOString(),
    closedAt: r.closedAt?.toISOString() ?? null,
  };
}

/* ---------------- filters → SQL ---------------- */

export type ListFilters = Omit<JobFilters, 'limit' | 'cursor'> & {
  limit?: number;
  cursor?: string;
};

export function jobWhere(f: ListFilters, now: Date = new Date()): SQL {
  const conds: SQL[] = [isNull(jobs.closedAt)];
  if (f.q) conds.push(sql`${jobs.searchVector} @@ websearch_to_tsquery('simple', ${f.q})`);
  if (f.category) conds.push(eq(jobs.roleCategory, f.category));
  if (f.level) conds.push(eq(jobs.level, f.level));
  if (f.band) conds.push(eq(jobs.salaryBand, f.band));

  // Remote filter. Without one, US/EU-only remote roles are hidden (India-first feed).
  if (f.remote === 'any_remote') conds.push(inArray(jobs.remoteType, [...REMOTE_KINDS]));
  else if (f.remote) conds.push(eq(jobs.remoteType, f.remote));
  else if (f.city !== 'remote') conds.push(inArray(jobs.remoteType, [...INDIA_ELIGIBLE]));

  if (f.city === 'remote') conds.push(inArray(jobs.remoteType, ['remote_india', 'remote_global']));
  else if (f.city) conds.push(eq(cities.slug, f.city));

  if (f.tag) conds.push(sql`${companies.tags} @> ARRAY[${f.tag}]::text[]`);
  if (f.company) conds.push(eq(companies.slug, f.company));
  if (f.batch) conds.push(eq(sql`upper(${companies.ycBatch})`, f.batch.toUpperCase()));
  if (f.posted)
    conds.push(
      gte(jobs.postedAt, new Date(now.getTime() - POSTED_WITHIN_HOURS[f.posted] * 3_600_000)),
    );
  return and(...conds) as SQL;
}

/* ---------------- jobs ---------------- */

export async function listJobs(
  db: Db,
  f: ListFilters,
  opts: { withTotal?: boolean } = {},
): Promise<Paginated<JobListItem>> {
  const limit = f.limit ?? 30;
  const cur = decodeCursor(f.cursor);
  const where = jobWhere(f);
  const pageWhere = cur
    ? and(
        where,
        or(
          lt(jobs.postedAt, cur.postedAt),
          and(eq(jobs.postedAt, cur.postedAt), lt(jobs.id, cur.id)),
        ),
      )
    : where;

  const rows = (await db
    .select(jobListCols)
    .from(jobs)
    .innerJoin(companies, eq(companies.id, jobs.companyId))
    .leftJoin(cities, eq(cities.id, jobs.cityId))
    .where(pageWhere)
    .orderBy(desc(jobs.postedAt), desc(jobs.id))
    .limit(limit + 1)) as JobListRow[];

  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  const last = page[page.length - 1];
  const nextCursor = hasMore && last?.postedAt ? encodeCursor(last.postedAt, last.id) : null;

  let total: number | undefined;
  if (opts.withTotal) {
    const [t] = await db
      .select({ n: count() })
      .from(jobs)
      .innerJoin(companies, eq(companies.id, jobs.companyId))
      .leftJoin(cities, eq(cities.id, jobs.cityId))
      .where(where);
    total = t?.n ?? 0;
  }
  return { items: page.map(toJobListItem), nextCursor, total };
}

/** Job detail. Closed jobs remain viewable for CLOSED_JOB_GRACE_DAYS, then 404. */
export async function getJob(
  db: Db,
  by: { slug: string } | { id: number },
): Promise<JobDetail | null> {
  const graceStart = new Date(Date.now() - CLOSED_JOB_GRACE_DAYS * 86_400_000);
  const [row] = await db
    .select({
      ...jobListCols,
      descriptionText: jobs.descriptionText,
      applyUrl: jobs.applyUrl,
      department: jobs.department,
      employmentType: jobs.employmentType,
      minYears: jobs.minYears,
      source: jobs.source,
    })
    .from(jobs)
    .innerJoin(companies, eq(companies.id, jobs.companyId))
    .leftJoin(cities, eq(cities.id, jobs.cityId))
    .where(
      and(
        'slug' in by ? eq(jobs.slug, by.slug) : eq(jobs.id, by.id),
        or(isNull(jobs.closedAt), gt(jobs.closedAt, graceStart)),
      ),
    )
    .limit(1);
  if (!row) return null;
  const r = row as JobListRow & {
    descriptionText: string;
    applyUrl: string;
    department: string | null;
    employmentType: string | null;
    minYears: number | null;
    source: string;
  };
  return {
    ...toJobListItem(r),
    descriptionText: r.descriptionText,
    applyUrl: r.applyUrl,
    department: r.department,
    employmentType: r.employmentType,
    minYears: r.minYears,
    source: r.source,
  };
}

export async function similarJobs(db: Db, job: JobDetail, limit = 6): Promise<JobListItem[]> {
  const rows = (await db
    .select(jobListCols)
    .from(jobs)
    .innerJoin(companies, eq(companies.id, jobs.companyId))
    .leftJoin(cities, eq(cities.id, jobs.cityId))
    .where(
      and(
        isNull(jobs.closedAt),
        ne(jobs.id, job.id),
        eq(jobs.roleCategory, job.roleCategory),
        job.city ? eq(cities.slug, job.city.slug) : eq(jobs.remoteType, job.remoteType),
      ),
    )
    .orderBy(sql`(${jobs.level} = ${job.level}) desc`, desc(jobs.postedAt))
    .limit(limit)) as JobListRow[];
  return rows.map(toJobListItem);
}

/* ---------------- companies ---------------- */

const companyListCols = {
  ...companyBriefCols,
  website: companies.website,
  openJobsCount: companies.openJobsCount,
  hasIndiaOffice: companies.hasIndiaOffice,
  ats: companies.ats,
  lastCrawledAt: companies.lastCrawledAt,
};

type CompanyRow = Omit<CompanyListItem, 'tags' | 'lastCrawledAt'> & {
  tags: string[];
  lastCrawledAt: Date | null;
};

function toCompanyListItem(r: CompanyRow): CompanyListItem {
  return {
    ...toCompanyBrief(r),
    website: r.website,
    openJobsCount: r.openJobsCount,
    hasIndiaOffice: r.hasIndiaOffice,
    ats: r.ats,
    lastCrawledAt: r.lastCrawledAt?.toISOString() ?? null,
  };
}

export interface CompanyFilters {
  tag?: CompanyTag;
  city?: string;
  hasJobs?: boolean;
  q?: string;
  batch?: string;
}

export async function listCompanies(db: Db, f: CompanyFilters = {}): Promise<CompanyListItem[]> {
  const conds: SQL[] = [];
  if (f.tag) conds.push(sql`${companies.tags} @> ARRAY[${f.tag}]::text[]`);
  if (f.batch) conds.push(eq(sql`upper(${companies.ycBatch})`, f.batch.toUpperCase()));
  if (f.hasJobs) conds.push(gt(companies.openJobsCount, 0));
  if (f.q) conds.push(sql`${companies.name} ilike ${`%${f.q.replace(/[%_]/g, '')}%`}`);
  if (f.city) {
    conds.push(
      sql`exists (select 1 from ${jobs} j join ${cities} c on c.id = j.city_id where j.company_id = ${companies.id} and j.closed_at is null and c.slug = ${f.city})`,
    );
  }
  const rows = (await db
    .select(companyListCols)
    .from(companies)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(companies.openJobsCount), companies.name)) as CompanyRow[];
  return rows.map(toCompanyListItem);
}

export async function getCompany(
  db: Db,
  slug: string,
): Promise<(CompanyListItem & { careersUrl: string | null; fundings: FundingItem[] }) | null> {
  const [row] = await db
    .select({ ...companyListCols, careersUrl: companies.careersUrl })
    .from(companies)
    .where(eq(companies.slug, slug))
    .limit(1);
  if (!row) return null;
  const company = toCompanyListItem(row as CompanyRow);
  const fundingRows = await listFunding(db, { companyId: row.id, limit: 10 });
  return { ...company, careersUrl: row.careersUrl, fundings: fundingRows };
}

/** Open jobs per company, India-eligible only (for directory counts that match the default feed). */
export async function indiaJobCounts(db: Db): Promise<Map<number, number>> {
  const rows = await db
    .select({ companyId: jobs.companyId, n: count() })
    .from(jobs)
    .where(and(isNull(jobs.closedAt), inArray(jobs.remoteType, [...INDIA_ELIGIBLE])))
    .groupBy(jobs.companyId);
  return new Map(rows.map((r) => [r.companyId, r.n]));
}

/* ---------------- funding ---------------- */

export async function listFunding(
  db: Db,
  opts: {
    status?: 'approved' | 'pending' | 'rejected';
    companyId?: number;
    limit?: number;
    sinceDays?: number;
  } = {},
): Promise<FundingItem[]> {
  const conds: SQL[] = [eq(fundings.status, opts.status ?? 'approved')];
  if (opts.companyId) conds.push(eq(fundings.companyId, opts.companyId));
  if (opts.sinceDays) {
    const since = new Date(Date.now() - opts.sinceDays * 86_400_000).toISOString().slice(0, 10);
    conds.push(gte(fundings.announcedOn, since));
  }
  const rows = await db
    .select({
      id: fundings.id,
      round: fundings.round,
      amount: fundings.amount,
      currency: fundings.currency,
      amountUsd: fundings.amountUsd,
      amountInr: fundings.amountInr,
      investors: fundings.investors,
      announcedOn: fundings.announcedOn,
      sourceUrl: fundings.sourceUrl,
      sourceName: fundings.sourceName,
      status: fundings.status,
      company: { ...companyBriefCols, openJobsCount: companies.openJobsCount },
    })
    .from(fundings)
    .innerJoin(companies, eq(companies.id, fundings.companyId))
    .where(and(...conds))
    .orderBy(desc(fundings.announcedOn), desc(fundings.id))
    .limit(opts.limit ?? 100);
  return rows.map((r) => ({
    ...r,
    company: { ...toCompanyBrief(r.company), openJobsCount: r.company.openJobsCount },
  }));
}

export async function recentlyFundedCount(db: Db): Promise<number> {
  const since = new Date(Date.now() - RECENT_FUNDING_DAYS * 86_400_000).toISOString().slice(0, 10);
  const [r] = await db
    .select({ n: sql<number>`count(distinct ${fundings.companyId})::int` })
    .from(fundings)
    .where(and(eq(fundings.status, 'approved'), gte(fundings.announcedOn, since)));
  return r?.n ?? 0;
}

/* ---------------- meta ---------------- */

export async function filterMeta(db: Db): Promise<FilterMeta> {
  const open = and(isNull(jobs.closedAt), inArray(jobs.remoteType, [...INDIA_ELIGIBLE]));
  const openAll = isNull(jobs.closedAt);
  const group = async <K extends string>(col: SQL | typeof jobs.level, where = open) =>
    new Map(
      (
        await db
          .select({ k: sql<K>`${col}`, n: count() })
          .from(jobs)
          .where(where)
          .groupBy(sql`${col}`)
      ).map((r) => [r.k, r.n]),
    );

  const [total] = await db.select({ n: count() }).from(jobs).where(open);
  const [crawl] = await db
    .select({ t: sql<Date | null>`max(${companies.lastCrawledAt})` })
    .from(companies);
  const cats = await group<string>(sql`${jobs.roleCategory}`);
  const levels = await group<string>(sql`${jobs.level}`);
  const bands = await group<string>(sql`${jobs.salaryBand}`);
  const remote = await group<string>(sql`${jobs.remoteType}`, openAll);

  const cityRows = await db
    .select({ slug: cities.slug, name: cities.name, n: count() })
    .from(jobs)
    .innerJoin(cities, eq(cities.id, jobs.cityId))
    .where(open)
    .groupBy(cities.slug, cities.name)
    .orderBy(desc(count()));

  const tagRows = await db
    .select({ tag: sql<string>`unnest(${companies.tags})`, n: count() })
    .from(jobs)
    .innerJoin(companies, eq(companies.id, jobs.companyId))
    .where(open)
    .groupBy(sql`1`);
  const tagCounts = new Map(tagRows.map((r) => [r.tag, r.n]));

  const batchRows = await db
    .select({ batch: companies.ycBatch, n: count() })
    .from(jobs)
    .innerJoin(companies, eq(companies.id, jobs.companyId))
    .where(and(open, isNotNull(companies.ycBatch)))
    .groupBy(companies.ycBatch);

  const lastT = crawl?.t ? new Date(crawl.t) : null;
  return {
    totalOpenJobs: total?.n ?? 0,
    lastCrawledAt: lastT ? lastT.toISOString() : null,
    cities: cityRows.map((c) => ({ slug: c.slug, name: c.name, count: c.n })),
    categories: ROLE_CATEGORIES.map((v) => ({
      value: v,
      label: ROLE_CATEGORY_LABELS[v],
      count: cats.get(v) ?? 0,
    })),
    levels: LEVELS.map((v) => ({ value: v, label: LEVEL_LABELS[v], count: levels.get(v) ?? 0 })),
    bands: SALARY_BANDS.map((v) => ({
      value: v,
      label: SALARY_BAND_META[v].label,
      slug: SALARY_BAND_META[v].slug,
      count: bands.get(v) ?? 0,
    })),
    remote: REMOTE_TYPES.map((v) => ({
      value: v,
      label: REMOTE_TYPE_LABELS[v],
      count: remote.get(v) ?? 0,
    })),
    tags: COMPANY_TAGS.map((v) => ({
      value: v,
      label: COMPANY_TAG_LABELS[v],
      count: tagCounts.get(v) ?? 0,
    })),
    ycBatches: batchRows
      .filter((b): b is { batch: string; n: number } => !!b.batch)
      .map((b) => ({ batch: b.batch, count: b.n }))
      .sort((a, b) => batchSortKey(b.batch) - batchSortKey(a.batch)),
  };
}

/** Sort YC batches newest first: S25 > X25 > W25 > F24 … */
export function batchSortKey(batch: string): number {
  const m = /^([WXSF])(\d{2})$/i.exec(batch);
  if (!m) return 0;
  const season = { W: 0, X: 1, S: 2, F: 3 }[m[1]!.toUpperCase() as 'W' | 'X' | 'S' | 'F'];
  return Number(m[2]) * 10 + season;
}

/** Sitemap source: slugs that currently have open jobs. */
export async function sitemapData(db: Db) {
  const jobRows = await db
    .select({ slug: jobs.slug, lastSeenAt: jobs.lastSeenAt })
    .from(jobs)
    .where(and(isNull(jobs.closedAt), inArray(jobs.remoteType, [...INDIA_ELIGIBLE])))
    .orderBy(desc(jobs.postedAt))
    .limit(45_000);
  const companyRows = await db
    .select({ slug: companies.slug, updatedAt: companies.lastCrawledAt })
    .from(companies)
    .where(gt(companies.openJobsCount, 0));
  const meta = await filterMeta(db);
  return { jobs: jobRows, companies: companyRows, meta };
}
