'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, Bookmark, Clock, MapPin, Trash2, X } from 'lucide-react';
import { timeAgo } from '@roleup/core';
import { EmptyState } from '@/components/JobList';
import { clearSaved, removeSaved, useHydrated, useSavedJobs } from '@/lib/saved';
import { companyHref, jobHref } from '@/lib/urls';

export function SavedList() {
  const saved = useSavedJobs();
  const hydrated = useHydrated();
  const [confirming, setConfirming] = useState(false);
  if (!hydrated) {
    // localStorage is only readable in the browser; show placeholders until then.
    return (
      <ul className="flex flex-col gap-2.5" aria-busy="true" aria-label="Loading saved jobs">
        {[0, 1, 2].map((i) => (
          <li key={i} className="card flex animate-pulse items-start gap-4 p-4 sm:p-5">
            <span className="h-9 w-9 shrink-0 rounded-md bg-surface-muted" />
            <div className="flex-1 space-y-2.5 py-0.5">
              <div className="h-3 w-24 rounded bg-surface-muted" />
              <div className="h-4 w-2/3 rounded bg-surface-muted" />
              <div className="h-3 w-1/3 rounded bg-surface-muted" />
            </div>
          </li>
        ))}
      </ul>
    );
  }
  if (saved.length === 0) {
    return (
      <EmptyState
        icon={Bookmark}
        title="No saved jobs yet"
        text="Tap the bookmark on any job to keep it here. Saved jobs never leave this browser."
        action={
          <Link href="/" className="btn btn-primary">
            Browse latest jobs <ArrowRight size={15} aria-hidden />
          </Link>
        }
      />
    );
  }
  return (
    <>
      <div className="mb-4 flex items-center justify-between text-sm text-text-muted">
        <span>
          <span className="num font-semibold text-text">{saved.length}</span> saved{' '}
          {saved.length === 1 ? 'job' : 'jobs'}
        </span>
        {confirming ? (
          <span className="flex items-center gap-1.5" role="group" aria-label="Confirm removal">
            <span className="hidden text-xs text-text-subtle sm:inline">
              Remove all saved jobs?
            </span>
            <button
              type="button"
              className="btn btn-sm !border-danger/30 !bg-danger-subtle !text-danger"
              onClick={() => {
                clearSaved();
                setConfirming(false);
              }}
            >
              <Trash2 size={13} aria-hidden /> Yes, remove all
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => setConfirming(false)}
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => setConfirming(true)}
          >
            <Trash2 size={13} aria-hidden /> Remove all
          </button>
        )}
      </div>
      <ul className="divide-y divide-border overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface">
        {saved.map((j) => (
          <li
            key={j.id}
            className="group relative flex items-start gap-4 px-4 py-4 transition-colors hover:bg-surface-muted/60 sm:px-5"
          >
            <div className="min-w-0 flex-1">
              <Link
                href={companyHref(j.companySlug)}
                className="relative z-10 text-sm font-semibold text-text-muted transition-colors hover:text-text"
              >
                {j.companyName}
              </Link>
              <h2 className="mt-0.5 font-semibold leading-snug">
                <Link
                  href={jobHref(j.slug)}
                  className="after:absolute after:inset-0 group-hover:underline group-hover:decoration-border-strong group-hover:underline-offset-4"
                >
                  {j.title}
                </Link>
              </h2>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.8125rem] text-text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={13} aria-hidden className="text-text-subtle" />
                  {j.location}
                </span>
                {j.salary && <span className="num font-medium text-text">{j.salary}</span>}
                <span className="inline-flex items-center gap-1.5 text-text-subtle">
                  <Clock size={13} aria-hidden />
                  Saved {timeAgo(j.savedAt)}
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => removeSaved(j.id)}
              className="btn btn-ghost btn-sm btn-icon relative z-10 -mr-1 -mt-1"
              aria-label={`Remove ${j.title}`}
              title="Remove"
            >
              <X size={16} aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
