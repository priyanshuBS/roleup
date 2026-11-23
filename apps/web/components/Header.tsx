import Link from 'next/link';
import { NavLinks } from './NavLinks';
import { SavedCount } from './SavedCount';
import { ThemeToggle } from './ThemeToggle';

function Logo() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="RoleUp home">
      <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="7" fill="var(--ru-accent)" />
        <path
          d="M10 23V9h6.2c3 0 4.8 1.6 4.8 4.2 0 1.9-1 3.2-2.7 3.8L21.6 23h-3.3l-2.9-5.6H13V23zm3-8.2h3c1.3 0 2-.6 2-1.6s-.7-1.6-2-1.6h-3z"
          fill="var(--ru-accent-text)"
        />
      </svg>
      <span className="text-md font-semibold tracking-tight">
        Role<span className="text-accent">Up</span>
      </span>
    </Link>
  );
}

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface">
      <div className="mx-auto flex h-14 max-w-[1180px] items-center gap-3 px-4 sm:gap-6 sm:px-6">
        <Logo />
        <div className="hidden min-w-0 flex-1 sm:block">
          <NavLinks />
        </div>
        <div className="flex-1 sm:hidden" />
        <div className="flex shrink-0 items-center gap-1">
          <Link
            href="/saved"
            className="inline-flex h-8 items-center gap-1 rounded-md px-2.5 text-sm text-text-muted hover:bg-surface-muted hover:text-text"
          >
            Saved <SavedCount />
          </Link>
          <ThemeToggle />
        </div>
      </div>
      {/* Phones: full-width scrollable nav row under the logo. */}
      <div className="border-t border-border px-2 sm:hidden">
        <NavLinks compact />
      </div>
    </header>
  );
}
