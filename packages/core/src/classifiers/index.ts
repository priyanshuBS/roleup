import type { NormalizedJob, RawSourceJob } from '../types';
import { slugify } from '../format';
import { jobFingerprint, shortHash } from './fingerprint';
import { classifyLevel } from './level';
import { classifyLocation } from './location';
import { classifyRoleCategory } from './role-category';
import { normalizeSalary } from './salary';
import { isTechJob } from './tech-filter';

export * from './html';
export * from './tech-filter';
export * from './role-category';
export * from './level';
export * from './location';
export * from './salary';
export * from './fingerprint';

export interface CompanyContext {
  id: number;
  slug: string;
  hqCountry?: string | null;
  tags?: string[];
}

export type NormalizeResult =
  { kept: true; job: NormalizedJob } | { kept: false; reason: 'non_tech' | 'not_india_relevant' };

/**
 * Raw source job → normalized job, or a reason it's dropped. Pure.
 * We keep tech jobs that someone in India can apply to: onsite/hybrid in India, remote India,
 * remote global, and remote-restricted (shown under its own label so the restriction is visible).
 * Onsite/hybrid roles outside India are dropped.
 */
export function normalizeJob(
  raw: RawSourceJob,
  company: CompanyContext,
  usdInrRate: number,
): NormalizeResult {
  if (!isTechJob(raw.title, raw.department)) return { kept: false, reason: 'non_tech' };

  const loc = classifyLocation({
    locationRaw: raw.locationRaw,
    workplaceHint: raw.workplaceHint,
    countryHint: raw.countryHint,
    description: raw.descriptionText,
    companyHqCountry: company.hqCountry ?? null,
    companyRemoteFirst: company.tags?.includes('remote_first') ?? false,
  });
  const isRemote = loc.remoteType.startsWith('remote_');
  if (!isRemote && !loc.indiaEligible) return { kept: false, reason: 'not_india_relevant' };

  const { level, minYears } = classifyLevel(raw.title, raw.descriptionText);
  const roleCategory = classifyRoleCategory(raw.title, raw.department, raw.descriptionText);
  const salary = normalizeSalary(raw.salary, usdInrRate);

  return {
    kept: true,
    job: {
      ...raw,
      roleCategory,
      level,
      minYears,
      citySlug: loc.citySlug,
      country: loc.country,
      remoteType: loc.remoteType,
      salaryMinInrAnnual: salary.minInrAnnual,
      salaryMaxInrAnnual: salary.maxInrAnnual,
      salaryBand: salary.band,
      salarySource: salary.source,
      fingerprint: jobFingerprint(company.id, raw.title, loc.citySlug ?? loc.remoteType),
    },
  };
}

export function jobSlug(
  title: string,
  companySlug: string,
  source: string,
  sourceJobId: string,
): string {
  return `${slugify(title, 70)}-at-${companySlug}-${shortHash(`${source}:${sourceJobId}`)}`;
}
