import Link from 'next/link';

/** Horizontal row of navigation chips (batches, bands, remote types…). Scrolls on phones. */
export function ChipNav({
  label,
  items,
  current,
}: {
  label: string;
  items: { href: string; label: string; count?: number }[];
  current?: string;
}) {
  return (
    <nav
      aria-label={label}
      className="no-scrollbar -mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0"
    >
      <ul className="flex gap-2 sm:flex-wrap">
        {items.map((i) => (
          <li key={i.href}>
            <Link
              href={i.href}
              className="chip"
              aria-current={current === i.href ? 'page' : undefined}
            >
              {i.label}
              {i.count !== undefined && (
                <span className="chip-count">{i.count.toLocaleString('en-IN')}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
