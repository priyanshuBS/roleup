import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import {
  ATS_PROVIDERS,
  CRAWL_STATUSES,
  FUNDING_STATUSES,
  LEVELS,
  REMOTE_TYPES,
  ROLE_CATEGORIES,
  SALARY_BANDS,
} from '@roleup/core';

const tsvector = customType<{ data: string }>({
  dataType: () => 'tsvector',
});

export const atsEnum = pgEnum('ats_provider', ATS_PROVIDERS);
export const crawlStatusEnum = pgEnum('crawl_status', CRAWL_STATUSES);
export const remoteTypeEnum = pgEnum('remote_type', REMOTE_TYPES);
export const roleCategoryEnum = pgEnum('role_category', ROLE_CATEGORIES);
export const levelEnum = pgEnum('job_level', LEVELS);
export const salaryBandEnum = pgEnum('salary_band', SALARY_BANDS);
export const salarySourceEnum = pgEnum('salary_source', ['employer', 'none']);
export const fundingStatusEnum = pgEnum('funding_status', FUNDING_STATUSES);

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const cities = pgTable('cities', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  state: text('state'),
  country: text('country').notNull().default('IN'),
  aliases: text('aliases')
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
});

export const companies = pgTable(
  'companies',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    website: text('website'),
    domain: text('domain'),
    logoUrl: text('logo_url'),
    careersUrl: text('careers_url'),
    ats: atsEnum('ats').notNull().default('none'),
    atsSlug: text('ats_slug'),
    tags: text('tags')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    ycBatch: text('yc_batch'),
    hqCountry: text('hq_country'),
    hasIndiaOffice: boolean('has_india_office').notNull().default(false),
    lastCrawledAt: timestamp('last_crawled_at', { withTimezone: true }),
    crawlStatus: crawlStatusEnum('crawl_status').notNull().default('pending'),
    crawlError: text('crawl_error'),
    /** Set when ATS detection should run for this company (new funded company, admin trigger). */
    atsDetectRequestedAt: timestamp('ats_detect_requested_at', { withTimezone: true }),
    openJobsCount: integer('open_jobs_count').notNull().default(0),
    ...timestamps,
  },
  (t) => [
    index('companies_tags_gin').using('gin', t.tags),
    index('companies_domain_idx').on(t.domain),
    index('companies_yc_batch_idx').on(t.ycBatch),
  ],
);

export const jobs = pgTable(
  'jobs',
  {
    id: serial('id').primaryKey(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    source: atsEnum('source').notNull(),
    sourceJobId: text('source_job_id').notNull(),
    title: text('title').notNull(),
    slug: text('slug').notNull().unique(),
    roleCategory: roleCategoryEnum('role_category').notNull(),
    level: levelEnum('level').notNull(),
    minYears: integer('min_years'),
    department: text('department'),
    descriptionText: text('description_text').notNull().default(''),
    applyUrl: text('apply_url').notNull(),
    locationRaw: text('location_raw').notNull().default(''),
    cityId: integer('city_id').references(() => cities.id, { onDelete: 'set null' }),
    country: text('country'),
    remoteType: remoteTypeEnum('remote_type').notNull(),
    employmentType: text('employment_type'),
    salaryMin: real('salary_min'),
    salaryMax: real('salary_max'),
    salaryCurrency: text('salary_currency'),
    salaryInterval: text('salary_interval'),
    salaryMinInrAnnual: bigint('salary_min_inr_annual', { mode: 'number' }),
    salaryMaxInrAnnual: bigint('salary_max_inr_annual', { mode: 'number' }),
    salaryBand: salaryBandEnum('salary_band').notNull().default('undisclosed'),
    salarySource: salarySourceEnum('salary_source').notNull().default('none'),
    postedAt: timestamp('posted_at', { withTimezone: true }),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    fingerprint: text('fingerprint').notNull(),
    /** Weighted FTS vector: title (A), company name (A), department (B), description (C). */
    searchVector: tsvector('search_vector'),
  },
  (t) => [
    uniqueIndex('jobs_source_job_uq').on(t.source, t.sourceJobId),
    index('jobs_open_posted_idx').on(t.closedAt, t.postedAt.desc()),
    index('jobs_company_idx').on(t.companyId),
    index('jobs_city_idx').on(t.cityId),
    index('jobs_salary_band_idx').on(t.salaryBand),
    index('jobs_level_idx').on(t.level),
    index('jobs_role_category_idx').on(t.roleCategory),
    index('jobs_remote_type_idx').on(t.remoteType),
    index('jobs_fingerprint_idx').on(t.fingerprint),
    index('jobs_search_gin').using('gin', t.searchVector),
  ],
);

export const fundings = pgTable(
  'fundings',
  {
    id: serial('id').primaryKey(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    round: text('round').notNull(),
    amount: real('amount'),
    currency: text('currency'),
    amountUsd: bigint('amount_usd', { mode: 'number' }),
    amountInr: bigint('amount_inr', { mode: 'number' }),
    investors: text('investors')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    announcedOn: date('announced_on', { mode: 'string' }).notNull(),
    sourceUrl: text('source_url').notNull(),
    sourceName: text('source_name').notNull(),
    /** The headline we extracted from (facts only; never the article body). */
    headline: text('headline'),
    status: fundingStatusEnum('status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('fundings_source_url_uq').on(t.sourceUrl),
    index('fundings_status_announced_idx').on(t.status, t.announcedOn.desc()),
    index('fundings_company_idx').on(t.companyId),
  ],
);

export const crawlRuns = pgTable('crawl_runs', {
  id: serial('id').primaryKey(),
  worker: text('worker').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  companiesOk: integer('companies_ok').notNull().default(0),
  companiesFailed: integer('companies_failed').notNull().default(0),
  jobsAdded: integer('jobs_added').notNull().default(0),
  jobsUpdated: integer('jobs_updated').notNull().default(0),
  jobsClosed: integer('jobs_closed').notNull().default(0),
  errors: jsonb('errors').$type<{ company?: string; message: string }[]>().notNull().default([]),
});

/** Fixed-window rate limiting (ATS checker, admin). Keys are hashed IPs, never raw. */
export const rateLimits = pgTable('rate_limits', {
  key: text('key').primaryKey(),
  windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
  count: integer('count').notNull().default(0),
});

export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
export type Funding = typeof fundings.$inferSelect;
export type NewFunding = typeof fundings.$inferInsert;
export type City = typeof cities.$inferSelect;
export type CrawlRun = typeof crawlRuns.$inferSelect;
