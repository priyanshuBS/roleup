/**
 * Cached data access for pages and API routes. Results are cached in Next's data cache for
 * REVALIDATE_SECONDS, keyed by arguments, so dynamic (filtered) pages stay cheap on the DB.
 */
import { unstable_cache } from 'next/cache';
import {
  filterMeta,
  getCompany,
  getDb,
  getJob,
  indiaJobCounts,
  listCompanies,
  listFunding,
  listJobs,
  similarJobs,
  sitemapData,
  type CompanyFilters,
  type ListFilters,
} from '@roleup/db';
import type { JobDetail } from '@roleup/core';
import { REVALIDATE_SECONDS } from './site';

const opts = { revalidate: REVALIDATE_SECONDS, tags: ['jobs'] };

export const getJobs = unstable_cache(
  (filters: ListFilters) => listJobs(getDb(), filters, { withTotal: true }),
  ['jobs-list-v1'],
  opts,
);

export const getMeta = unstable_cache(() => filterMeta(getDb()), ['filter-meta-v1'], opts);

export const getJobBySlug = unstable_cache(
  (slug: string) => getJob(getDb(), { slug }),
  ['job-by-slug-v1'],
  opts,
);

export const getJobById = unstable_cache(
  (id: number) => getJob(getDb(), { id }),
  ['job-by-id-v1'],
  opts,
);

export const getSimilarJobs = unstable_cache(
  (job: JobDetail) => similarJobs(getDb(), job),
  ['similar-jobs-v1'],
  opts,
);

export const getCompanies = unstable_cache(
  async (filters: CompanyFilters) => {
    const db = getDb();
    const [list, india] = await Promise.all([listCompanies(db, filters), indiaJobCounts(db)]);
    return list.map((c) => ({ ...c, indiaJobsCount: india.get(c.id) ?? 0 }));
  },
  ['companies-v1'],
  opts,
);

export const getCompanyBySlug = unstable_cache(
  (slug: string) => getCompany(getDb(), slug),
  ['company-v1'],
  opts,
);

export const getFunding = unstable_cache(
  (limit: number) => listFunding(getDb(), { status: 'approved', limit }),
  ['funding-v1'],
  { revalidate: REVALIDATE_SECONDS, tags: ['jobs', 'funding'] },
);

export const getSitemapData = unstable_cache(() => sitemapData(getDb()), ['sitemap-v1'], {
  revalidate: 3600,
  tags: ['jobs'],
});
