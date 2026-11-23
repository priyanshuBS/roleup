import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="relative mx-auto flex max-w-xl flex-col items-center py-16 text-center sm:py-24">
      <p className="num text-sm font-medium text-text-subtle">404</p>
      <h1 className="display mt-2 text-3xl">Page not found</h1>
      <p className="mt-2 text-text-muted">
        This page doesn&apos;t exist. If it was a job, it may have closed more than 30 days ago.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <Link href="/" className="btn btn-primary">
          Latest jobs <ArrowRight size={15} aria-hidden />
        </Link>
        <Link href="/companies" className="btn">
          Companies
        </Link>
      </div>
    </div>
  );
}
