import type {
  AtsProvider,
  CompanyTag,
  FundingStatus,
  Level,
  RemoteType,
  RoleCategory,
  SalaryBand,
} from './constants';

/** A job as produced by a source parser, before classification. */
export interface RawSourceJob {
  source: Exclude<AtsProvider, 'none'>;
  sourceJobId: string;
  title: string;
  department: string | null;
  descriptionText: string;
  applyUrl: string;
  locationRaw: string;
  /** Extra signals from the source used by the location classifier. */
  workplaceHint: 'remote' | 'hybrid' | 'onsite' | null;
  countryHint: string | null;
  employmentType: string | null;
  salary: RawSalary | null;
  postedAt: Date | null;
}

export type SalaryInterval = 'year' | 'month' | 'week' | 'day' | 'hour';

export interface RawSalary {
  min: number | null;
  max: number | null;
  currency: string;
  interval: SalaryInterval;
}

/** The single normalized job shape the crawler upserts. */
export interface NormalizedJob extends RawSourceJob {
  roleCategory: RoleCategory;
  level: Level;
  minYears: number | null;
  citySlug: string | null;
  country: string | null;
  remoteType: RemoteType;
  salaryMinInrAnnual: number | null;
  salaryMaxInrAnnual: number | null;
  salaryBand: SalaryBand;
  salarySource: 'employer' | 'none';
  fingerprint: string;
}

/* ---------- Public API DTOs (shared by web and mobile) ---------- */

export interface CompanyBrief {
  id: number;
  name: string;
  slug: string;
  logoUrl: string | null;
  domain: string | null;
  tags: CompanyTag[];
  ycBatch: string | null;
}

export interface JobListItem {
  id: number;
  slug: string;
  title: string;
  company: CompanyBrief;
  roleCategory: RoleCategory;
  level: Level;
  locationRaw: string;
  city: { name: string; slug: string } | null;
  remoteType: RemoteType;
  salary: {
    minInr: number | null;
    maxInr: number | null;
    band: SalaryBand;
    currency: string | null;
    min: number | null;
    max: number | null;
    interval: string | null;
  } | null;
  postedAt: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  closedAt: string | null;
}

export interface JobDetail extends JobListItem {
  descriptionText: string;
  applyUrl: string;
  department: string | null;
  employmentType: string | null;
  minYears: number | null;
  source: string;
}

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
  total?: number;
}

export interface CompanyListItem extends CompanyBrief {
  website: string | null;
  openJobsCount: number;
  hasIndiaOffice: boolean;
  ats: AtsProvider;
  lastCrawledAt: string | null;
}

export interface FundingItem {
  id: number;
  company: CompanyBrief & { openJobsCount: number };
  round: string;
  amount: number | null;
  currency: string | null;
  amountUsd: number | null;
  amountInr: number | null;
  investors: string[];
  announcedOn: string;
  sourceUrl: string;
  sourceName: string;
  status: FundingStatus;
}

export interface FilterMeta {
  totalOpenJobs: number;
  lastCrawledAt: string | null;
  cities: { slug: string; name: string; count: number }[];
  categories: { value: RoleCategory; label: string; count: number }[];
  levels: { value: Level; label: string; count: number }[];
  bands: { value: SalaryBand; label: string; slug: string; count: number }[];
  remote: { value: RemoteType; label: string; count: number }[];
  tags: { value: CompanyTag; label: string; count: number }[];
  ycBatches: { batch: string; count: number }[];
}
