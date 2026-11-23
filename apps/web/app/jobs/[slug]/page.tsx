import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowUpRight, ChevronRight, CircleAlert, ScanText, ShieldCheck } from 'lucide-react';
import {
  COMPANY_TAG_LABELS,
  LEVEL_LABELS,
  REMOTE_TYPE_LABELS,
  REMOTE_TYPE_SHORT,
  ROLE_CATEGORY_LABELS,
  timeAgo,
} from '@roleup/core';
import { CompanyLogo } from '@/components/CompanyLogo';
import { JobDescription } from '@/components/JobDescription';
import { JobListRows } from '@/components/JobList';
import { SaveButton } from '@/components/SaveButton';
import { getCompanyBySlug, getJobBySlug, getSimilarJobs } from '@/lib/data';
import { formatDate, locationLabel, salaryLabel, salaryOriginal } from '@/lib/format';
import { jobPostingLd, ldScript } from '@/lib/jsonld';
import { cityHref, companyHref } from '@/lib/urls';

export const revalidate = 600;
export const dynamicParams = true;

export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const job = await getJobBySlug(slug);
  if (!job) return { title: 'Job not found', robots: { index: false } };
  const where = locationLabel(job);
  const salary = salaryLabel(job);
  const description = `${job.title} at ${job.company.name} · ${where}${salary ? ` · ${salary}` : ''}. ${LEVEL_LABELS[job.level]} ${ROLE_CATEGORY_LABELS[job.roleCategory]} role. Apply on the company site.`;
  return {
    title: `${job.title} at ${job.company.name} (${where})`,
    description,
    alternates: { canonical: `/jobs/${job.slug}` },
    robots: job.closedAt ? { index: false, follow: true } : undefined,
    openGraph: { title: `${job.title} at ${job.company.name}`, description, type: 'article' },
  };
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-sm text-text-muted">{label}</dt>
      <dd className="text-right text-sm font-medium">{children}</dd>
    </div>
  );
}

const REMOTE_TAG: Record<string, string> = {
  remote_india: 'tag-success',
  remote_global: 'tag-success',
  remote_restricted: 'tag-warning',
};

function Sep() {
  return (
    <span aria-hidden className="text-border-strong">
      ·
    </span>
  );
}

export default async function JobPage({ params }: Props) {
  const { slug } = await params;
  const job = await getJobBySlug(slug);
  if (!job) notFound();
  const [company, similar] = await Promise.all([
    getCompanyBySlug(job.company.slug),
    job.closedAt ? Promise.resolve([]) : getSimilarJobs(job),
  ]);
  const now = new Date();
  const salary = salaryLabel(job);
  const original = salaryOriginal(job);
  const location = locationLabel(job);
  const tags = job.company.tags.filter((t) => t !== 'product' && t !== 'yc');
  const posted = job.postedAt ?? job.firstSeenAt;
  const remote = job.remoteType.startsWith('remote_');
  const funding = company?.fundings[0];
  const saveJob = {
    id: job.id,
    slug: job.slug,
    title: job.title,
    companyName: job.company.name,
    companySlug: job.company.slug,
    location,
    salary,
  };
  const companyLine = [
    job.company.ycBatch ? `YC ${job.company.ycBatch}` : null,
    job.company.tags.includes('recently_funded') ? 'Recently funded' : null,
    company?.domain ?? null,
  ].filter(Boolean);

  // Rendered under the title on phones and in the sticky sidebar on desktop.
  const applyPanel = (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-5">
      <dl className="divide-y divide-border">
        <Fact label="Salary">
          {salary ? (
            <span className="num">
              {salary}
              {original && (
                <span className="block text-xs font-normal text-text-subtle">
                  {original}, as posted
                </span>
              )}
            </span>
          ) : (
            <span className="font-normal text-text-subtle">Not disclosed</span>
          )}
        </Fact>
        <Fact label="Location">
          {remote
            ? REMOTE_TYPE_SHORT[job.remoteType]
            : `${job.city?.name ?? location}${job.remoteType === 'hybrid' ? ' · Hybrid' : ''}`}
        </Fact>
        <Fact label="Experience">
          {LEVEL_LABELS[job.level]}
          {job.minYears != null ? ` · ${job.minYears}+ yrs` : ''}
        </Fact>
        <Fact label="Last checked">
          <span className="num font-normal text-text-muted">{timeAgo(job.lastSeenAt, now)}</span>
        </Fact>
      </dl>
      <div className="mt-4 space-y-2">
        {!job.closedAt && (
          <a
            href={job.applyUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            data-track={`apply:${job.slug}`}
            className="btn btn-accent btn-lg w-full"
          >
            Apply on company site
            <ArrowUpRight size={17} aria-hidden />
          </a>
        )}
        <div className="grid grid-cols-2 gap-2">
          <SaveButton withLabel job={saveJob} />
          <Link
            href={`/ats-checker?job=${encodeURIComponent(job.slug)}`}
            className="btn"
            data-track={`resume-check:${job.slug}`}
          >
            <ScanText size={15} aria-hidden /> Check resume
          </Link>
        </div>
      </div>
      <p className="mt-4 flex gap-2 text-xs leading-relaxed text-text-subtle">
        <ShieldCheck size={14} aria-hidden className="mt-px shrink-0" />
        <span>
          You apply on {job.company.name}&apos;s own careers page ({job.source}). RoleUp never asks
          for your details.
        </span>
      </p>
    </div>
  );

  return (
    <article>
      {/* No JobPosting markup for closed or US/EU-only roles (not India-eligible). */}
      {!job.closedAt && job.remoteType !== 'remote_restricted' && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: ldScript(jobPostingLd(job, { website: company?.website })),
          }}
        />
      )}

      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-text-muted">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/" className="hover:text-text">
              Jobs
            </Link>
          </li>
          <li aria-hidden>
            <ChevronRight size={14} className="text-text-subtle" />
          </li>
          <li>
            <Link href={companyHref(job.company.slug)} className="hover:text-text">
              {job.company.name}
            </Link>
          </li>
        </ol>
      </nav>

      {job.closedAt && (
        <div
          role="status"
          className="mb-6 flex gap-3 rounded-[var(--radius-md)] border border-warning/30 bg-warning-subtle px-4 py-3 text-sm text-warning"
        >
          <CircleAlert size={18} aria-hidden className="mt-px shrink-0" />
          <p>
            <strong>This job is closed.</strong> It was removed from {job.company.name}&apos;s job
            board {timeAgo(job.closedAt, now)}. Other roles may still be open on the{' '}
            <Link href={companyHref(job.company.slug)} className="underline">
              company page
            </Link>
            .
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12">
        <div className="min-w-0">
          <header className="border-b border-border pb-7">
            <div className="flex items-center gap-3">
              <CompanyLogo company={job.company} size={44} />
              <div className="min-w-0">
                <Link href={companyHref(job.company.slug)} className="font-medium hover:underline">
                  {job.company.name}
                </Link>
                {companyLine.length > 0 && (
                  <p className="text-sm text-text-subtle">{companyLine.join(' · ')}</p>
                )}
              </div>
            </div>
            <h1 className="display mt-5 max-w-3xl break-words text-[1.875rem] leading-[1.1] sm:text-[2.5rem]">
              {job.title}
            </h1>
            <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.9375rem] text-text-muted">
              {job.city ? (
                <Link href={cityHref(job.city.slug)} className="hover:text-text hover:underline">
                  {location}
                </Link>
              ) : (
                <span>{location}</span>
              )}
              <Sep />
              <span>{LEVEL_LABELS[job.level]}</span>
              <Sep />
              <span>{ROLE_CATEGORY_LABELS[job.roleCategory]}</span>
              <Sep />
              <span>Posted {timeAgo(posted, now)}</span>
            </p>
            {remote && (
              <p className="mt-3">
                <span className={`tag ${REMOTE_TAG[job.remoteType] ?? ''}`}>
                  {REMOTE_TYPE_LABELS[job.remoteType]}
                </span>
              </p>
            )}
          </header>

          <div className="mt-6 lg:hidden">{applyPanel}</div>

          <section aria-labelledby="desc" className="mt-8">
            <h2 id="desc" className="mb-4 text-lg font-semibold">
              About the role
            </h2>
            <JobDescription
              text={
                job.descriptionText || 'No description provided. See the company site for details.'
              }
            />
          </section>

          {company && (
            <section
              aria-labelledby="about-company"
              className="mt-10 rounded-[var(--radius-lg)] border border-border p-5"
            >
              <div className="flex items-center gap-3">
                <CompanyLogo company={company} size={40} />
                <div className="min-w-0 flex-1">
                  <h2 id="about-company" className="truncate font-semibold">
                    {company.name}
                  </h2>
                  {company.website && (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 text-sm text-text-muted hover:text-text"
                    >
                      {company.domain} <ArrowUpRight size={12} aria-hidden />
                    </a>
                  )}
                </div>
                <Link href={companyHref(company.slug)} className="btn btn-sm shrink-0">
                  <span className="num">{company.openJobsCount}</span> open{' '}
                  {company.openJobsCount === 1 ? 'job' : 'jobs'}
                </Link>
              </div>
              {(tags.length > 0 || funding) && (
                <div className="mt-4 space-y-1.5 text-sm text-text-muted">
                  {tags.length > 0 && <p>{tags.map((t) => COMPANY_TAG_LABELS[t]).join(' · ')}</p>}
                  {funding && (
                    <p>
                      Raised {funding.round === 'Undisclosed' ? 'funding' : funding.round} on{' '}
                      {formatDate(funding.announcedOn)} (
                      <a
                        href={funding.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link"
                      >
                        source
                      </a>
                      )
                    </p>
                  )}
                </div>
              )}
            </section>
          )}

          {similar.length > 0 && (
            <section aria-labelledby="similar" className="mt-12">
              <h2 id="similar" className="mb-4 text-lg font-semibold">
                Similar jobs
              </h2>
              <JobListRows jobs={similar} now={now} />
            </section>
          )}
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-20">{applyPanel}</div>
        </aside>
      </div>
    </article>
  );
}
