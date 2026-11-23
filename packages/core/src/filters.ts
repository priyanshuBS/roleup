import { z } from 'zod';
import {
  COMPANY_TAGS,
  DEFAULT_PAGE_SIZE,
  LEVELS,
  MAX_PAGE_SIZE,
  POSTED_WITHIN,
  REMOTE_TYPES,
  ROLE_CATEGORIES,
  SALARY_BANDS,
} from './constants';

/**
 * Job list filters. The same shape is used in the website URL query string, the public API
 * (`GET /api/v1/jobs`) and the mobile app. Unknown or invalid values are dropped rather than
 * rejected so that old shared links never 400.
 */
const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .string()
    .optional()
    .transform((v) =>
      v && (values as readonly string[]).includes(v) ? (v as T[number]) : undefined,
    );

/** Remote filter accepts the remote types plus `any_remote` (all three remote kinds). */
export const REMOTE_FILTERS = [...REMOTE_TYPES, 'any_remote'] as const;
export type RemoteFilter = (typeof REMOTE_FILTERS)[number];

export const jobFiltersSchema = z.object({
  q: z
    .string()
    .optional()
    .transform((v) => (v ? v.trim().slice(0, 100) || undefined : undefined)),
  category: optionalEnum(ROLE_CATEGORIES),
  level: optionalEnum(LEVELS),
  city: z
    .string()
    .optional()
    .transform((v) => (v && /^[a-z0-9-]{2,40}$/.test(v) ? v : undefined)),
  remote: optionalEnum(REMOTE_FILTERS),
  band: optionalEnum(SALARY_BANDS),
  tag: optionalEnum(COMPANY_TAGS),
  posted: optionalEnum(POSTED_WITHIN),
  company: z
    .string()
    .optional()
    .transform((v) => (v && /^[a-z0-9-]{1,80}$/.test(v) ? v : undefined)),
  batch: z
    .string()
    .optional()
    .transform((v) => (v && /^[A-Za-z0-9 ]{2,20}$/.test(v) ? v : undefined)),
  cursor: z.string().max(200).optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_SIZE)
    .optional()
    .catch(undefined)
    .transform((v) => v ?? DEFAULT_PAGE_SIZE),
});

export type JobFilters = z.output<typeof jobFiltersSchema>;
export type JobFiltersInput = Partial<Record<keyof JobFilters, string | number | undefined>>;

/** Keys that are part of the shareable filter state (excludes paging). */
export const FILTER_KEYS = [
  'q',
  'category',
  'level',
  'city',
  'remote',
  'band',
  'tag',
  'posted',
  'company',
  'batch',
] as const satisfies readonly (keyof JobFilters)[];
export type FilterKey = (typeof FILTER_KEYS)[number];

type ParamSource =
  URLSearchParams | Record<string, string | string[] | undefined> | Iterable<[string, string]>;

function toRecord(src: ParamSource): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  if (src instanceof URLSearchParams || Symbol.iterator in src) {
    for (const [k, v] of src as Iterable<[string, string]>) if (!(k in out)) out[k] = v;
    return out;
  }
  for (const [k, v] of Object.entries(src)) {
    out[k] = Array.isArray(v) ? v[0] : v;
  }
  return out;
}

export function parseJobFilters(src: ParamSource): JobFilters {
  return jobFiltersSchema.parse(toRecord(src));
}

/** Serialize filters to a query string (without leading "?"). Stable key order for caching. */
export function filtersToQuery(
  filters: Partial<Record<FilterKey | 'cursor', string | undefined>>,
): string {
  const params = new URLSearchParams();
  for (const key of [...FILTER_KEYS, 'cursor'] as const) {
    const v = filters[key];
    if (v) params.set(key, v);
  }
  return params.toString();
}

export function activeFilterCount(filters: Partial<Record<FilterKey, unknown>>): number {
  return FILTER_KEYS.filter((k) => filters[k] !== undefined && filters[k] !== '').length;
}
