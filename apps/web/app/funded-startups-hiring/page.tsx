import type { Metadata } from 'next';
import Link from 'next/link';
import { daysBetween, formatInrCompact, formatUsdCompact, type FundingItem } from '@roleup/core';
import { CompanyLogo } from '@/components/CompanyLogo';
import { getFunding } from '@/lib/data';
import { companyHref } from '@/lib/urls';

export const metadata: Metadata = {
  title: 'Recently funded startups hiring',
  description:
    'Startups that recently raised money, with the round, amount, date, source, and their open tech jobs.',
  alternates: { canonical: '/funded-startups-hiring' },
};

function amountText(f: FundingItem): string | null {
  const parts: string[] = [];
  if (f.amountInr) parts.push(`₹${formatInrCompact(f.amountInr).replace('₹', '')}`);
  if (f.amountUsd) parts.push(formatUsdCompact(f.amountUsd));
  return parts.length ? parts.join(' · ') : null;
}

function raisedAgo(date: string, now: Date): string {
  const d = daysBetween(new Date(date), now);
  if (d === 0) return 'Raised today';
  if (d === 1) return 'Raised yesterday';
  if (d < 60) return `Raised ${d} days ago`;
  return `Raised ${Math.round(d / 30)} months ago`;
}

export default async function FundedPage() {
  const all = await getFunding(200);
  const now = new Date();
  // One card per company: its latest approved round.
  const seen = new Set<number>();
  const items = all.filter((f) =>
    seen.has(f.company.id) ? false : (seen.add(f.company.id), true),
  );
  const hiring = items.filter((f) => f.company.openJobsCount > 0);
  const notYet = items.filter((f) => f.company.openJobsCount === 0);

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">Recently funded startups hiring</h1>
      <p className="mt-1 mb-5 max-w-2xl text-sm text-text-muted">
        Funding rounds from public news, checked by a person before they appear. Amounts are shown
        as reported, converted at a fixed rate. Each card links to the original source.
      </p>
      {items.length === 0 ? (
        <p className="rounded-md border border-border bg-surface px-4 py-10 text-center text-text-muted">
          No reviewed funding rounds yet.
        </p>
      ) : (
        <>
          <FundingGrid items={hiring} now={now} />
          {notYet.length > 0 && (
            <>
              <h2 className="mt-8 mb-2 text-md font-semibold">
                Recently funded, no tracked openings yet
              </h2>
              <p className="mb-3 text-sm text-text-muted">
                We haven&apos;t found a public job board for these companies, or they have no open
                tech roles.
              </p>
              <FundingGrid items={notYet} now={now} />
            </>
          )}
        </>
      )}
    </div>
  );
}

function FundingGrid({ items, now }: { items: FundingItem[]; now: Date }) {
  if (items.length === 0) return null;
  return (
    <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2">
      {items.map((f) => {
        const amount = amountText(f);
        return (
          <li key={f.id} className="flex gap-3 bg-surface p-4">
            <CompanyLogo company={f.company} size={32} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <Link href={companyHref(f.company.slug)} className="font-medium hover:text-accent">
                  {f.company.name}
                </Link>
                <span className="text-xs text-text-subtle tabular-nums">
                  {raisedAgo(f.announcedOn, now)}
                </span>
              </div>
              <p className="mt-0.5 text-sm">
                <span className="font-medium">
                  {f.round === 'Undisclosed' ? 'Funding round' : f.round}
                </span>
                {amount && <span className="tabular-nums text-text-muted"> · {amount}</span>}
              </p>
              {f.investors.length > 0 && (
                <p className="mt-0.5 truncate text-xs text-text-muted">{f.investors.join(', ')}</p>
              )}
              <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                {f.company.openJobsCount > 0 ? (
                  <Link href={companyHref(f.company.slug)} className="link tabular-nums">
                    {f.company.openJobsCount} open {f.company.openJobsCount === 1 ? 'job' : 'jobs'}
                  </Link>
                ) : (
                  <span className="text-text-subtle">No open jobs tracked</span>
                )}
                <a
                  href={f.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-xs text-text-muted hover:text-text"
                >
                  Source: {f.sourceName}
                </a>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
