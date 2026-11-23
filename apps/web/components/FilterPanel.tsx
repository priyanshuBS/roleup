import Link from 'next/link';
import { Search, X } from 'lucide-react';
import {
  POSTED_WITHIN,
  POSTED_WITHIN_LABELS,
  REMOTE_TYPE_LABELS,
  type FilterKey,
  type FilterMeta,
} from '@roleup/core';
import { listHref, type FilterState } from '@/lib/urls';

export interface FilterPanelProps {
  basePath: string;
  /** Effective filters (URL + route-fixed + defaults). */
  filters: FilterState;
  /** Filters that belong in the URL (route-fixed ones excluded). */
  urlState: FilterState;
  meta: Pick<FilterMeta, 'cities' | 'categories' | 'levels' | 'bands' | 'tags' | 'ycBatches'>;
  /** Filters fixed by the route (e.g. city on /jobs/in/pune); not shown. */
  locked?: FilterKey[];
  /** Filters with a route default (e.g. remote=any_remote on /remote-jobs). */
  defaults?: Partial<Record<FilterKey, string>>;
}

type Option = { value: string; label: string; count?: number };

const REMOTE_OPTIONS: Option[] = [
  { value: 'any_remote', label: 'Any remote' },
  { value: 'remote_india', label: REMOTE_TYPE_LABELS.remote_india },
  { value: 'remote_global', label: REMOTE_TYPE_LABELS.remote_global },
  { value: 'remote_restricted', label: REMOTE_TYPE_LABELS.remote_restricted },
  { value: 'hybrid', label: REMOTE_TYPE_LABELS.hybrid },
  { value: 'onsite', label: REMOTE_TYPE_LABELS.onsite },
];

const VISIBLE = 6;

function FacetRow({
  href,
  label,
  count,
  current,
}: {
  href: string;
  label: string;
  count?: number;
  current: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        scroll={false}
        className="facet"
        aria-current={current ? 'true' : undefined}
      >
        <span className="facet-mark" aria-hidden />
        <span className="min-w-0 truncate">{label}</span>
        {count !== undefined && (
          <span className="facet-count">{count.toLocaleString('en-IN')}</span>
        )}
      </Link>
    </li>
  );
}

function Facet({
  title,
  k,
  options,
  props,
  anyLabel,
}: {
  title: string;
  k: FilterKey;
  options: Option[];
  props: FilterPanelProps;
  anyLabel: string;
}) {
  if (options.length === 0) return null;
  const value = props.filters[k];
  const hasDefault = props.defaults?.[k] !== undefined;
  const href = (v: string | undefined) => listHref(props.basePath, { ...props.urlState, [k]: v });
  const rows = options.map((o) => (
    <FacetRow
      key={o.value}
      href={href(o.value)}
      label={o.label}
      count={o.count}
      current={value === o.value}
    />
  ));
  const hiddenHasCurrent = options.slice(VISIBLE).some((o) => o.value === value);
  return (
    <div>
      <h3 className="mb-1.5 text-xs font-medium uppercase tracking-[0.06em] text-text-subtle">
        {title}
      </h3>
      <ul>
        {/* "Any" clears the filter; omitted where the route has its own default. */}
        {!hasDefault && <FacetRow href={href(undefined)} label={anyLabel} current={!value} />}
        {rows.slice(0, VISIBLE)}
      </ul>
      {rows.length > VISIBLE && (
        <details className="group" open={hiddenHasCurrent}>
          <summary className="mt-0.5 inline-flex text-xs font-medium text-text-muted hover:text-text">
            <span className="group-open:hidden">Show {rows.length - VISIBLE} more</span>
            <span className="hidden group-open:inline">Show fewer</span>
          </summary>
          <ul className="mt-1">{rows.slice(VISIBLE)}</ul>
        </details>
      )}
    </div>
  );
}

/** Filter facets as plain links. Server-rendered; also used inside the mobile sheet. */
export function FilterFacets(props: FilterPanelProps) {
  const { meta, filters, locked = [] } = props;
  const show = (k: FilterKey) => !locked.includes(k);
  return (
    <div className="space-y-6">
      {show('remote') && (
        <Facet
          title="Work mode"
          k="remote"
          options={REMOTE_OPTIONS}
          props={props}
          anyLabel="India + remote OK"
        />
      )}
      {show('city') && (
        <Facet
          title="Location"
          k="city"
          props={props}
          anyLabel="All locations"
          options={[
            ...meta.cities.map((c) => ({ value: c.slug, label: c.name, count: c.count })),
            { value: 'remote', label: 'Remote only' },
          ]}
        />
      )}
      {show('category') && (
        <Facet
          title="Role"
          k="category"
          props={props}
          anyLabel="All roles"
          options={meta.categories.map((c) => ({ value: c.value, label: c.label, count: c.count }))}
        />
      )}
      {show('level') && (
        <Facet
          title="Experience"
          k="level"
          props={props}
          anyLabel="All levels"
          options={meta.levels.map((c) => ({ value: c.value, label: c.label, count: c.count }))}
        />
      )}
      {show('band') && (
        <Facet
          title="Salary per year"
          k="band"
          props={props}
          anyLabel="Any salary"
          options={meta.bands.map((b) => ({ value: b.value, label: b.label, count: b.count }))}
        />
      )}
      {show('tag') && (
        <Facet
          title="Company"
          k="tag"
          props={props}
          anyLabel="All companies"
          options={meta.tags
            .filter((t) => t.count > 0)
            .map((t) => ({ value: t.value, label: t.label, count: t.count }))}
        />
      )}
      {show('batch') && filters.tag === 'yc' && (
        <Facet
          title="YC batch"
          k="batch"
          props={props}
          anyLabel="All batches"
          options={meta.ycBatches.map((b) => ({ value: b.batch, label: b.batch, count: b.count }))}
        />
      )}
      {show('posted') && (
        <Facet
          title="Posted"
          k="posted"
          props={props}
          anyLabel="Any time"
          options={POSTED_WITHIN.map((p) => ({ value: p, label: POSTED_WITHIN_LABELS[p] }))}
        />
      )}
    </div>
  );
}

/**
 * Search over the current list. A plain GET form: Enter searches, other filters are kept as
 * hidden fields, and it works without JavaScript. No separate search button beside the field.
 */
export function SearchBox({
  basePath,
  urlState,
  placeholder = 'Search title, company or skill',
}: {
  basePath: string;
  urlState: FilterState;
  placeholder?: string;
}) {
  const q = urlState.q ?? '';
  const keep = Object.entries(urlState).filter(([k, v]) => k !== 'q' && v);
  return (
    <form action={basePath} role="search" className="input-group h-11 flex-1 px-3">
      {keep.map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <label htmlFor="list-q" className="sr-only">
        Search jobs
      </label>
      <Search size={16} aria-hidden className="mr-2.5 shrink-0 text-text-subtle" />
      <input
        key={q}
        id="list-q"
        name="q"
        type="search"
        defaultValue={q}
        placeholder={placeholder}
        maxLength={100}
        enterKeyHint="search"
        className="w-full text-sm"
      />
      {q && (
        <Link
          href={listHref(basePath, { ...urlState, q: undefined })}
          className="-mr-1 ml-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-subtle hover:bg-surface-muted hover:text-text"
          aria-label="Clear search"
        >
          <X size={15} aria-hidden />
        </Link>
      )}
      <button type="submit" className="sr-only">
        Search
      </button>
    </form>
  );
}
