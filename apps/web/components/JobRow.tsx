import Link from 'next/link';
import { LEVEL_LABELS, REMOTE_TYPE_SHORT, timeAgo, type JobListItem } from '@roleup/core';
import { salaryLabel } from '@/lib/format';
import { companyHref, jobHref } from '@/lib/urls';
import { CompanyLogo } from './CompanyLogo';
import { SaveButton } from './SaveButton';

/** Remote eligibility is the one label that changes whether you can apply, so it gets colour. */
const MODE_CLASS: Partial<Record<JobListItem['remoteType'], string>> = {
  remote_india: 'text-success',
  remote_global: 'text-success',
  remote_restricted: 'text-warning',
};

function place(job: JobListItem): string {
  if (job.city) return job.city.name;
  if (job.remoteType.startsWith('remote_')) return 'Remote';
  return job.locationRaw.split(/[;|]/)[0]?.trim() || 'India';
}

function Dot() {
  return (
    <span aria-hidden className="text-border-strong">
      ·
    </span>
  );
}

/** One job in a list. Rendered inside a <ul> with dividers (see JobList). */
export function JobRow({ job, now }: { job: JobListItem; now: Date }) {
  const salary = salaryLabel(job);
  const yc = job.company.tags.includes('yc');
  const funded = job.company.tags.includes('recently_funded');
  const posted = job.postedAt ?? job.firstSeenAt;
  const fresh = now.getTime() - new Date(posted).getTime() < 48 * 3_600_000;
  const location = place(job);
  const remote = job.remoteType !== 'onsite';
  return (
    <li className="group relative flex gap-3.5 px-4 py-4 transition-colors hover:bg-surface-muted/60 sm:gap-4 sm:px-5">
      <div className="pt-0.5">
        <CompanyLogo company={job.company} size={40} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-1.5 text-[0.8125rem] text-text-muted">
          <Link
            href={companyHref(job.company.slug)}
            className="relative z-10 font-medium text-text hover:underline"
          >
            {job.company.name}
          </Link>
          {yc && (
            <>
              <Dot />
              <span>YC{job.company.ycBatch ? ` ${job.company.ycBatch}` : ''}</span>
            </>
          )}
          {funded && (
            <>
              <Dot />
              <span>Recently funded</span>
            </>
          )}
        </p>
        <h2 className="mt-0.5 break-words text-[1rem] font-semibold leading-snug tracking-[-0.01em]">
          <Link
            href={jobHref(job.slug)}
            className="after:absolute after:inset-0 group-hover:underline group-hover:decoration-border-strong group-hover:underline-offset-4"
          >
            {job.title}
          </Link>
        </h2>
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[0.8125rem] text-text-muted">
          {/* Remote jobs without a city: the remote label alone says where. */}
          {!(remote && !job.city && job.remoteType !== 'hybrid') && (
            <>
              <span>{location}</span>
              {remote && <Dot />}
            </>
          )}
          {remote && (
            <span className={MODE_CLASS[job.remoteType]}>{REMOTE_TYPE_SHORT[job.remoteType]}</span>
          )}
          <Dot />
          <span>{LEVEL_LABELS[job.level]}</span>
          {salary && (
            <span className="contents sm:hidden">
              <Dot />
              <span className="num font-medium text-text">{salary}</span>
            </span>
          )}
        </p>
      </div>
      <div className="hidden shrink-0 flex-col items-end gap-1 pt-0.5 text-right sm:flex">
        <span className="num text-sm font-semibold">{salary ?? ''}</span>
        <span className="flex items-center gap-1.5 text-xs text-text-subtle">
          {fresh && <span className="font-medium text-accent">New</span>}
          <time dateTime={posted} className="num">
            {timeAgo(posted, now)}
          </time>
        </span>
      </div>
      <div className="relative z-10 -mr-1.5 shrink-0">
        <SaveButton
          job={{
            id: job.id,
            slug: job.slug,
            title: job.title,
            companyName: job.company.name,
            companySlug: job.company.slug,
            location: remote ? `${location} · ${REMOTE_TYPE_SHORT[job.remoteType]}` : location,
            salary,
          }}
        />
        <time
          dateTime={posted}
          className="num mt-1 block text-center text-[11px] text-text-subtle sm:hidden"
        >
          {fresh ? (
            <span className="font-medium text-accent">New</span>
          ) : (
            timeAgo(posted, now).replace(' ago', '')
          )}
        </time>
      </div>
    </li>
  );
}
