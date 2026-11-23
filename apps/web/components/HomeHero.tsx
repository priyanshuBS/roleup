import Link from 'next/link';
import { Search } from 'lucide-react';
import { formatCount, timeAgo, type FilterMeta } from '@roleup/core';
import { bandHref, cityHref } from '@/lib/urls';

/** Search-first header with live numbers. Every figure comes from the database. */
export function HomeHero({ meta, companyCount }: { meta: FilterMeta; companyCount: number }) {
  const remoteIndia = meta.remote.find((r) => r.value === 'remote_india')?.count ?? 0;
  const remoteGlobal = meta.remote.find((r) => r.value === 'remote_global')?.count ?? 0;
  const yc = meta.tags.find((t) => t.value === 'yc')?.count ?? 0;
  const stats = [
    { label: 'open tech jobs', value: meta.totalOpenJobs },
    { label: 'companies hiring', value: companyCount },
    { label: 'remote roles open to India', value: remoteIndia + remoteGlobal },
    { label: 'jobs at YC startups', value: yc },
  ];
  const chips = [
    { href: '/remote-jobs-india', label: 'Remote (India OK)' },
    { href: '/yc-jobs', label: 'YC startups' },
    { href: '/funded-startups-hiring', label: 'Recently funded' },
    ...meta.cities.slice(0, 5).map((c) => ({ href: cityHref(c.slug), label: c.name })),
    { href: bandHref('40-70-lpa'), label: '₹40–70L' },
    { href: bandHref('70-lpa-plus'), label: '₹70L+' },
  ];

  return (
    <section aria-labelledby="hero-title" className="card mb-6 overflow-hidden">
      <div className="px-5 pt-6 pb-5 sm:px-8 sm:pt-8">
        <h1
          id="hero-title"
          className="text-2xl font-semibold tracking-tight sm:text-[2rem] sm:leading-tight"
        >
          Tech jobs in India and remote
        </h1>
        <p className="mt-2 max-w-2xl text-base text-text-muted">
          Straight from company career pages, checked every 6 hours. Filter by city, salary, level
          and whether a remote role is open to India.
          {meta.lastCrawledAt && (
            <span className="text-text-subtle"> Last updated {timeAgo(meta.lastCrawledAt)}.</span>
          )}
        </p>

        <form action="/" role="search" className="mt-5 flex flex-col gap-2 sm:flex-row">
          <label htmlFor="hero-q" className="sr-only">
            Search jobs
          </label>
          <div className="relative flex-1">
            <Search
              size={16}
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle"
            />
            <input
              id="hero-q"
              name="q"
              type="search"
              placeholder="Job title, company or skill, e.g. Golang, Razorpay"
              maxLength={100}
              className="field !h-11 !pl-9 !text-base"
            />
          </div>
          <label htmlFor="hero-city" className="sr-only">
            Location
          </label>
          <select id="hero-city" name="city" defaultValue="" className="field !h-11 sm:!w-48">
            <option value="">All locations</option>
            <option value="remote">Remote</option>
            {meta.cities.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn-primary btn-lg">
            Search jobs
          </button>
        </form>

        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Popular searches">
          {chips.map((c) => (
            <li key={c.href}>
              <Link href={c.href} className="chip">
                {c.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <dl className="grid grid-cols-2 border-t border-border bg-surface-muted/50 sm:grid-cols-4">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={`px-5 py-3 sm:px-8 ${i % 2 ? 'border-l' : ''} ${i >= 2 ? 'border-t sm:border-t-0' : ''} ${i === 2 ? 'sm:border-l' : ''} border-border`}
          >
            <dt className="text-xs text-text-subtle">{s.label}</dt>
            <dd className="text-lg font-semibold tabular-nums">{formatCount(s.value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
