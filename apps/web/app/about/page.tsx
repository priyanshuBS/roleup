import type { Metadata } from 'next';
import Link from 'next/link';
import { Info } from 'lucide-react';
import { formatCount } from '@roleup/core';
import { Prose } from '@/components/Prose';
import { getCompanies, getMeta } from '@/lib/data';

export const metadata: Metadata = {
  title: 'About',
  description: 'How RoleUp finds, filters and labels tech jobs in India and remote.',
  alternates: { canonical: '/about' },
};

// Rendered on request (data is still cached for 10 minutes), so builds never need the database.
export const dynamic = 'force-dynamic';

export default async function AboutPage() {
  const [meta, companies] = await Promise.all([getMeta(), getCompanies({ hasJobs: true })]);
  return (
    <Prose title="About RoleUp" icon={Info} eyebrow="How it works">
      <p>
        RoleUp lists tech jobs you can apply to from India: on-site and hybrid roles in Indian
        cities, and remote roles open to India. Right now that&apos;s{' '}
        {formatCount(meta.totalOpenJobs)} open jobs at {formatCount(companies.length)} companies.
      </p>
      <h2>Where the jobs come from</h2>
      <p>
        We read each company&apos;s public job board on Greenhouse, Lever or Ashby every 6 hours. We
        don&apos;t scrape LinkedIn, Naukri, Indeed, Glassdoor or any page that needs a login. Every
        Apply button goes to the employer&apos;s own application page.
      </p>
      <h2>How jobs are labelled</h2>
      <ul>
        <li>
          <strong>Tech only.</strong> Titles are matched against engineering, data, ML, DevOps,
          security, QA, product and design patterns. Sales, recruiting, marketing, finance and
          similar roles are left out.
        </li>
        <li>
          <strong>Remote eligibility.</strong> &quot;India OK&quot; means the posting names India,
          an Indian city or APAC/Asia. &quot;Global&quot; means anywhere. &quot;Restricted&quot;
          means only other regions are named. Restricted roles are hidden unless you ask for them.
        </li>
        <li>
          <strong>Salary.</strong> Only what the employer posted, converted to INR per year at a
          fixed USD rate. We never show an estimate as a salary.
        </li>
        <li>
          <strong>Freshness.</strong> Each job shows when it was posted and when we last saw it on
          the board. A job that disappears from the board is marked closed.
        </li>
      </ul>
      <p>
        Labels come from rules, so they can be wrong. If you spot a mislabelled job, the
        employer&apos;s posting is the source of truth.
      </p>
      <p>
        See also: <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link>
      </p>
    </Prose>
  );
}
