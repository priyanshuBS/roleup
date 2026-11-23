'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Banknote, Building2, ChartColumn, LayoutDashboard, Settings } from 'lucide-react';

const ITEMS = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/analytics', label: 'Analytics', icon: ChartColumn },
  { href: '/admin/funding', label: 'Funding queue', icon: Banknote },
  { href: '/admin/companies', label: 'Companies', icon: Building2 },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminNav() {
  const pathname = usePathname() ?? '/admin';
  return (
    <nav aria-label="Admin" className="no-scrollbar min-w-0 overflow-x-auto">
      <ul className="inline-flex gap-0.5 rounded-full border border-border bg-surface p-1">
        {ITEMS.map((i) => {
          const active = i.href === '/admin' ? pathname === '/admin' : pathname.startsWith(i.href);
          return (
            <li key={i.href}>
              <Link
                href={i.href}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-text text-bg'
                    : 'text-text-muted hover:bg-surface-muted hover:text-text'
                }`}
              >
                <i.icon size={14} aria-hidden />
                {i.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
