'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { SlidersHorizontal, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  activeFilterCount,
  POSTED_WITHIN,
  POSTED_WITHIN_LABELS,
  REMOTE_TYPE_LABELS,
  type FilterKey,
  type FilterMeta,
} from '@roleup/core';
import { listHref, type FilterState } from '@/lib/urls';

export interface FilterPanelProps {
  basePath: string;
  filters: FilterState;
  meta: Pick<FilterMeta, 'cities' | 'categories' | 'levels' | 'bands' | 'tags' | 'ycBatches'>;
  /** Filters fixed by the route (e.g. city on /jobs/in/pune); hidden from the panel. */
  locked?: FilterKey[];
}

const REMOTE_OPTIONS = [
  { value: 'any_remote', label: 'Any remote' },
  { value: 'remote_india', label: REMOTE_TYPE_LABELS.remote_india },
  { value: 'remote_global', label: REMOTE_TYPE_LABELS.remote_global },
  { value: 'remote_restricted', label: REMOTE_TYPE_LABELS.remote_restricted },
  { value: 'onsite', label: REMOTE_TYPE_LABELS.onsite },
  { value: 'hybrid', label: REMOTE_TYPE_LABELS.hybrid },
];

function Select({
  id,
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  id: string;
  label: string;
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  options: { value: string; label: string; count?: number }[];
  allLabel: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-text-muted">
        {label}
      </label>
      <select
        id={id}
        className="field"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || undefined)}
      >
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
            {o.count !== undefined ? ` (${o.count.toLocaleString('en-IN')})` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}

function Fields({
  basePath,
  filters,
  meta,
  locked = [],
  onNavigate,
  p,
}: FilterPanelProps & { onNavigate?: () => void; p: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(filters.q ?? '');
  const show = (k: FilterKey) => !locked.includes(k);

  const go = (next: FilterState) => {
    startTransition(() => router.push(listHref(basePath, next)));
    onNavigate?.();
  };
  const set = (k: FilterKey) => (v: string | undefined) => go({ ...filters, [k]: v });

  return (
    <div className="space-y-3" aria-busy={pending}>
      {show('q') && (
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            go({ ...filters, q: q.trim() || undefined });
          }}
        >
          <label htmlFor={`${p}-q`} className="mb-1 block text-xs font-medium text-text-muted">
            Search
          </label>
          <div className="flex gap-2">
            <input
              id={`${p}-q`}
              type="search"
              className="field"
              placeholder="Title, company, skill"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              maxLength={100}
            />
            <button type="submit" className="btn">
              Go
            </button>
          </div>
        </form>
      )}
      {show('category') && (
        <Select
          id={`${p}-category`}
          label="Role"
          value={filters.category}
          onChange={set('category')}
          allLabel="All roles"
          options={meta.categories.map((c) => ({ value: c.value, label: c.label, count: c.count }))}
        />
      )}
      {show('level') && (
        <Select
          id={`${p}-level`}
          label="Level"
          value={filters.level}
          onChange={set('level')}
          allLabel="All levels"
          options={meta.levels.map((c) => ({ value: c.value, label: c.label, count: c.count }))}
        />
      )}
      {show('city') && (
        <Select
          id={`${p}-city`}
          label="City"
          value={filters.city}
          onChange={set('city')}
          allLabel="All locations"
          options={[
            { value: 'remote', label: 'Remote' },
            ...meta.cities.map((c) => ({ value: c.slug, label: c.name, count: c.count })),
          ]}
        />
      )}
      {show('remote') && (
        <Select
          id={`${p}-remote`}
          label="Work mode"
          value={filters.remote}
          onChange={set('remote')}
          allLabel="India + remote OK"
          options={REMOTE_OPTIONS}
        />
      )}
      {show('band') && (
        <Select
          id={`${p}-band`}
          label="Salary (per year)"
          value={filters.band}
          onChange={set('band')}
          allLabel="Any salary"
          options={meta.bands.map((b) => ({ value: b.value, label: b.label, count: b.count }))}
        />
      )}
      {show('tag') && (
        <Select
          id={`${p}-tag`}
          label="Company type"
          value={filters.tag}
          onChange={set('tag')}
          allLabel="All companies"
          options={meta.tags
            .filter((t) => t.count > 0)
            .map((t) => ({ value: t.value, label: t.label, count: t.count }))}
        />
      )}
      {show('batch') && meta.ycBatches.length > 0 && filters.tag === 'yc' && (
        <Select
          id={`${p}-batch`}
          label="YC batch"
          value={filters.batch}
          onChange={set('batch')}
          allLabel="All batches"
          options={meta.ycBatches.map((b) => ({ value: b.batch, label: b.batch, count: b.count }))}
        />
      )}
      {show('posted') && (
        <Select
          id={`${p}-posted`}
          label="Posted"
          value={filters.posted}
          onChange={set('posted')}
          allLabel="Any time"
          options={POSTED_WITHIN.map((p) => ({ value: p, label: POSTED_WITHIN_LABELS[p] }))}
        />
      )}
      {activeFilterCount(filters) - locked.filter((k) => filters[k]).length > 0 && (
        <button
          type="button"
          className="link text-sm"
          onClick={() => {
            setQ('');
            go(Object.fromEntries(locked.map((k) => [k, filters[k]])));
          }}
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

export function FilterPanel(props: FilterPanelProps) {
  const [open, setOpen] = useState(false);
  const n =
    activeFilterCount(props.filters) - (props.locked ?? []).filter((k) => props.filters[k]).length;
  return (
    <>
      {/* Desktop: sidebar */}
      <aside aria-label="Filters" className="hidden lg:block w-60 shrink-0">
        <div className="sticky top-4">
          <Fields {...props} p="fd" />
        </div>
      </aside>
      {/* Mobile: bottom sheet */}
      <div className="lg:hidden">
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger className="btn">
            <SlidersHorizontal size={14} aria-hidden />
            Filters{n > 0 ? ` (${n})` : ''}
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
            <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-md border-t border-border bg-surface p-4 pb-8">
              <div className="mb-3 flex items-center justify-between">
                <Dialog.Title className="text-md font-semibold">Filters</Dialog.Title>
                <Dialog.Close
                  className="p-2 -m-2 text-text-muted hover:text-text"
                  aria-label="Close filters"
                >
                  <X size={18} aria-hidden />
                </Dialog.Close>
              </div>
              <Dialog.Description className="sr-only">
                Narrow the job list. Changes apply immediately.
              </Dialog.Description>
              <Fields {...props} p="fm" onNavigate={() => setOpen(false)} />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </>
  );
}
