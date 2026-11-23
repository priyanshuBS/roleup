'use client';

import { useSavedJobs } from '@/lib/saved';

/** Count badge pinned to the corner of the Saved icon button. */
export function SavedCount() {
  const saved = useSavedJobs();
  if (saved.length === 0) return null;
  return (
    <span className="num absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold leading-none text-accent-text ring-2 ring-bg">
      {saved.length > 99 ? '99+' : saved.length}
      <span className="sr-only"> saved</span>
    </span>
  );
}
