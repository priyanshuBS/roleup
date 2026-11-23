import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-border mt-10">
      <div className="max-w-[1120px] mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row gap-3 sm:items-center justify-between text-sm text-text-muted">
        <p>
          Jobs come from public company career boards. Always apply on the employer&apos;s site.
        </p>
        <nav aria-label="Footer" className="flex gap-4">
          <Link href="/about" className="hover:text-text">
            About
          </Link>
          <Link href="/privacy" className="hover:text-text">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-text">
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}
