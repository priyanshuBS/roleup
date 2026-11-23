import Link from 'next/link';
import { Briefcase, X, type LucideIcon } from 'lucide-react';
import {
  COMPANY_TAG_LABELS,
  FILTER_KEYS,
  formatCount,
  LEVEL_LABELS,
  parseJobFilters,
  POSTED_WITHIN_LABELS,
  REMOTE_TYPE_LABELS,
  ROLE_CATEGORY_LABELS,
  SALARY_BAND_META,
  timeAgo,
  type FilterKey,
  type FilterMeta,
  type JobFilters,
} from '@roleup/core';
import type { ListFilters } from '@roleup/db';
import { getJobs, getMeta } from '@/lib/data';
import { listHref, type FilterState } from '@/lib/urls';
import { FilterFacets, SearchBox } from './FilterPanel';
import { JobList } from './JobList';
import { MobileFilters } from './MobileFilters';
import { MetaPill, PageHeader } from './PageHeader';

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

/** Human label for an active filter chip. */
function chipLabel(k: FilterKey, v: string, meta: FilterMeta): string {
  switch (k) {
    case 'q':
      return `“${v}”`;
    case 'category':
      return ROLE_CATEGORY_LABELS[v as keyof typeof ROLE_CATEGORY_LABELS] ?? v;
    case 'level':
      return LEVEL_LABELS[v as keyof typeof LEVEL_LABELS] ?? v;
    case 'city':
      return v === 'remote' ? 'Remote' : (meta.cities.find((c) => c.slug === v)?.name ?? v);
    case 'remote':
      return v === 'any_remote'
        ? 'Any remote'
        : (REMOTE_TYPE_LABELS[v as keyof typeof REMOTE_TYPE_LABELS] ?? v);
    case 'band':
      return SALARY_BAND_META[v as keyof typeof SALARY_BAND_META]?.label ?? v;
    case 'tag':
      return COMPANY_TAG_LABELS[v as keyof typeof COMPANY_TAG_LABELS] ?? v;
    case 'posted':
      return POSTED_WITHIN_LABELS[v as keyof typeof POSTED_WITHIN_LABELS] ?? v;
    case 'batch':
      return `YC ${v}`;
    default:
      return v;
  }
}

export async function ListPage({
  basePath,
  searchParams,
  fixed = {},
  defaults = {},
  title,
  intro,
  above,
  hero,
  emptyText,
  icon = Briefcase,
  eyebrow = 'Jobs',
  listHeading = { eyebrow: '', title: 'Latest openings' },
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
  /** Replaces the title block (home page). */
  hero?: React.ReactNode;
  emptyText?: string;
  icon?: LucideIcon;
  eyebrow?: string;
  /** Heading above the list when a custom hero replaces the title block. */
  listHeading?: { eyebrow: string; title: string };
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
  const urlState: FilterState = Object.fromEntries(
    Object.entries(state).filter(([k]) => !locked.includes(k as FilterKey)),
  );
  const total = data.total ?? data.items.length;
  const active = (Object.entries(urlState) as [FilterKey, string][]).filter(
    ([k, v]) => v && !(k in defaults && defaults[k] === v),
  );

  const facetProps = { basePath, filters: state, urlState, meta, locked, defaults };
  const filterCount = active.filter(([k]) => k !== 'q').length;

  return (
    <div>
      {hero ?? (
        <PageHeader
          icon={icon}
          eyebrow={eyebrow}
          title={title}
          description={intro}
          meta={
            <>
              <MetaPill>
                <span className="num font-medium text-text">{formatCount(total)}</span> open{' '}
                {total === 1 ? 'job' : 'jobs'}
              </MetaPill>
              {meta.lastCrawledAt && <MetaPill>updated {timeAgo(meta.lastCrawledAt)}</MetaPill>}
            </>
          }
        />
      )}
      {hero && (
        <h2 id="jobs" className="mb-5 scroll-mt-24 text-xl font-semibold tracking-[-0.02em]">
          {listHeading.title}
        </h2>
      )}
      {above}
      <div className="lg:grid lg:grid-cols-[224px_minmax(0,1fr)] lg:gap-10">
        <aside aria-label="Filters" className="hidden lg:block">
          <div className="sticky top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto pb-6 pr-1">
            <FilterFacets {...facetProps} />
          </div>
        </aside>
        <section aria-label="Jobs" className="min-w-0">
          <div className="mb-4 flex gap-2">
            {!hero || urlState.q ? (
              <SearchBox basePath={basePath} urlState={urlState} />
            ) : (
              <div className="hidden flex-1 lg:block" />
            )}
            <MobileFilters
              activeCount={filterCount}
              clearHref={Object.keys(urlState).length ? basePath : undefined}
            >
              <FilterFacets {...facetProps} />
            </MobileFilters>
          </div>
          <div className="mb-3 flex min-h-7 flex-wrap items-center gap-1.5 text-sm">
            <p className="mr-2 text-text-muted" aria-live="polite">
              <span className="num font-medium text-text">{formatCount(total)}</span>{' '}
              {total === 1 ? 'job' : 'jobs'}
              <span className="text-text-subtle"> · newest first</span>
            </p>
            {active.map(([k, v]) => (
              <Link
                key={k}
                href={listHref(basePath, { ...urlState, [k]: undefined })}
                scroll={false}
                className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-surface pl-2.5 pr-1.5 text-xs font-medium text-text hover:border-border-strong"
                aria-label={`Remove filter ${chipLabel(k, v, meta)}`}
              >
                {chipLabel(k, v, meta)}
                <X size={12} aria-hidden className="text-text-subtle" />
              </Link>
            ))}
            {active.length > 1 && (
              <Link
                href={basePath}
                scroll={false}
                className="ml-1 text-xs text-text-muted underline-offset-2 hover:text-text hover:underline"
              >
                Clear all
              </Link>
            )}
          </div>
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
