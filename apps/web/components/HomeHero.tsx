import Link from 'next/link';
import { MapPin, Search } from 'lucide-react';
import { formatCount, timeAgo, type FilterMeta } from '@roleup/core';
import { bandHref, cityHref } from '@/lib/urls';

/** Search-first landing header. Every number comes from the database. */
export function HomeHero({ meta, companyCount }: { meta: FilterMeta; companyCount: number }) {
  const remoteIndia = meta.remote.find((r) => r.value === 'remote_india')?.count ?? 0;
  const remoteGlobal = meta.remote.find((r) => r.value === 'remote_global')?.count ?? 0;
  const yc = meta.tags.find((t) => t.value === 'yc')?.count ?? 0;
  const stats = [
    { label: 'open tech jobs', value: meta.totalOpenJobs, href: '#jobs' },
    {
      label: 'remote, open to India',
      value: remoteIndia + remoteGlobal,
      href: '/remote-jobs-india',
    },
    { label: 'at YC startups', value: yc, href: '/yc-jobs' },
    { label: 'companies hiring', value: companyCount, href: '/companies' },
  ];
  const popular = [
    ...meta.cities.slice(0, 5).map((c) => ({ href: cityHref(c.slug), label: c.name })),
    { href: '/remote-jobs-india', label: 'Remote (India OK)' },
    { href: bandHref('40-70-lpa'), label: '₹40–70L' },
  ];

  return (
    <section aria-labelledby="hero-title" className="mb-12 sm:mb-16">
      <p className="text-sm text-text-muted">
        <span className="num font-medium text-text">{formatCount(meta.totalOpenJobs)}</span> open
        roles
        {meta.lastCrawledAt && <> · updated {timeAgo(meta.lastCrawledAt)}</>}
      </p>
      <h1
        id="hero-title"
        className="display mt-3 max-w-[18ch] text-[2.375rem] leading-[1.04] sm:text-[3.5rem] lg:text-[4rem]"
      >
        Tech jobs in India and remote, from the source.
      </h1>
      <p className="mt-4 max-w-xl text-base text-text-muted sm:text-lg">
        Read straight from company career pages every 6 hours. Filter by city, salary, level, and
        whether a remote role really accepts India.
      </p>

      <form
        action="/"
        role="search"
        className="input-group mt-8 max-w-3xl flex-col items-stretch p-1.5 shadow-[var(--shadow-md)] sm:h-14 sm:flex-row sm:items-center"
      >
        <label htmlFor="hero-q" className="sr-only">
          Search jobs
        </label>
        <div className="flex h-11 flex-1 items-center gap-2.5 px-2.5">
          <Search size={18} aria-hidden className="shrink-0 text-text-subtle" />
          <input
            id="hero-q"
            name="q"
            type="search"
            placeholder="Role, company or skill"
            maxLength={100}
            className="w-full text-base"
          />
        </div>
        <span aria-hidden className="mx-1 hidden h-6 w-px bg-border sm:block" />
        <label htmlFor="hero-city" className="sr-only">
          Location
        </label>
        <div className="flex h-11 items-center gap-2 border-t border-border px-2.5 sm:w-48 sm:border-0">
          <MapPin size={16} aria-hidden className="shrink-0 text-text-subtle" />
          <select id="hero-city" name="city" defaultValue="" className="w-full text-sm">
            <option value="">Anywhere</option>
            <option value="remote">Remote</option>
            {meta.cities.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary mt-1 h-11 sm:mt-0 sm:ml-1">
          Search jobs
        </button>
      </form>

      <p className="mt-4 flex max-w-3xl flex-wrap items-center gap-x-1 gap-y-1.5 text-sm text-text-subtle">
        <span className="mr-1">Popular:</span>
        {popular.map((c, i) => (
          <span key={c.href} className="inline-flex items-center">
            <Link
              href={c.href}
              className="text-text-muted underline-offset-4 hover:text-text hover:underline"
            >
              {c.label}
            </Link>
            {i < popular.length - 1 && (
              <span aria-hidden className="ml-1 text-border-strong">
                ·
              </span>
            )}
          </span>
        ))}
      </p>

      <dl className="mt-12 grid grid-cols-2 border-y border-border sm:grid-cols-4">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={`py-5 ${i % 2 === 1 ? 'pl-5 border-l border-border' : 'pr-5'} sm:px-5 sm:first:pl-0 ${i > 0 ? 'sm:border-l sm:border-border' : ''} ${i > 1 ? 'border-t border-border sm:border-t-0' : ''}`}
          >
            <dt className="sr-only">{s.label}</dt>
            <dd>
              <Link href={s.href} className="group block">
                <span className="num block text-[1.75rem] font-semibold leading-none tracking-[-0.03em] sm:text-[2rem]">
                  {formatCount(s.value)}
                </span>
                <span className="mt-1.5 block text-sm text-text-muted group-hover:text-text">
                  {s.label}
                </span>
              </Link>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
