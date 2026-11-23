import Link from 'next/link';
import { CONTACT_EMAIL } from '@/lib/site';
import { getSettings } from '@/lib/settings';
import { Logo } from './Logo';

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: 'Browse',
    links: [
      { href: '/', label: 'Latest jobs' },
      { href: '/remote-jobs-india', label: 'Remote (India OK)' },
      { href: '/yc-jobs', label: 'YC startups' },
      { href: '/funded-startups-hiring', label: 'Recently funded' },
      { href: '/companies', label: 'All companies' },
    ],
  },
  {
    title: 'Cities',
    links: [
      { href: '/jobs/in/bengaluru', label: 'Bengaluru' },
      { href: '/jobs/in/delhi-ncr', label: 'Delhi NCR' },
      { href: '/jobs/in/hyderabad', label: 'Hyderabad' },
      { href: '/jobs/in/pune', label: 'Pune' },
      { href: '/jobs/in/mumbai', label: 'Mumbai' },
    ],
  },
  {
    title: 'Salary',
    links: [
      { href: '/jobs/salary/10-20-lpa', label: '₹10–20L' },
      { href: '/jobs/salary/20-40-lpa', label: '₹20–40L' },
      { href: '/jobs/salary/40-70-lpa', label: '₹40–70L' },
      { href: '/jobs/salary/70-lpa-plus', label: '₹70L+' },
    ],
  },
  {
    title: 'RoleUp',
    links: [
      { href: '/ats-checker', label: 'Resume checker' },
      { href: '/saved', label: 'Saved jobs' },
      { href: '/about', label: 'About' },
      { href: '/privacy', label: 'Privacy' },
      { href: '/terms', label: 'Terms' },
    ],
  },
];

export async function Footer() {
  const { androidApkUrl } = await getSettings();
  const columns = androidApkUrl
    ? COLUMNS.map((c) =>
        c.title === 'RoleUp'
          ? { ...c, links: [{ href: '/app', label: 'Android app' }, ...c.links] }
          : c,
      )
    : COLUMNS;
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-text-muted">
              Tech jobs in India and remote, read from company job boards every 6 hours. No
              accounts, no ads. Every Apply button goes to the employer.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {columns.map((c) => (
              <nav key={c.title} aria-label={c.title}>
                <h2 className="text-sm font-medium">{c.title}</h2>
                <ul className="mt-3 space-y-2 text-sm">
                  {c.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="text-text-muted hover:text-text">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>
        <div className="mt-10 flex flex-col gap-1 border-t border-border pt-6 text-xs text-text-subtle sm:flex-row sm:justify-between">
          <p>
            © {new Date().getFullYear()} RoleUp. Always apply on the employer&apos;s site.
            {CONTACT_EMAIL && (
              <>
                {' '}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="underline-offset-2 hover:text-text hover:underline"
                >
                  Contact
                </a>
              </>
            )}
          </p>
          <p>Job boards checked every 6 hours</p>
        </div>
      </div>
    </footer>
  );
}
