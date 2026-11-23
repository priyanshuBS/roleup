import Link from 'next/link';
import { LEVEL_LABELS, REMOTE_TYPE_SHORT, timeAgo, type JobListItem } from '@roleup/core';
import { salaryLabel } from '@/lib/format';
import { companyHref, jobHref } from '@/lib/urls';
import { CompanyLogo } from './CompanyLogo';
import { SaveButton } from './SaveButton';

const MODE_TAG: Partial<Record<JobListItem['remoteType'], string>> = {
  remote_india: 'tag-success',
  remote_global: 'tag-accent',
  remote_restricted: 'tag-warning',
  hybrid: '',
};

function place(job: JobListItem): string {
  if (job.city) return job.city.name;
  if (job.remoteType.startsWith('remote_')) return 'Remote';
  return job.locationRaw.split(/[;|]/)[0]?.trim() || 'India';
}

export function JobRow({ job, now }: { job: JobListItem; now: Date }) {
  const salary = salaryLabel(job);
  const yc = job.company.tags.includes('yc');
  const funded = job.company.tags.includes('recently_funded');
  const posted = job.postedAt ?? job.firstSeenAt;
  const fresh = now.getTime() - new Date(posted).getTime() < 48 * 3_600_000;
  const modeClass = MODE_TAG[job.remoteType];
  const location = place(job);
  return (
    <li className="group relative flex gap-3.5 border-b border-border px-3 py-3.5 transition-colors last:border-b-0 hover:bg-surface-muted/70 sm:px-4">
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-0.5 bg-accent opacity-0 transition-opacity group-hover:opacity-100"
      />
      <div className="pt-0.5">
        <CompanyLogo company={job.company} size={36} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold leading-snug text-text">
              <Link
                href={jobHref(job.slug)}
                className="after:absolute after:inset-0 group-hover:text-accent"
              >
                {job.title}
              </Link>
            </h2>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-sm text-text-muted">
              <Link
                href={companyHref(job.company.slug)}
                className="relative z-10 inline-flex min-h-6 items-center font-medium text-text hover:underline underline-offset-2"
              >
                {job.company.name}
              </Link>
              <span aria-hidden className="text-text-subtle">
                ·
              </span>
              <span>{location}</span>
              <span aria-hidden className="text-text-subtle">
                ·
              </span>
              <span>{LEVEL_LABELS[job.level]}</span>
            </p>
          </div>
          <div className="hidden shrink-0 flex-col items-end gap-1 text-right sm:flex">
            {salary ? (
              <span className="text-sm font-semibold tabular-nums text-text">{salary}</span>
            ) : (
              <span className="text-xs text-text-subtle">Salary not disclosed</span>
            )}
            <time dateTime={posted} className="text-xs tabular-nums text-text-subtle">
              {timeAgo(posted, now)}
            </time>
          </div>
          <div className="relative z-10 -mr-1 shrink-0">
            <SaveButton
              job={{
                id: job.id,
                slug: job.slug,
                title: job.title,
                companyName: job.company.name,
                companySlug: job.company.slug,
                location:
                  modeClass !== undefined
                    ? `${location} · ${REMOTE_TYPE_SHORT[job.remoteType]}`
                    : location,
                salary,
              }}
            />
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {modeClass !== undefined && (
            <span className={`tag ${modeClass}`}>{REMOTE_TYPE_SHORT[job.remoteType]}</span>
          )}
          {yc && (
            <span className="tag tag-accent">
              YC{job.company.ycBatch ? ` ${job.company.ycBatch}` : ''}
            </span>
          )}
          {funded && <span className="tag tag-success">Recently funded</span>}
          {fresh && <span className="tag">New</span>}
          {/* Phone: salary and time move here. */}
          <span className="ml-auto flex items-center gap-2 text-xs tabular-nums text-text-subtle sm:hidden">
            {salary && <span className="font-semibold text-text">{salary}</span>}
            <time dateTime={posted}>{timeAgo(posted, now)}</time>
          </span>
        </div>
      </div>
    </li>
  );
}
