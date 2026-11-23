import { filtersToQuery, type FilterKey } from '@roleup/core';

export type FilterState = Partial<Record<FilterKey, string | undefined>>;

/** href for a list page with filters (cursor dropped unless given). */
export function listHref(basePath: string, filters: FilterState, cursor?: string | null): string {
  const qs = filtersToQuery({ ...filters, cursor: cursor ?? undefined });
  return qs ? `${basePath}?${qs}` : basePath;
}

export const jobHref = (slug: string) => `/jobs/${slug}`;
export const companyHref = (slug: string) => `/companies/${slug}`;
export const cityHref = (slug: string) => `/jobs/in/${slug}`;
export const bandHref = (bandSlug: string) => `/jobs/salary/${bandSlug}`;
export const ycBatchHref = (batch: string) => `/yc-jobs/${batch.toLowerCase()}`;
