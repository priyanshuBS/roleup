import Link from 'next/link';

/** Horizontal list of navigation chips (batches, bands, remote types…). */
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
    <nav aria-label={label} className="mb-5 -mx-4 px-4 overflow-x-auto [scrollbar-width:none]">
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
                <span className="ml-1.5 tabular-nums text-text-subtle">
                  {i.count.toLocaleString('en-IN')}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
