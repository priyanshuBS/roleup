import type { Metadata } from 'next';
import { Prose } from '@/components/Prose';

export const metadata: Metadata = {
  title: 'Privacy',
  description:
    'No accounts, saved jobs stay on your device, resumes are processed in memory and never stored.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <Prose title="Privacy" updated="23 November 2026">
      <p>Short version: no accounts, no tracking, and we never keep your resume.</p>
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
      <h2>Analytics and cookies</h2>
      <p>No analytics scripts, no advertising cookies, no third-party trackers.</p>
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
    </Prose>
  );
}
