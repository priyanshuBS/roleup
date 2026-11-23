import Link from 'next/link';

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: 'Browse',
    links: [
      { href: '/', label: 'Latest jobs' },
      { href: '/remote-jobs-india', label: 'Remote (India OK)' },
      { href: '/yc-jobs', label: 'YC companies' },
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
      { href: '/jobs/salary/20-40-lpa', label: '₹20–40L' },
      { href: '/jobs/salary/40-70-lpa', label: '₹40–70L' },
      { href: '/jobs/salary/70-lpa-plus', label: '₹70L+' },
    ],
  },
  {
    title: 'Tools',
    links: [
      { href: '/ats-checker', label: 'ATS resume checker' },
      { href: '/saved', label: 'Saved jobs' },
      { href: '/about', label: 'About' },
      { href: '/privacy', label: 'Privacy' },
      { href: '/terms', label: 'Terms' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <div className="mx-auto max-w-[1180px] px-4 py-10 sm:px-6">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {COLUMNS.map((c) => (
            <nav key={c.title} aria-label={c.title}>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-text-subtle">
                {c.title}
              </h2>
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
        <div className="mt-10 flex flex-col gap-2 border-t border-border pt-6 text-xs text-text-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>
            Jobs are read from public company career boards every 6 hours. Always apply on the
            employer&apos;s site.
          </p>
          <p>No accounts. No ads. Your resume is never stored.</p>
        </div>
      </div>
    </footer>
  );
}
