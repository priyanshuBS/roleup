import Link from 'next/link';
import { SALARY_BAND_META, type FilterMeta } from '@roleup/core';
import { bandHref, cityHref } from '@/lib/urls';

export function QuickLinks({ meta }: { meta: FilterMeta }) {
  const remoteIndia = meta.remote.find((r) => r.value === 'remote_india')?.count ?? 0;
  const yc = meta.tags.find((t) => t.value === 'yc')?.count ?? 0;
  const links: { href: string; label: string; count?: number }[] = [
    { href: '/yc-jobs', label: 'YC companies', count: yc },
    { href: '/remote-jobs-india', label: 'Remote (India OK)', count: remoteIndia },
    { href: '/funded-startups-hiring', label: 'Recently funded' },
    ...meta.cities
      .slice(0, 6)
      .map((c) => ({ href: cityHref(c.slug), label: c.name, count: c.count })),
    ...(['20to40', '40to70', '70plus'] as const).map((b) => ({
      href: bandHref(SALARY_BAND_META[b].slug),
      label: SALARY_BAND_META[b].label,
    })),
  ];
  return (
    <nav
      aria-label="Quick links"
      className="mb-5 -mx-4 px-4 overflow-x-auto [scrollbar-width:none]"
    >
      <ul className="flex gap-2 sm:flex-wrap">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="chip">
              {l.label}
              {l.count ? (
                <span className="ml-1.5 tabular-nums text-text-subtle">
                  {l.count.toLocaleString('en-IN')}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
