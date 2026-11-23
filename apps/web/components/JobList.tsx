import Link from 'next/link';
import type { JobListItem } from '@roleup/core';
import { JobRow } from './JobRow';

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
  const now = new Date();
  if (jobs.length === 0) {
    return (
      <div className="card px-4 py-14 text-center">
        <p className="text-md font-medium text-text">Nothing here yet</p>
        <p className="mt-1 text-sm text-text-muted">{emptyText}</p>
        {clearHref && (
          <Link href={clearHref} className="link mt-2 inline-block text-sm">
            Clear filters
          </Link>
        )}
      </div>
    );
  }
  return (
    <>
      <ul className="card overflow-hidden">
        {jobs.map((j) => (
          <JobRow key={j.id} job={j} now={now} />
        ))}
      </ul>
      {(nextHref || isPaged) && (
        <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm">
          {isPaged && firstHref ? (
            <Link href={firstHref} className="btn">
              Back to newest
            </Link>
          ) : (
            <span />
          )}
          {nextHref && (
            <Link href={nextHref} className="btn" rel="next">
              Older jobs
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
