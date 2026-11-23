import {
  FILTER_KEYS,
  formatCount,
  parseJobFilters,
  timeAgo,
  type FilterKey,
  type JobFilters,
} from '@roleup/core';
import type { ListFilters } from '@roleup/db';
import { getJobs, getMeta } from '@/lib/data';
import { listHref, type FilterState } from '@/lib/urls';
import { FilterPanel } from './FilterPanel';
import { JobList } from './JobList';

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Build a cache-key-stable filter object (fixed key order, no undefined values). */
export function normalizeFilters(f: Partial<JobFilters>): ListFilters {
  const out: Record<string, unknown> = {};
  for (const k of FILTER_KEYS) if (f[k] !== undefined && f[k] !== '') out[k] = f[k];
  if (f.cursor) out.cursor = f.cursor;
  out.limit = f.limit ?? 30;
  return out as ListFilters;
}

export function filterState(f: Partial<JobFilters>): FilterState {
  const out: FilterState = {};
  for (const k of FILTER_KEYS) if (f[k] !== undefined) out[k] = String(f[k]);
  return out;
}

export async function ListPage({
  basePath,
  searchParams,
  fixed = {},
  defaults = {},
  title,
  intro,
  above,
  emptyText,
}: {
  basePath: string;
  searchParams: SearchParams;
  /** Filters implied by the route, e.g. { city: 'pune' } on /jobs/in/pune. */
  fixed?: Partial<Record<FilterKey, string>>;
  /** Applied when absent from the URL, but still changeable (not locked). */
  defaults?: Partial<Record<FilterKey, string>>;
  title: string;
  intro?: React.ReactNode;
  above?: React.ReactNode;
  emptyText?: string;
}) {
  const sp = await searchParams;
  const withDefaults = {
    ...defaults,
    ...Object.fromEntries(Object.entries(sp).filter(([, v]) => v !== undefined && v !== '')),
  };
  const merged: JobFilters = parseJobFilters(withDefaults);
  const fixedParsed = parseJobFilters(fixed);
  for (const k of Object.keys(fixed) as FilterKey[]) {
    (merged as Record<string, unknown>)[k] = fixedParsed[k];
  }
  const [data, meta] = await Promise.all([getJobs(normalizeFilters(merged)), getMeta()]);
  const locked = Object.keys(fixed) as FilterKey[];
  const state = filterState(merged);
  // URL filters exclude the route-fixed ones (they're in the path).
  const urlState = Object.fromEntries(
    Object.entries(state).filter(([k]) => !locked.includes(k as FilterKey)),
  );
  const total = data.total ?? data.items.length;

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-text-muted tabular-nums">
          {formatCount(total)} open tech {total === 1 ? 'job' : 'jobs'}
          {meta.lastCrawledAt && <> · updated {timeAgo(meta.lastCrawledAt)}</>}
        </p>
        {intro && <div className="mt-2 max-w-2xl text-sm text-text-muted">{intro}</div>}
      </div>
      {above}
      <div className="flex flex-col gap-4 lg:flex-row lg:gap-8">
        <FilterPanel basePath={basePath} filters={state} meta={meta} locked={locked} />
        <section aria-label="Jobs" className="min-w-0 flex-1">
          <JobList
            jobs={data.items}
            nextHref={data.nextCursor ? listHref(basePath, urlState, data.nextCursor) : null}
            firstHref={listHref(basePath, urlState)}
            isPaged={Boolean(merged.cursor)}
            emptyText={emptyText}
            clearHref={Object.keys(urlState).length ? basePath : undefined}
          />
        </section>
      </div>
    </div>
  );
}
