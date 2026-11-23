import Link from 'next/link';
import { LEVEL_LABELS, timeAgo, type JobListItem } from '@roleup/core';
import { locationLabel, salaryLabel } from '@/lib/format';
import { companyHref, jobHref } from '@/lib/urls';
import { CompanyLogo } from './CompanyLogo';
import { SaveButton } from './SaveButton';

export function JobRow({ job, now }: { job: JobListItem; now: Date }) {
  const salary = salaryLabel(job);
  const location = locationLabel(job);
  const yc = job.company.tags.includes('yc');
  const funded = job.company.tags.includes('recently_funded');
  return (
    <li className="relative flex gap-3 py-3 px-1 sm:px-2 border-b border-border last:border-b-0 hover:bg-surface-muted/60">
      <CompanyLogo company={job.company} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <h2 className="min-w-0 flex-1 text-base font-medium leading-snug">
            <Link
              href={jobHref(job.slug)}
              className="hover:text-accent after:absolute after:inset-0"
            >
              {job.title}
            </Link>
          </h2>
          <div className="relative z-10 shrink-0">
            <SaveButton
              job={{
                id: job.id,
                slug: job.slug,
                title: job.title,
                companyName: job.company.name,
                companySlug: job.company.slug,
                location,
                salary,
              }}
            />
          </div>
        </div>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-sm text-text-muted">
          <Link
            href={companyHref(job.company.slug)}
            className="relative z-10 inline-flex min-h-6 items-center text-text hover:underline underline-offset-2"
          >
            {job.company.name}
          </Link>
          <span aria-hidden>·</span>
          <span>{location}</span>
          <span aria-hidden>·</span>
          <span>{LEVEL_LABELS[job.level]}</span>
          {salary && (
            <>
              <span aria-hidden>·</span>
              <span className="tabular-nums text-text">{salary}</span>
            </>
          )}
        </p>
        <div className="mt-1 flex items-center gap-1.5 overflow-hidden text-xs text-text-subtle">
          <time
            dateTime={job.postedAt ?? job.firstSeenAt}
            className="tabular-nums whitespace-nowrap"
          >
            {timeAgo(job.postedAt ?? job.firstSeenAt, now)}
          </time>
          {yc && (
            <span className="tag tag-accent">
              YC{job.company.ycBatch ? ` ${job.company.ycBatch}` : ''}
            </span>
          )}
          {funded && <span className="tag tag-success">Recently funded</span>}
        </div>
      </div>
    </li>
  );
}
