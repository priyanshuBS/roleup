import type { Metadata } from 'next';
import { ShieldCheck } from 'lucide-react';
import { Prose } from '@/components/Prose';
import { CONTACT_EMAIL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Privacy',
  description:
    'No accounts, saved jobs stay on your device, resumes are processed in memory and never stored.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <Prose title="Privacy" updated="23 November 2026" icon={ShieldCheck}>
      <p>
        Short version: no accounts, no cookies, no third-party trackers, and we never keep your
        resume. We count page views and clicks ourselves, anonymously.
      </p>
      <h2>No accounts</h2>
      <p>RoleUp has no sign-up or login. We don&apos;t collect your name, email or phone number.</p>
      <h2>Saved jobs</h2>
      <p>
        Saved jobs are stored in your browser&apos;s local storage (or on your phone, in the app).
        They never leave your device. Clearing site data or uninstalling the app deletes them.
      </p>
      <h2>Resume checker</h2>
      <ul>
        <li>
          Your file is uploaded over HTTPS, read in memory to extract text, scored, and then
          discarded.
        </li>
        <li>We don&apos;t write the file or the extracted text to disk, a database or logs.</li>
        <li>We don&apos;t use your resume to train anything or share it with anyone.</li>
        <li>
          To stop abuse, we count checks per IP address for one hour. We store a one-way hash of the
          IP, not the IP itself, and delete the counts after the hour.
        </li>
      </ul>
      <h2>Visit counts</h2>
      <p>
        To know which pages and jobs are useful, we count page views and clicks with our own code.
        No third-party analytics, no cookies, nothing stored on your device. For each view or click
        we record:
      </p>
      <ul>
        <li>the page path (e.g. /jobs/in/pune) and what was clicked (e.g. an Apply button)</li>
        <li>the website that sent you, if any (just its name, e.g. google.com)</li>
        <li>device type (mobile, tablet or desktop) and country</li>
        <li>
          a visitor code made by hashing your IP address and browser with a secret that changes
          every day. It lets us count unique visitors per day, but can&apos;t identify you or link
          your visits across days. Your IP address itself is never stored.
        </li>
      </ul>
      <p>
        If your browser sends Do Not Track or Global Privacy Control, we don&apos;t count you at
        all. Counts are deleted after about 13 months. There are no advertising cookies.
      </p>
      <h2>Company logos</h2>
      <p>
        Small company logos are loaded from a public favicon service using the company&apos;s
        domain. We send no referrer with these requests.
      </p>
      <h2>Leaving RoleUp</h2>
      <p>
        When you click Apply you go to the employer&apos;s site, and their privacy policy applies
        there.
      </p>
      {CONTACT_EMAIL && (
        <>
          <h2>Contact</h2>
          <p>
            Questions or requests about your data:{' '}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>
        </>
      )}
    </Prose>
  );
}
