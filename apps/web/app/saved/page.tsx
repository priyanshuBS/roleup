import type { Metadata } from 'next';
import { Bookmark } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { SavedList } from './SavedList';

export const metadata: Metadata = {
  title: 'Saved jobs',
  robots: { index: false },
  alternates: { canonical: '/saved' },
};

export default function SavedPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader
        icon={Bookmark}
        eyebrow="Your shortlist"
        title="Saved jobs"
        description="Stored only in this browser. No account, nothing sent to our servers. Clearing site data removes them."
      />
      <SavedList />
    </div>
  );
}
