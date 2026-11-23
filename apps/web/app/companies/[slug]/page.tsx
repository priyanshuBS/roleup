import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { COMPANY_TAG_LABELS, formatUsdCompact, formatInrCompact, timeAgo } from '@roleup/core';
import { CompanyLogo } from '@/components/CompanyLogo';
import { ListPage, type SearchParams } from '@/components/ListPage';
import { getCompanyBySlug } from '@/lib/data';
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
  return (
    <div>
      <header className="mb-5 flex items-start gap-4">
        <CompanyLogo company={company} size={48} />
        <div className="min-w-0">
          <div className="flex flex-wrap gap-1.5">
            {company.ycBatch && <span className="tag tag-accent">YC {company.ycBatch}</span>}
            {company.tags
              .filter((t) => t !== 'yc')
              .map((t) => (
                <span key={t} className="tag">
                  {COMPANY_TAG_LABELS[t]}
                </span>
              ))}
          </div>
          <p className="mt-1.5 text-sm text-text-muted">
            {company.website && (
              <a href={company.website} target="_blank" rel="noopener noreferrer" className="link">
                {company.domain}
              </a>
            )}
            {company.careersUrl && (
              <>
                {' · '}
                <a
                  href={company.careersUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link"
                >
                  Careers page
                </a>
              </>
            )}
            {company.lastCrawledAt && <> · Board checked {timeAgo(company.lastCrawledAt)}</>}
          </p>
          {funding && (
            <p className="mt-1 text-sm text-text-muted">
              Raised {funding.round}
              {funding.amountUsd
                ? ` (${formatUsdCompact(funding.amountUsd)}${funding.amountInr ? ` / ₹${formatInrCompact(funding.amountInr)}` : ''})`
                : ''}{' '}
              on {funding.announcedOn} ·{' '}
              <a
                href={funding.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="link"
              >
                {funding.sourceName}
              </a>
            </p>
          )}
        </div>
      </header>
      <ListPage
        basePath={companyHref(company.slug)}
        searchParams={searchParams}
        fixed={{ company: company.slug }}
        title={`${company.name} jobs`}
        emptyText={`${company.name} has no open India-eligible tech jobs right now. Try the Remote filter for restricted roles.`}
      />
    </div>
  );
}
