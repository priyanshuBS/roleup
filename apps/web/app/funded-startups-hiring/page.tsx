import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  Hourglass,
  TrendingUp,
  Users,
} from 'lucide-react';
import { daysBetween, formatInrCompact, formatUsdCompact, type FundingItem } from '@roleup/core';
import { CompanyLogo } from '@/components/CompanyLogo';
import { EmptyState } from '@/components/JobList';
import { MetaPill, PageHeader } from '@/components/PageHeader';
import { getFunding } from '@/lib/data';
import { companyHref } from '@/lib/urls';

export const metadata: Metadata = {
  title: 'Recently funded startups hiring',
  description:
    'Startups that recently raised money, with the round, amount, date, source, and their open tech jobs.',
  alternates: { canonical: '/funded-startups-hiring' },
};

// Rendered on request (data is still cached for 10 minutes), so builds never need the database.
export const dynamic = 'force-dynamic';

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
      <PageHeader
        icon={TrendingUp}
        eyebrow="Funding"
        title="Recently funded startups hiring"
        description="Funding rounds from public news, checked by a person before they appear. Amounts are shown as reported, converted at a fixed rate. Each card links to the original source."
        meta={
          items.length > 0 && (
            <>
              <MetaPill>
                <span className="num font-semibold text-text">{items.length}</span> funded companies
              </MetaPill>
              <MetaPill live>
                <span className="num font-semibold text-text">{hiring.length}</span> hiring now
              </MetaPill>
            </>
          )
        }
      />
      {items.length === 0 ? (
        <EmptyState
          icon={Banknote}
          title="No reviewed rounds yet"
          text="Funding news is reviewed by a person before it appears here. Check back soon."
        />
      ) : (
        <>
          <FundingGrid items={hiring} now={now} />
          {notYet.length > 0 && (
            <section className="mt-14">
              <div className="mb-5 flex items-center gap-3">
                <span className="icon-tile !bg-surface-muted !text-text-muted">
                  <Hourglass size={17} aria-hidden />
                </span>
                <div>
                  <h2 className="display text-xl">Recently funded, no tracked openings yet</h2>
                  <p className="text-sm text-text-muted">
                    We haven&apos;t found a public job board for these companies, or they have no
                    open tech roles.
                  </p>
                </div>
              </div>
              <FundingGrid items={notYet} now={now} />
            </section>
          )}
        </>
      )}
    </div>
  );
}

function FundingGrid({ items, now }: { items: FundingItem[]; now: Date }) {
  if (items.length === 0) return null;
  return (
    <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {items.map((f) => {
        const amount = amountText(f);
        const hiring = f.company.openJobsCount > 0;
        return (
          <li key={f.id} className="card card-interactive flex flex-col p-5">
            <div className="flex items-start gap-3.5">
              <CompanyLogo company={f.company} size={44} />
              <div className="min-w-0 flex-1">
                <Link
                  href={companyHref(f.company.slug)}
                  className="block truncate font-semibold transition-colors hover:text-accent"
                >
                  {f.company.name}
                </Link>
                <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-text-subtle">
                  <CalendarDays size={12} aria-hidden />
                  {raisedAgo(f.announcedOn, now)}
                </p>
              </div>
              <span className="tag tag-accent shrink-0">
                {f.round === 'Undisclosed' ? 'Funding round' : f.round}
              </span>
            </div>
            <p className="display num mt-5 text-[1.625rem] leading-none">
              {amount ?? (
                <span className="text-base font-medium text-text-subtle">Amount undisclosed</span>
              )}
            </p>
            {f.investors.length > 0 && (
              <p className="mt-2 flex items-start gap-1.5 text-xs text-text-muted">
                <Users size={13} aria-hidden className="mt-px shrink-0 text-text-subtle" />
                <span className="line-clamp-2">{f.investors.join(', ')}</span>
              </p>
            )}
            <div className="mt-auto flex items-center justify-between gap-3 pt-5">
              {hiring ? (
                <Link href={companyHref(f.company.slug)} className="btn btn-sm btn-ink">
                  <span className="num">{f.company.openJobsCount}</span> open{' '}
                  {f.company.openJobsCount === 1 ? 'job' : 'jobs'}
                  <ArrowRight size={13} aria-hidden />
                </Link>
              ) : (
                <span className="text-xs text-text-subtle">No open jobs tracked</span>
              )}
              <a
                href={f.sourceUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1 text-xs text-text-muted transition-colors hover:text-accent"
              >
                {f.sourceName}
                <ArrowUpRight size={12} aria-hidden />
              </a>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
