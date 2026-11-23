import Link from 'next/link';
import { SavedCount } from './SavedCount';
import { ThemeToggle } from './ThemeToggle';

const NAV = [
  { href: '/', label: 'Latest' },
  { href: '/companies', label: 'Companies' },
  { href: '/remote-jobs', label: 'Remote' },
  { href: '/yc-jobs', label: 'YC' },
  { href: '/funded-startups-hiring', label: 'Funded' },
  { href: '/ats-checker', label: 'ATS checker' },
];

export function Header() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="max-w-[1120px] mx-auto px-4 sm:px-6 h-14 flex items-center gap-3 sm:gap-5">
        <Link
          href="/"
          className="font-semibold text-md tracking-tight shrink-0"
          aria-label="RoleUp home"
        >
          Role<span className="text-accent">Up</span>
        </Link>
        <nav aria-label="Main" className="flex-1 min-w-0 overflow-x-auto [scrollbar-width:none]">
          <ul className="flex items-center gap-0.5 text-sm text-text-muted">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  className="block px-2 py-1.5 rounded-sm hover:text-text hover:bg-surface-muted whitespace-nowrap"
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-0.5 shrink-0">
          <Link
            href="/saved"
            className="px-2 py-1.5 rounded-sm text-sm text-text-muted hover:text-text hover:bg-surface-muted whitespace-nowrap"
          >
            Saved <SavedCount />
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
