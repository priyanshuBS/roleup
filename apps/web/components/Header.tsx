import Link from 'next/link';
import { Bookmark, Smartphone } from 'lucide-react';
import { getSettings } from '@/lib/settings';
import { Logo } from './Logo';
import { NavLinks } from './NavLinks';
import { SavedCount } from './SavedCount';
import { ThemeToggle } from './ThemeToggle';

export async function Header() {
  const { androidApkUrl } = await getSettings();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Logo />
        <div className="hidden min-w-0 flex-1 md:block">
          <NavLinks />
        </div>
        <div className="flex-1 md:hidden" />
        <div className="flex shrink-0 items-center gap-0.5">
          {androidApkUrl && (
            <Link
              href="/app"
              className="btn btn-ghost btn-sm gap-1.5"
              aria-label="Get the Android app"
              title="Get the Android app"
            >
              <Smartphone size={16} aria-hidden />
              <span className="hidden lg:inline">Get the app</span>
            </Link>
          )}
          <Link
            href="/saved"
            className="btn btn-ghost btn-sm btn-icon relative"
            aria-label="Saved jobs"
            title="Saved jobs"
          >
            <Bookmark size={16} aria-hidden />
            <SavedCount />
          </Link>
          <ThemeToggle />
        </div>
      </div>
      {/* Phones and small tablets: a scrollable row of section tabs under the logo. */}
      <div className="border-t border-border md:hidden">
        <div className="px-4 sm:px-6">
          <NavLinks />
        </div>
      </div>
    </header>
  );
}
