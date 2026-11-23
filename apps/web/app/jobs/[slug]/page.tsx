import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import {
  COMPANY_TAG_LABELS,
  LEVEL_LABELS,
  REMOTE_TYPE_LABELS,
  ROLE_CATEGORY_LABELS,
  timeAgo,
} from '@roleup/core';
import { CompanyLogo } from '@/components/CompanyLogo';
import { JobDescription } from '@/components/JobDescription';
import { JobRow } from '@/components/JobRow';
import { SaveButton } from '@/components/SaveButton';
import { getCompanyBySlug, getJobBySlug, getSimilarJobs } from '@/lib/data';
import { locationLabel, salaryLabel, salaryOriginal } from '@/lib/format';
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
  const tags = job.company.tags.filter((t) => t !== 'product');

  return (
    <article className="max-w-3xl">
      {/* No JobPosting markup for closed or US/EU-only roles (not India-eligible). */}
      {!job.closedAt && job.remoteType !== 'remote_restricted' && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: ldScript(jobPostingLd(job, { website: company?.website })),
          }}
        />
      )}

      {job.closedAt && (
        <div
          role="status"
          className="mb-4 rounded-md border border-warning/40 bg-warning-subtle px-4 py-3 text-sm text-warning"
        >
          This job is closed. It was removed from {job.company.name}&apos;s job board{' '}
          {timeAgo(job.closedAt, now)}.
        </div>
      )}

      <nav aria-label="Breadcrumb" className="mb-3 text-sm text-text-muted">
        <Link href="/" className="hover:text-text">
          Jobs
        </Link>
        <span aria-hidden> / </span>
        <Link href={companyHref(job.company.slug)} className="hover:text-text">
          {job.company.name}
        </Link>
      </nav>

      <header className="flex gap-4">
        <CompanyLogo company={job.company} size={48} />
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold leading-tight tracking-tight">
            {job.title}
          </h1>
          <p className="mt-1 text-base text-text-muted">
            <Link
              href={companyHref(job.company.slug)}
              className="text-text hover:underline underline-offset-2"
            >
              {job.company.name}
            </Link>
            {' · '}
            {job.city ? (
              <Link href={cityHref(job.city.slug)} className="hover:underline underline-offset-2">
                {location}
              </Link>
            ) : (
              location
            )}
          </p>
        </div>
      </header>

      <dl className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-px overflow-hidden rounded-md border border-border bg-border text-sm">
        <div className="bg-surface p-3">
          <dt className="text-xs text-text-subtle">Level</dt>
          <dd className="mt-0.5 font-medium">
            {LEVEL_LABELS[job.level]}
            {job.minYears != null ? ` · ${job.minYears}+ yrs` : ''}
          </dd>
        </div>
        <div className="bg-surface p-3">
          <dt className="text-xs text-text-subtle">Role</dt>
          <dd className="mt-0.5 font-medium">{ROLE_CATEGORY_LABELS[job.roleCategory]}</dd>
        </div>
        <div className="bg-surface p-3">
          <dt className="text-xs text-text-subtle">Work mode</dt>
          <dd className="mt-0.5 font-medium">{REMOTE_TYPE_LABELS[job.remoteType]}</dd>
        </div>
        <div className="bg-surface p-3">
          <dt className="text-xs text-text-subtle">Salary</dt>
          <dd className="mt-0.5 font-medium tabular-nums">
            {salary ? (
              <>
                {salary}
                <span className="font-normal text-text-subtle"> /yr</span>
                {original && (
                  <span className="block text-xs font-normal text-text-subtle">
                    {original} (employer)
                  </span>
                )}
              </>
            ) : (
              <span className="font-normal text-text-muted">Not disclosed</span>
            )}
          </dd>
        </div>
      </dl>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {!job.closedAt && (
          <a
            href={job.applyUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="btn btn-primary"
          >
            Apply on company site <ExternalLink size={14} aria-hidden />
          </a>
        )}
        <Link href={`/ats-checker?job=${encodeURIComponent(job.slug)}`} className="btn">
          Check my resume against this job
        </Link>
        <SaveButton
          withLabel
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

      <p className="mt-3 text-xs text-text-subtle tabular-nums">
        Posted {timeAgo(job.postedAt ?? job.firstSeenAt, now)} · Last checked{' '}
        {timeAgo(job.lastSeenAt, now)} · Source: {job.company.name} careers ({job.source})
        {job.locationRaw && job.locationRaw !== location ? (
          <> · Listed location: {job.locationRaw}</>
        ) : null}
      </p>

      <section aria-labelledby="desc" className="mt-6 border-t border-border pt-6">
        <h2 id="desc" className="sr-only">
          Job description
        </h2>
        <JobDescription
          text={job.descriptionText || 'No description provided. See the company site for details.'}
        />
      </section>

      {company && (
        <section
          aria-labelledby="about-company"
          className="mt-8 rounded-md border border-border bg-surface p-4"
        >
          <h2 id="about-company" className="text-md font-semibold">
            About {company.name}
          </h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {company.ycBatch && <span className="tag tag-accent">YC {company.ycBatch}</span>}
            {tags
              .filter((t) => t !== 'yc')
              .map((t) => (
                <span key={t} className="tag">
                  {COMPANY_TAG_LABELS[t]}
                </span>
              ))}
          </div>
          <p className="mt-2 text-sm text-text-muted tabular-nums">
            {company.openJobsCount.toLocaleString('en-IN')} open tech{' '}
            {company.openJobsCount === 1 ? 'job' : 'jobs'}
            {company.website && (
              <>
                {' · '}
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link"
                >
                  {company.domain ?? 'Website'}
                </a>
              </>
            )}
          </p>
          {company.fundings[0] && (
            <p className="mt-1 text-sm text-text-muted">
              Raised {company.fundings[0].round} on {company.fundings[0].announcedOn} (
              <a
                href={company.fundings[0].sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="link"
              >
                source
              </a>
              )
            </p>
          )}
          <Link href={companyHref(company.slug)} className="link mt-2 inline-block text-sm">
            All jobs at {company.name}
          </Link>
        </section>
      )}

      {similar.length > 0 && (
        <section aria-labelledby="similar" className="mt-8">
          <h2 id="similar" className="mb-2 text-md font-semibold">
            Similar jobs
          </h2>
          <ul className="rounded-md border border-border bg-surface">
            {similar.map((j) => (
              <JobRow key={j.id} job={j} now={now} />
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
