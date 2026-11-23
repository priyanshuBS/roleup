'use client';

import { Bookmark, BookmarkCheck } from 'lucide-react';
import { toggleSaved, useSavedJobs, type SavedJob } from '@/lib/saved';

export function SaveButton({
  job,
  withLabel = false,
}: {
  job: Omit<SavedJob, 'savedAt'>;
  withLabel?: boolean;
}) {
  const saved = useSavedJobs().some((j) => j.id === job.id);
  const label = saved ? `Remove ${job.title} from saved jobs` : `Save ${job.title}`;
  return (
    <button
      type="button"
      onClick={() => toggleSaved(job)}
      aria-pressed={saved}
      aria-label={withLabel ? undefined : label}
      title={label}
      className={
        withLabel
          ? `btn ${saved ? '!text-accent' : ''}`
          : `inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
              saved ? 'text-accent' : 'text-text-subtle hover:bg-surface hover:text-text'
            }`
      }
    >
      {saved ? (
        <BookmarkCheck size={17} aria-hidden strokeWidth={2.2} />
      ) : (
        <Bookmark size={17} aria-hidden />
      )}
      {withLabel && <span>{saved ? 'Saved' : 'Save'}</span>}
    </button>
  );
}
