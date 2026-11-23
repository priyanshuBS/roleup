'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV: { href: string; label: string; match: (p: string) => boolean }[] = [
  { href: '/', label: 'Jobs', match: (p) => p === '/' || p.startsWith('/jobs') },
  { href: '/remote-jobs', label: 'Remote', match: (p) => p.startsWith('/remote-jobs') },
  { href: '/companies', label: 'Companies', match: (p) => p.startsWith('/companies') },
  { href: '/yc-jobs', label: 'YC startups', match: (p) => p.startsWith('/yc-jobs') },
  {
    href: '/funded-startups-hiring',
    label: 'Recently funded',
    match: (p) => p.startsWith('/funded'),
  },
  { href: '/ats-checker', label: 'Resume check', match: (p) => p.startsWith('/ats-checker') },
];

/** Text tabs; the current section gets an ink underline. Scrolls sideways on narrow screens. */
export function NavLinks() {
  const pathname = usePathname() ?? '/';
  return (
    <nav aria-label="Main" className="no-scrollbar -mb-px overflow-x-auto">
      <ul className="flex items-center gap-5 md:gap-6">
        {NAV.map((n) => {
          const active = n.match(pathname);
          return (
            <li key={n.href}>
              <Link
                href={n.href}
                aria-current={active ? 'page' : undefined}
                className={`relative flex h-11 items-center whitespace-nowrap text-sm transition-colors md:h-14 ${
                  active
                    ? 'font-medium text-text after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-text'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                {n.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
