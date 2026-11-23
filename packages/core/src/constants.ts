export const ROLE_CATEGORIES = [
  'backend',
  'frontend',
  'fullstack',
  'mobile',
  'data',
  'ml_ai',
  'devops',
  'security',
  'qa',
  'product',
  'design',
  'other_tech',
] as const;
export type RoleCategory = (typeof ROLE_CATEGORIES)[number];

export const ROLE_CATEGORY_LABELS: Record<RoleCategory, string> = {
  backend: 'Backend',
  frontend: 'Frontend',
  fullstack: 'Full Stack',
  mobile: 'Mobile',
  data: 'Data',
  ml_ai: 'ML/AI',
  devops: 'DevOps/SRE/Cloud',
  security: 'Security',
  qa: 'QA',
  product: 'Product',
  design: 'Design',
  other_tech: 'Other tech',
};

export const LEVELS = ['intern', 'entry', 'mid', 'senior', 'staff', 'manager'] as const;
export type Level = (typeof LEVELS)[number];

export const LEVEL_LABELS: Record<Level, string> = {
  intern: 'Intern',
  entry: 'Entry',
  mid: 'Mid',
  senior: 'Senior',
  staff: 'Staff+',
  manager: 'Manager',
};

export const REMOTE_TYPES = [
  'onsite',
  'hybrid',
  'remote_india',
  'remote_global',
  'remote_restricted',
] as const;
export type RemoteType = (typeof REMOTE_TYPES)[number];

export const REMOTE_TYPE_LABELS: Record<RemoteType, string> = {
  onsite: 'On-site',
  hybrid: 'Hybrid',
  remote_india: 'Remote (India OK)',
  remote_global: 'Remote (Global)',
  remote_restricted: 'Remote (Restricted: US/EU only)',
};

/** Short labels for dense rows. */
export const REMOTE_TYPE_SHORT: Record<RemoteType, string> = {
  onsite: 'On-site',
  hybrid: 'Hybrid',
  remote_india: 'Remote (India OK)',
  remote_global: 'Remote (Global)',
  remote_restricted: 'Remote (US/EU only)',
};

/** Salary bands in INR lakhs per annum. Boundaries are [min, max) in LPA, based on the top of the range. */
export const SALARY_BANDS = [
  'lt10',
  '10to20',
  '20to40',
  '40to70',
  '70plus',
  'undisclosed',
] as const;
export type SalaryBand = (typeof SALARY_BANDS)[number];

export const SALARY_BAND_META: Record<
  SalaryBand,
  { label: string; slug: string; minLpa: number | null; maxLpa: number | null }
> = {
  lt10: { label: '<10L', slug: 'under-10-lpa', minLpa: 0, maxLpa: 10 },
  '10to20': { label: '10–20L', slug: '10-20-lpa', minLpa: 10, maxLpa: 20 },
  '20to40': { label: '20–40L', slug: '20-40-lpa', minLpa: 20, maxLpa: 40 },
  '40to70': { label: '40–70L', slug: '40-70-lpa', minLpa: 40, maxLpa: 70 },
  '70plus': { label: '70L+', slug: '70-lpa-plus', minLpa: 70, maxLpa: null },
  undisclosed: { label: 'Salary not disclosed', slug: 'not-disclosed', minLpa: null, maxLpa: null },
};

export function salaryBandFromSlug(slug: string): SalaryBand | undefined {
  return SALARY_BANDS.find((b) => SALARY_BAND_META[b].slug === slug);
}

export const COMPANY_TAGS = [
  'yc',
  'big_tech',
  'product',
  'startup',
  'unicorn',
  'gcc',
  'remote_first',
  'recently_funded',
] as const;
export type CompanyTag = (typeof COMPANY_TAGS)[number];

export const COMPANY_TAG_LABELS: Record<CompanyTag, string> = {
  yc: 'YC',
  big_tech: 'FAANG/Big Tech',
  product: 'Product',
  startup: 'Startup',
  unicorn: 'Unicorn',
  gcc: 'GCC',
  remote_first: 'Remote-first',
  recently_funded: 'Recently funded',
};

export const POSTED_WITHIN = ['24h', '7d', '30d'] as const;
export type PostedWithin = (typeof POSTED_WITHIN)[number];
export const POSTED_WITHIN_LABELS: Record<PostedWithin, string> = {
  '24h': 'Last 24 hours',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
};
export const POSTED_WITHIN_HOURS: Record<PostedWithin, number> = {
  '24h': 24,
  '7d': 168,
  '30d': 720,
};

export const ATS_PROVIDERS = ['greenhouse', 'lever', 'ashby', 'none'] as const;
export type AtsProvider = (typeof ATS_PROVIDERS)[number];

export const CRAWL_STATUSES = ['pending', 'ok', 'error', 'invalid_slug'] as const;
export type CrawlStatus = (typeof CRAWL_STATUSES)[number];

export const FUNDING_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type FundingStatus = (typeof FUNDING_STATUSES)[number];

export const FUNDING_ROUNDS = [
  'Pre-Seed',
  'Seed',
  'Pre-Series A',
  'Series A',
  'Series B',
  'Series C',
  'Series D',
  'Series E',
  'Series F',
  'Bridge',
  'Debt',
  'Undisclosed',
] as const;
export type FundingRound = (typeof FUNDING_ROUNDS)[number];

/** Closed jobs stay viewable (with a banner) for this long, then disappear. */
export const CLOSED_JOB_GRACE_DAYS = 30;
/** Funding counts as "recent" for this long. */
export const RECENT_FUNDING_DAYS = 180;

export const DEFAULT_PAGE_SIZE = 30;
export const MAX_PAGE_SIZE = 100;
