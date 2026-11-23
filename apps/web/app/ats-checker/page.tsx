import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { ATS_DISCLAIMER } from '@roleup/core/ats-checker';
import { PageHeader } from '@/components/PageHeader';
import { getJobBySlug } from '@/lib/data';
import { AtsChecker } from './AtsChecker';

export const metadata: Metadata = {
  title: 'Free ATS resume checker',
  description:
    'Check how ATS-friendly your resume is. Upload a PDF or DOCX for a score and specific fixes, and compare it against any job description. Free, no sign-up, nothing stored.',
  alternates: { canonical: '/ats-checker' },
};

type Props = { searchParams: Promise<{ job?: string }> };

const FEATURES = [
  { title: 'ATS score', text: 'How well parsers can read your resume, out of 100.' },
  { title: 'Fixes first', text: 'The changes that will move your score the most.' },
  { title: 'Keyword match', text: 'Skills from the job that your resume is missing.' },
];

export default async function AtsCheckerPage({ searchParams }: Props) {
  const { job: jobSlug } = await searchParams;
  const job = jobSlug && /^[a-z0-9-]{3,200}$/.test(jobSlug) ? await getJobBySlug(jobSlug) : null;
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Free tool · no sign-up"
        title="ATS resume checker"
        description="Upload your resume to see how well applicant tracking systems can read it, what to fix first, and how it matches a job."
        className="mb-8"
      />
      <ol className="grid grid-cols-1 gap-x-8 gap-y-4 border-y border-border py-5 sm:grid-cols-3">
        {FEATURES.map((f, i) => (
          <li key={f.title}>
            <p className="text-sm font-semibold">
              <span className="num mr-2 text-accent">{i + 1}</span>
              {f.title}
            </p>
            <p className="mt-1 text-sm text-text-muted">{f.text}</p>
          </li>
        ))}
      </ol>
      <div className="mt-5 flex gap-3 text-sm text-text-muted">
        <ShieldCheck size={18} aria-hidden className="mt-px shrink-0 text-success" />
        <p>
          <strong className="text-text">Your resume is not stored.</strong> The file is read in
          memory to extract text, scored, and discarded. We don&apos;t keep the file or its text,
          and we don&apos;t log it.{' '}
          <Link href="/privacy" className="link">
            Privacy
          </Link>
        </p>
      </div>
      <AtsChecker
        initialJob={job ? { slug: job.slug, title: job.title, company: job.company.name } : null}
      />
      <p className="mt-10 text-xs text-text-subtle">{ATS_DISCLAIMER}</p>
    </div>
  );
}
