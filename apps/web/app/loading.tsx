/** Instant feedback while a server-rendered page loads: a neutral header + list skeleton. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite" className="animate-pulse">
      <span className="sr-only">Loading…</span>
      <div className="mb-8 max-w-3xl space-y-3">
        <div className="h-9 w-9 rounded-md bg-surface-muted" />
        <div className="h-9 w-3/4 rounded-lg bg-surface-muted sm:h-11" />
        <div className="h-4 w-1/2 rounded bg-surface-muted" />
      </div>
      <div className="flex flex-col gap-4 lg:flex-row lg:gap-8">
        <div className="hidden h-[420px] w-[272px] shrink-0 rounded-[var(--radius-lg)] border border-border bg-surface lg:block" />
        <ul className="flex min-w-0 flex-1 flex-col gap-2.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <li key={i} className="card flex gap-4 p-4 sm:p-5">
              <div className="h-12 w-12 shrink-0 rounded-[13px] bg-surface-muted" />
              <div className="flex-1 space-y-2.5 py-0.5">
                <div className="h-3 w-28 rounded bg-surface-muted" />
                <div className="h-4 w-3/5 rounded bg-surface-muted" />
                <div className="h-3 w-2/5 rounded bg-surface-muted" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
