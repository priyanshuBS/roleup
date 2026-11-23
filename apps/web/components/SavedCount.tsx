'use client';

import { useSavedJobs } from '@/lib/saved';

export function SavedCount() {
  const saved = useSavedJobs();
  if (saved.length === 0) return null;
  return <span className="tabular-nums text-text-subtle">({saved.length})</span>;
}
