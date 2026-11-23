import type { LucideIcon } from 'lucide-react';
import { PageHeader } from './PageHeader';

/** Long-form text pages (About, Privacy, Terms): one readable column, no card. */
export function Prose({
  title,
  updated,
  eyebrow,
  children,
}: {
  title: string;
  updated?: string;
  /** Accepted for compatibility; not shown. */
  icon?: LucideIcon;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow={eyebrow ?? (updated ? `Last updated ${updated}` : undefined)}
        title={title}
        className="mb-10 border-b border-border pb-8"
      />
      <article className="space-y-4 text-base leading-[1.75] text-text-muted [&_a]:text-accent [&_a]:underline [&_a]:decoration-accent/40 [&_a]:underline-offset-[3px] [&_a:hover]:decoration-current [&_h2]:mt-10 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-[-0.015em] [&_h2]:text-text [&_h2:first-child]:mt-0 [&_li]:relative [&_li]:pl-5 [&_li]:before:absolute [&_li]:before:left-1 [&_li]:before:top-[0.75em] [&_li]:before:h-[5px] [&_li]:before:w-[5px] [&_li]:before:rounded-full [&_li]:before:bg-text-subtle [&_strong]:font-medium [&_strong]:text-text [&_ul]:space-y-2">
        {children}
      </article>
    </div>
  );
}
