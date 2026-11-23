import type { Metadata } from 'next';
import Link from 'next/link';
import { ATS_DISCLAIMER } from '@roleup/core/ats-checker';
import { getJobBySlug } from '@/lib/data';
import { AtsChecker } from './AtsChecker';

export const metadata: Metadata = {
  title: 'Free ATS resume checker',
  description:
    'Check how ATS-friendly your resume is. Upload a PDF or DOCX for a score and specific fixes, and compare it against any job description. Free, no sign-up, nothing stored.',
  alternates: { canonical: '/ats-checker' },
};

type Props = { searchParams: Promise<{ job?: string }> };

export default async function AtsCheckerPage({ searchParams }: Props) {
  const { job: jobSlug } = await searchParams;
  const job = jobSlug && /^[a-z0-9-]{3,200}$/.test(jobSlug) ? await getJobBySlug(jobSlug) : null;
  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold tracking-tight">Free ATS resume checker</h1>
      <p className="mt-1 text-sm text-text-muted">
        Upload your resume to see how well applicant tracking systems can read it, what to fix
        first, and how it matches a job.
      </p>
      <div className="mt-4 rounded-md border border-border bg-surface-muted px-4 py-3 text-sm text-text-muted">
        <strong className="text-text">Your resume is not stored.</strong> The file is read in memory
        to extract text, scored, and discarded. We don&apos;t keep the file or its text, and we
        don&apos;t log it.{' '}
        <Link href="/privacy" className="link">
          Privacy
        </Link>
      </div>
      <AtsChecker
        initialJob={job ? { slug: job.slug, title: job.title, company: job.company.name } : null}
      />
      <p className="mt-8 text-xs text-text-subtle">{ATS_DISCLAIMER}</p>
    </div>
  );
}
