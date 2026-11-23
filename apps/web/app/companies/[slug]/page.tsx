import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';
import { COMPANY_TAG_LABELS, formatInrCompact, formatUsdCompact, timeAgo } from '@roleup/core';
import { CompanyLogo } from '@/components/CompanyLogo';
import { ListPage, type SearchParams } from '@/components/ListPage';
import { getCompanyBySlug } from '@/lib/data';
import { formatDate } from '@/lib/format';
import { companyHref } from '@/lib/urls';

type Props = { params: Promise<{ slug: string }>; searchParams: SearchParams };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const company = await getCompanyBySlug((await params).slug);
  if (!company) return { title: 'Company not found', robots: { index: false } };
  return {
    title: `${company.name} jobs in India and remote`,
    description: `${company.openJobsCount} open tech jobs at ${company.name}, read from ${company.name}'s own career board.`,
    alternates: { canonical: companyHref(company.slug) },
  };
}

export default async function CompanyPage({ params, searchParams }: Props) {
  const company = await getCompanyBySlug((await params).slug);
  if (!company) notFound();
  const funding = company.fundings[0];
  const facts = [
    `${company.openJobsCount} open ${company.openJobsCount === 1 ? 'job' : 'jobs'}`,
    company.ycBatch ? `YC ${company.ycBatch}` : null,
    ...company.tags.filter((t) => t !== 'yc').map((t) => COMPANY_TAG_LABELS[t]),
    company.lastCrawledAt ? `board checked ${timeAgo(company.lastCrawledAt)}` : null,
  ].filter(Boolean);

  const hero = (
    <header className="mb-10 border-b border-border pb-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <CompanyLogo company={company} size={64} />
          <div className="min-w-0">
            <h1 className="display break-words text-[1.875rem] leading-tight sm:text-[2.375rem]">
              {company.name}
            </h1>
            {company.domain && <p className="text-sm text-text-subtle">{company.domain}</p>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {company.website && (
            <a
              href={company.website}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm"
            >
              Website <ArrowUpRight size={14} aria-hidden />
            </a>
          )}
          {company.careersUrl && (
            <a
              href={company.careersUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm"
            >
              Careers page <ArrowUpRight size={14} aria-hidden />
            </a>
          )}
        </div>
      </div>
      <p className="mt-5 text-sm text-text-muted">{facts.join(' · ')}</p>
      {funding && (
        <p className="mt-2 text-sm text-text-muted">
          Raised <strong className="font-medium text-text">{funding.round}</strong>
          {funding.amountUsd ? (
            <span className="num">
              {' '}
              ({formatUsdCompact(funding.amountUsd)}
              {funding.amountInr ? ` / ₹${formatInrCompact(funding.amountInr)}` : ''})
            </span>
          ) : null}{' '}
          on {formatDate(funding.announcedOn)} ·{' '}
          <a href={funding.sourceUrl} target="_blank" rel="noopener noreferrer" className="link">
            {funding.sourceName}
          </a>
        </p>
      )}
    </header>
  );

  return (
    <ListPage
      basePath={companyHref(company.slug)}
      searchParams={searchParams}
      fixed={{ company: company.slug }}
      title={`${company.name} jobs`}
      hero={hero}
      listHeading={{ eyebrow: '', title: `Open roles at ${company.name}` }}
      emptyText={`${company.name} has no open India-eligible tech jobs right now. Try the Remote filter for restricted roles.`}
    />
  );
}
