import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { JobListItem } from '@roleup/core';
import { JobRow } from './JobRow';

export function EmptyState({
  title = 'Nothing here yet',
  text,
  action,
}: {
  /** Accepted for compatibility; empty states no longer show an icon. */
  icon?: unknown;
  title?: string;
  text: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-dashed border-border-strong px-6 py-14 text-center">
      <p className="text-base font-semibold">{title}</p>
      <div className="mx-auto mt-1.5 max-w-sm text-sm text-text-muted">{text}</div>
      {action && <div className="mt-5 flex justify-center gap-2">{action}</div>}
    </div>
  );
}

/** Jobs as one bordered list with dividers: dense and easy to scan. */
export function JobListRows({ jobs, now = new Date() }: { jobs: JobListItem[]; now?: Date }) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface">
      {jobs.map((j) => (
        <JobRow key={j.id} job={j} now={now} />
      ))}
    </ul>
  );
}

export function JobList({
  jobs,
  nextHref,
  firstHref,
  isPaged,
  emptyText = 'No open jobs match these filters.',
  clearHref,
}: {
  jobs: JobListItem[];
  nextHref?: string | null;
  firstHref?: string;
  isPaged?: boolean;
  emptyText?: string;
  clearHref?: string;
}) {
  if (jobs.length === 0) {
    return (
      <EmptyState
        title="No jobs found"
        text={emptyText}
        action={
          clearHref && (
            <Link href={clearHref} className="btn">
              Clear filters
            </Link>
          )
        }
      />
    );
  }
  return (
    <>
      <JobListRows jobs={jobs} />
      {(nextHref || isPaged) && (
        <nav aria-label="Pagination" className="mt-6 flex items-center justify-between gap-3">
          {isPaged && firstHref ? (
            <Link href={firstHref} className="btn">
              <ArrowLeft size={15} aria-hidden />
              Newest
            </Link>
          ) : (
            <span />
          )}
          {nextHref && (
            <Link href={nextHref} className="btn" rel="next">
              Older jobs
              <ArrowRight size={15} aria-hidden />
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
