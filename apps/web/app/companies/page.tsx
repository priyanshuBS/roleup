import type { Metadata } from 'next';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { COMPANY_TAG_LABELS, COMPANY_TAGS, timeAgo, type CompanyTag } from '@roleup/core';
import { ChipNav } from '@/components/ChipNav';
import { CompanyLogo } from '@/components/CompanyLogo';
import { EmptyState } from '@/components/JobList';
import { MetaPill, PageHeader } from '@/components/PageHeader';
import { getCompanies } from '@/lib/data';
import { companyHref } from '@/lib/urls';

export const metadata: Metadata = {
  title: 'Companies hiring tech roles in India',
  description:
    'Every company RoleUp tracks, with open tech job counts read from their own career boards.',
  alternates: { canonical: '/companies' },
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function CompaniesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const tagParam = typeof sp.tag === 'string' ? sp.tag : undefined;
  const tag = (COMPANY_TAGS as readonly string[]).includes(tagParam ?? '')
    ? (tagParam as CompanyTag)
    : undefined;
  const q = typeof sp.q === 'string' ? sp.q.slice(0, 60) : undefined;
  const companies = await getCompanies({ tag, q, hasJobs: true });
  const now = new Date();

  return (
    <div>
      <PageHeader
        eyebrow="Directory"
        title="Companies hiring"
        description="Counts are India-eligible roles: on-site or hybrid in India, or remote and open to India."
        meta={
          <MetaPill>
            <span className="num font-medium text-text">{companies.length}</span> companies with
            open tech jobs
          </MetaPill>
        }
      />
      <form role="search" action="/companies" className="input-group mb-4 h-11 max-w-md px-3">
        {tag && <input type="hidden" name="tag" value={tag} />}
        <label htmlFor="company-q" className="sr-only">
          Search companies
        </label>
        <Search size={16} aria-hidden className="mr-2.5 shrink-0 text-text-subtle" />
        <input
          id="company-q"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search companies"
          enterKeyHint="search"
          className="w-full text-sm"
        />
        <button type="submit" className="sr-only">
          Search
        </button>
      </form>
      <ChipNav
        label="Company type"
        current={tag ? `/companies?tag=${tag}` : '/companies'}
        items={[
          { href: '/companies', label: 'All' },
          ...COMPANY_TAGS.map((t) => ({
            href: `/companies?tag=${t}`,
            label: COMPANY_TAG_LABELS[t],
          })),
        ]}
      />
      {companies.length === 0 ? (
        <EmptyState
          title="No companies match"
          text="Try a different name or company type."
          action={
            <Link href="/companies" className="btn">
              Show all companies
            </Link>
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((c) => (
            <li key={c.id} className="card card-interactive relative flex items-center gap-3.5 p-4">
              <CompanyLogo company={c} size={44} />
              <div className="min-w-0 flex-1">
                <Link
                  href={companyHref(c.slug)}
                  className="block truncate font-medium after:absolute after:inset-0"
                >
                  {c.name}
                </Link>
                <p className="truncate text-sm text-text-muted">
                  <span className="num font-medium text-text">{c.indiaJobsCount}</span>{' '}
                  {c.indiaJobsCount === 1 ? 'job' : 'jobs'} in India
                  {c.ycBatch ? ` · YC ${c.ycBatch}` : ''}
                </p>
                {c.lastCrawledAt && (
                  <p className="text-xs text-text-subtle">
                    {c.openJobsCount} total · checked {timeAgo(c.lastCrawledAt, now)}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
