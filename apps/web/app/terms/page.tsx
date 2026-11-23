import type { Metadata } from 'next';
import { Scale } from 'lucide-react';
import { Prose } from '@/components/Prose';
import { CONTACT_EMAIL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Terms',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <Prose title="Terms of use" updated="23 November 2026" icon={Scale}>
      <h2>What RoleUp is</h2>
      <p>
        RoleUp is a free directory of job postings published by employers on their public job
        boards. We are not the employer, a recruiter or a staffing agency, and we don&apos;t take
        part in hiring decisions.
      </p>
      <h2>Accuracy</h2>
      <p>
        Postings, locations, levels and salary bands are read and labelled automatically and may be
        out of date or wrong. Always check the employer&apos;s posting before applying. Funding
        information links to its public source and is reviewed by a person before it appears.
      </p>
      <h2>Resume checker</h2>
      <p>
        The ATS score estimates how machine-readable your resume is, using common rules. Real
        applicant tracking systems differ, and a score is not a guarantee of anything.
      </p>
      <h2>Acceptable use</h2>
      <p>
        Don&apos;t use RoleUp to send spam, scrape at high volume, or overload the service. The
        public API is rate limited and may change.
      </p>
      <h2>Trademarks</h2>
      <p>
        Company names and logos belong to their owners and are used only to identify the employer.
      </p>
      <h2>No warranty</h2>
      <p>The service is provided as is, without warranties of any kind.</p>
      {CONTACT_EMAIL && (
        <>
          <h2>Contact and removals</h2>
          <p>
            Employers who want a posting corrected or removed, and anyone with a question about
            these terms, can write to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>
        </>
      )}
    </Prose>
  );
}
