'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/', label: 'Jobs', match: (p: string) => p === '/' || p.startsWith('/jobs') },
  { href: '/companies', label: 'Companies', match: (p: string) => p.startsWith('/companies') },
  { href: '/remote-jobs', label: 'Remote', match: (p: string) => p.startsWith('/remote-jobs') },
  { href: '/yc-jobs', label: 'YC', match: (p: string) => p.startsWith('/yc-jobs') },
  {
    href: '/funded-startups-hiring',
    label: 'Funded',
    match: (p: string) => p.startsWith('/funded'),
  },
  {
    href: '/ats-checker',
    label: 'ATS checker',
    match: (p: string) => p.startsWith('/ats-checker'),
  },
];

export function NavLinks({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname() ?? '/';
  return (
    <nav aria-label="Main" className="min-w-0 overflow-x-auto [scrollbar-width:none]">
      <ul className="flex items-center gap-0.5 text-sm">
        {NAV.map((n) => {
          const active = n.match(pathname);
          return (
            <li key={n.href}>
              <Link
                href={n.href}
                aria-current={active ? 'page' : undefined}
                className={`relative inline-flex ${compact ? 'h-11' : 'h-14'} items-center whitespace-nowrap px-2.5 transition-colors ${
                  active
                    ? 'font-medium text-text after:absolute after:inset-x-2.5 after:bottom-0 after:h-0.5 after:rounded-full after:bg-accent'
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
