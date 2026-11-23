import type { Metadata } from 'next';
import { SavedList } from './SavedList';

export const metadata: Metadata = {
  title: 'Saved jobs',
  robots: { index: false },
  alternates: { canonical: '/saved' },
};

export default function SavedPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold tracking-tight">Saved jobs</h1>
      <p className="mt-1 mb-4 text-sm text-text-muted">
        Stored only in this browser. No account, nothing sent to our servers. Clearing site data
        removes them.
      </p>
      <SavedList />
    </div>
  );
}
