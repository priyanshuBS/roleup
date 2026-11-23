'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { SlidersHorizontal, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState } from 'react';

/**
 * Phones/tablets: the filter facets in a bottom sheet. Closes itself when a filter is picked
 * (the URL changes), so each tap applies immediately.
 */
export function MobileFilters({
  activeCount,
  clearHref,
  children,
}: {
  activeCount: number;
  clearHref?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const url = `${usePathname()}?${useSearchParams()?.toString() ?? ''}`;
  const [openedAt, setOpenedAt] = useState(url);
  // Picked a filter: the URL changed since the sheet opened, so close it (render-time sync).
  if (open && url !== openedAt) {
    setOpen(false);
    setOpenedAt(url);
  }
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setOpenedAt(url);
      }}
    >
      <Dialog.Trigger className="btn h-11 shrink-0 lg:hidden">
        <SlidersHorizontal size={15} aria-hidden />
        Filters
        {activeCount > 0 && (
          <span className="num inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-text px-1.5 text-[11px] font-semibold text-bg">
            {activeCount}
          </span>
        )}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="animate-fade-in fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-[var(--radius-xl)] border-t border-border bg-surface shadow-[var(--shadow-lg)]">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <Dialog.Title className="text-base font-semibold">Filters</Dialog.Title>
            <div className="flex items-center gap-1">
              {clearHref && activeCount > 0 && (
                <Link href={clearHref} scroll={false} className="btn btn-ghost btn-sm">
                  Clear all
                </Link>
              )}
              <Dialog.Close className="btn btn-ghost btn-sm btn-icon" aria-label="Close filters">
                <X size={18} aria-hidden />
              </Dialog.Close>
            </div>
          </div>
          <Dialog.Description className="sr-only">
            Pick a filter to apply it straight away.
          </Dialog.Description>
          <div className="overflow-y-auto overscroll-contain px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-4">
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
