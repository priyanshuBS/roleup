import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Briefcase, Clock, ExternalLink, FileCheck2, IndianRupee, MapPin } from 'lucide-react';
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

function Fact({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 py-2.5">
      <span className="mt-0.5 text-text-subtle" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-text-subtle">{label}</dt>
        <dd className="text-sm font-medium text-text">{children}</dd>
      </div>
    </div>
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
  const saveJob = {
    id: job.id,
    slug: job.slug,
    title: job.title,
    companyName: job.company.name,
    companySlug: job.company.slug,
    location,
    salary,
  };

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

      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-text-muted">
        <Link href="/" className="hover:text-text">
          Jobs
        </Link>
        <span aria-hidden className="mx-1.5 text-text-subtle">
          /
        </span>
        <Link href={companyHref(job.company.slug)} className="hover:text-text">
          {job.company.name}
        </Link>
      </nav>

      {job.closedAt && (
        <div
          role="status"
          className="mb-5 rounded-md border border-warning/40 bg-warning-subtle px-4 py-3 text-sm text-warning"
        >
          <strong>This job is closed.</strong> It was removed from {job.company.name}&apos;s job
          board {timeAgo(job.closedAt, now)}. Similar roles may still be open on the{' '}
          <Link href={companyHref(job.company.slug)} className="underline">
            company page
          </Link>
          .
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
        {/* Main column */}
        <div className="min-w-0">
          <header className="flex gap-4">
            <CompanyLogo company={job.company} size={56} />
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold leading-tight tracking-tight sm:text-[1.75rem]">
                {job.title}
              </h1>
              <p className="mt-1.5 text-base text-text-muted">
                <Link
                  href={companyHref(job.company.slug)}
                  className="font-medium text-text hover:underline underline-offset-2"
                >
                  {job.company.name}
                </Link>
                <span aria-hidden className="mx-1.5 text-text-subtle">
                  ·
                </span>
                {job.city ? (
                  <Link
                    href={cityHref(job.city.slug)}
                    className="hover:underline underline-offset-2"
                  >
                    {location}
                  </Link>
                ) : (
                  location
                )}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="tag">{LEVEL_LABELS[job.level]}</span>
                <span className="tag">{ROLE_CATEGORY_LABELS[job.roleCategory]}</span>
                {job.remoteType.startsWith('remote_') && (
                  <span
                    className={`tag ${job.remoteType === 'remote_india' ? 'tag-success' : job.remoteType === 'remote_global' ? 'tag-accent' : 'tag-warning'}`}
                  >
                    {REMOTE_TYPE_LABELS[job.remoteType]}
                  </span>
                )}
                {job.company.ycBatch && (
                  <span className="tag tag-accent">YC {job.company.ycBatch}</span>
                )}
                {job.company.tags.includes('recently_funded') && (
                  <span className="tag tag-success">Recently funded</span>
                )}
              </div>
            </div>
          </header>

          <section aria-labelledby="desc" className="card mt-6 p-5 sm:p-6">
            <h2 id="desc" className="mb-4 text-md font-semibold">
              About the role
            </h2>
            <JobDescription
              text={
                job.descriptionText || 'No description provided. See the company site for details.'
              }
            />
          </section>

          {similar.length > 0 && (
            <section aria-labelledby="similar" className="mt-8">
              <h2 id="similar" className="mb-3 text-md font-semibold">
                Similar jobs
              </h2>
              <ul className="card overflow-hidden">
                {similar.map((j) => (
                  <JobRow key={j.id} job={j} now={now} />
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Sidebar: sticky apply card + company. On phones it sits above the description. */}
        <aside className="order-first lg:order-none">
          <div className="space-y-4 lg:sticky lg:top-20">
            <div className="card p-4">
              <dl className="divide-y divide-border">
                <Fact icon={<IndianRupee size={16} />} label="Salary (per year)">
                  {salary ? (
                    <span className="tabular-nums">
                      {salary}
                      {original && (
                        <span className="block text-xs font-normal text-text-subtle">
                          {original}, as posted
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="font-normal text-text-muted">Not disclosed by employer</span>
                  )}
                </Fact>
                <Fact icon={<MapPin size={16} />} label="Location">
                  {job.remoteType.startsWith('remote_')
                    ? REMOTE_TYPE_LABELS[job.remoteType]
                    : `${job.city?.name ?? location} · ${REMOTE_TYPE_LABELS[job.remoteType]}`}
                </Fact>
                <Fact icon={<Briefcase size={16} />} label="Experience">
                  {LEVEL_LABELS[job.level]}
                  {job.minYears != null ? ` · ${job.minYears}+ years` : ''}
                </Fact>
                <Fact icon={<Clock size={16} />} label="Posted">
                  <span className="tabular-nums">
                    {timeAgo(posted, now)}
                    <span className="font-normal text-text-subtle">
                      {' '}
                      · checked {timeAgo(job.lastSeenAt, now)}
                    </span>
                  </span>
                </Fact>
              </dl>
              <div className="mt-3 space-y-2">
                {!job.closedAt && (
                  <a
                    href={job.applyUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    data-track={`apply:${job.slug}`}
                    className="btn btn-primary btn-lg w-full"
                  >
                    Apply on company site <ExternalLink size={15} aria-hidden />
                  </a>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <SaveButton withLabel job={saveJob} />
                  <Link
                    href={`/ats-checker?job=${encodeURIComponent(job.slug)}`}
                    className="btn"
                    data-track={`resume-check:${job.slug}`}
                  >
                    <FileCheck2 size={14} aria-hidden /> Check resume
                  </Link>
                </div>
              </div>
              <p className="mt-3 text-xs text-text-subtle">
                You&apos;ll apply on {job.company.name}&apos;s own careers page ({job.source}).
                RoleUp never asks for your details.
              </p>
            </div>

            {company && (
              <section aria-labelledby="about-company" className="card p-4">
                <div className="flex items-center gap-3">
                  <CompanyLogo company={company} size={36} />
                  <div className="min-w-0">
                    <h2 id="about-company" className="truncate text-sm font-semibold">
                      {company.name}
                    </h2>
                    {company.website && (
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-text-muted hover:text-text"
                      >
                        {company.domain}
                      </a>
                    )}
                  </div>
                </div>
                {tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {tags.map((t) => (
                      <span key={t} className="tag">
                        {COMPANY_TAG_LABELS[t]}
                      </span>
                    ))}
                  </div>
                )}
                {company.fundings[0] && (
                  <p className="mt-3 text-xs text-text-muted">
                    Raised{' '}
                    {company.fundings[0].round === 'Undisclosed'
                      ? 'funding'
                      : company.fundings[0].round}{' '}
                    on {company.fundings[0].announcedOn} ·{' '}
                    <a
                      href={company.fundings[0].sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link"
                    >
                      source
                    </a>
                  </p>
                )}
                <Link href={companyHref(company.slug)} className="btn mt-3 w-full">
                  {company.openJobsCount} open {company.openJobsCount === 1 ? 'job' : 'jobs'} at{' '}
                  {company.name}
                </Link>
              </section>
            )}
          </div>
        </aside>
      </div>
    </article>
  );
}
