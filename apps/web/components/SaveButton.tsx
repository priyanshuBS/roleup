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
          ? 'btn'
          : 'p-2 -m-1 rounded-sm text-text-subtle hover:text-text hover:bg-surface-muted'
      }
    >
      {saved ? (
        <BookmarkCheck size={16} className="text-accent" aria-hidden />
      ) : (
        <Bookmark size={16} aria-hidden />
      )}
      {withLabel && <span>{saved ? 'Saved' : 'Save'}</span>}
    </button>
  );
}
