'use client';

import Link from 'next/link';
import { RefreshCw } from 'lucide-react';

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center py-16 text-center sm:py-24">
      <h1 className="display text-3xl">Something went wrong</h1>
      <p className="mt-2 text-text-muted">
        We couldn&apos;t load this page. It&apos;s probably temporary, so try again in a moment.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={reset} className="btn btn-primary">
          <RefreshCw size={15} aria-hidden /> Try again
        </button>
        <Link href="/" className="btn">
          Latest jobs
        </Link>
      </div>
    </div>
  );
}
