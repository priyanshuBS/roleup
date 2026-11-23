'use client';

import Link from 'next/link';
import { X } from 'lucide-react';
import { timeAgo } from '@roleup/core';
import { clearSaved, removeSaved, useSavedJobs } from '@/lib/saved';
import { companyHref, jobHref } from '@/lib/urls';

export function SavedList() {
  const saved = useSavedJobs();
  if (saved.length === 0) {
    return (
      <div className="rounded-md border border-border bg-surface px-4 py-10 text-center">
        <p className="text-text-muted">
          No saved jobs yet. Use the bookmark icon on any job to keep it here.
        </p>
        <Link href="/" className="link mt-2 inline-block text-sm">
          Browse latest jobs
        </Link>
      </div>
    );
  }
  return (
    <>
      <ul className="rounded-md border border-border bg-surface">
        {saved.map((j) => (
          <li
            key={j.id}
            className="flex items-start gap-3 border-b border-border px-3 py-3 last:border-b-0"
          >
            <div className="min-w-0 flex-1">
              <Link href={jobHref(j.slug)} className="font-medium hover:text-accent">
                {j.title}
              </Link>
              <p className="text-sm text-text-muted">
                <Link
                  href={companyHref(j.companySlug)}
                  className="text-text hover:underline underline-offset-2"
                >
                  {j.companyName}
                </Link>
                {' · '}
                {j.location}
                {j.salary && <span className="tabular-nums"> · {j.salary}</span>}
              </p>
              <p className="text-xs text-text-subtle">Saved {timeAgo(j.savedAt)}</p>
            </div>
            <button
              type="button"
              onClick={() => removeSaved(j.id)}
              className="p-2 -m-1 rounded-sm text-text-subtle hover:text-text hover:bg-surface-muted"
              aria-label={`Remove ${j.title}`}
            >
              <X size={16} aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex justify-between text-sm text-text-muted">
        <span className="tabular-nums">{saved.length} saved</span>
        <button type="button" className="link" onClick={() => clearSaved()}>
          Remove all
        </button>
      </div>
    </>
  );
}
