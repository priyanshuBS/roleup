'use client';

import Link from 'next/link';

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-xl py-10">
      <h1 className="text-xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-2 text-text-muted">
        We couldn&apos;t load this page. It&apos;s probably temporary, so try again in a moment.
      </p>
      <div className="mt-5 flex gap-2">
        <button type="button" onClick={reset} className="btn btn-primary">
          Try again
        </button>
        <Link href="/" className="btn">
          Latest jobs
        </Link>
      </div>
    </div>
  );
}
