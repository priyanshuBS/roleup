import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="max-w-xl py-10">
      <p className="text-sm text-text-subtle tabular-nums">404</p>
      <h1 className="mt-1 text-xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 text-text-muted">
        This page doesn&apos;t exist. If it was a job, it may have closed more than 30 days ago.
      </p>
      <div className="mt-5 flex gap-2">
        <Link href="/" className="btn btn-primary">
          Latest jobs
        </Link>
        <Link href="/companies" className="btn">
          Companies
        </Link>
      </div>
    </div>
  );
}
