import type { Metadata } from 'next';
import Link from 'next/link';
import { COMPANY_TAG_LABELS, COMPANY_TAGS, timeAgo, type CompanyTag } from '@roleup/core';
import { ChipNav } from '@/components/ChipNav';
import { CompanyLogo } from '@/components/CompanyLogo';
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
      <h1 className="text-xl font-semibold tracking-tight">Companies</h1>
      <p className="mt-1 mb-4 text-sm text-text-muted tabular-nums">
        {companies.length} companies with open tech jobs. Counts are India-eligible roles
        (onsite/hybrid in India or remote open to India).
      </p>
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
      <form role="search" className="mb-4 flex max-w-sm gap-2" action="/companies">
        {tag && <input type="hidden" name="tag" value={tag} />}
        <label htmlFor="company-q" className="sr-only">
          Search companies
        </label>
        <input
          id="company-q"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search companies"
          className="field"
        />
        <button className="btn" type="submit">
          Search
        </button>
      </form>
      {companies.length === 0 ? (
        <p className="rounded-md border border-border bg-surface px-4 py-10 text-center text-text-muted">
          No companies match.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((c) => (
            <li
              key={c.id}
              className="relative flex items-center gap-3 bg-surface p-3 hover:bg-surface-muted/60"
            >
              <CompanyLogo company={c} />
              <div className="min-w-0 flex-1">
                <Link
                  href={companyHref(c.slug)}
                  className="font-medium hover:text-accent after:absolute after:inset-0"
                >
                  {c.name}
                </Link>
                <p className="text-xs text-text-subtle tabular-nums">
                  {c.indiaJobsCount} India-eligible · {c.openJobsCount} total
                  {c.ycBatch ? ` · YC ${c.ycBatch}` : ''}
                  {c.lastCrawledAt ? ` · checked ${timeAgo(c.lastCrawledAt, now)}` : ''}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
