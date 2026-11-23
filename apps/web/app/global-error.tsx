'use client';

import './globals.css';

/** Last-resort boundary: replaces the root layout when it fails, so it renders its own shell. */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en-IN">
      <body className="flex min-h-screen items-center justify-center px-6 antialiased">
        <div className="max-w-md text-center">
          <p className="eyebrow">RoleUp</p>
          <h1 className="display mt-3 text-3xl">Something went wrong</h1>
          <p className="mt-2 text-text-muted">
            The site hit an unexpected error. It&apos;s probably temporary, so try again in a
            moment.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={reset} className="btn btn-primary">
              Try again
            </button>
            {/* Plain <a>: a full reload is the safest recovery when the app shell failed. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" className="btn">
              Latest jobs
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
