import type { LucideIcon } from 'lucide-react';

/**
 * Title block shared by inner pages: small context line, heading, description, a meta line
 * and optional right-aligned actions. Type and spacing only; no decorative icon tiles.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  meta,
  actions,
  className = 'mb-8',
}: {
  /** Accepted for compatibility; headers no longer show an icon. */
  icon?: LucideIcon;
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={`flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between ${className}`}
    >
      <div className="min-w-0 max-w-3xl">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="display break-words text-[1.875rem] leading-[1.1] sm:text-[2.5rem]">
          {title}
        </h1>
        {description && (
          <div className="mt-3 max-w-2xl text-base text-text-muted">{description}</div>
        )}
        {meta && (
          <div className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-text-subtle">
            {meta}
          </div>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

/** One item of the header meta line ("1,240 jobs · updated 2h ago"). */
export function MetaPill({
  children,
  live = false,
}: {
  children: React.ReactNode;
  live?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 [&:not(:first-child)]:before:mr-1.5 [&:not(:first-child)]:before:text-border-strong [&:not(:first-child)]:before:content-['·']">
      {live && <span className="live-dot" aria-hidden />}
      {children}
    </span>
  );
}
