'use client';

/**
 * First-party page view + click tracking. No cookies, no local storage, no third parties.
 * Honours Do Not Track and Global Privacy Control. Admin pages are never tracked.
 */
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

type Payload = {
  t: 'view' | 'click';
  p: string;
  r?: string;
  k?: string;
  l?: string;
  /** Views: search text on list pages. */
  q?: string;
  /** Views: first page of this visit. */
  e?: 1;
};

function optedOut(): boolean {
  const n = navigator as Navigator & { globalPrivacyControl?: boolean };
  // Automated browsers (Lighthouse, Puppeteer, Selenium) report navigator.webdriver.
  return n.globalPrivacyControl === true || n.doNotTrack === '1' || n.webdriver === true;
}

function send(payload: Payload) {
  const body = JSON.stringify(payload);
  try {
    if (navigator.sendBeacon?.('/api/e', new Blob([body], { type: 'application/json' }))) return;
  } catch {
    /* fall through */
  }
  void fetch('/api/e', {
    method: 'POST',
    body,
    keepalive: true,
    headers: { 'Content-Type': 'application/json' },
  }).catch(() => undefined);
}

/** What was clicked: explicit data-track, else link destination, else button label. */
function describe(el: HTMLElement): { k: string; l: string } | null {
  const label = (el.getAttribute('aria-label') || el.textContent || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
  const tracked = el.closest<HTMLElement>('[data-track]')?.dataset.track;
  if (tracked) return { k: tracked.slice(0, 300), l: label };
  if (el instanceof HTMLAnchorElement && el.href) {
    try {
      const u = new URL(el.href, location.href);
      if (u.origin !== location.origin)
        return { k: `out:${u.hostname.replace(/^www\./, '')}`, l: label };
      return { k: u.pathname, l: label };
    } catch {
      return null;
    }
  }
  if (el instanceof HTMLButtonElement || el.getAttribute('role') === 'button') {
    return label ? { k: `button:${label.slice(0, 60)}`, l: label } : null;
  }
  return null;
}

export function Analytics() {
  const pathname = usePathname();
  const q = (useSearchParams()?.get('q') ?? '').trim().toLowerCase().slice(0, 100);
  const lastView = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin') || optedOut()) return;
    // A new search on the same page counts as a new view (so searches can be reported).
    const key = `${pathname}?${q}`;
    if (lastView.current === key) return;
    const first = lastView.current === null;
    lastView.current = key;
    send({
      t: 'view',
      p: pathname,
      ...(q ? { q } : {}),
      // External referrer only counts for the first page of the visit.
      ...(first ? { e: 1 as const } : {}),
      ...(first && document.referrer ? { r: document.referrer.slice(0, 500) } : {}),
    });
  }, [pathname, q]);

  useEffect(() => {
    const onClick = (ev: MouseEvent) => {
      if (optedOut() || location.pathname.startsWith('/admin')) return;
      const el = (ev.target as HTMLElement | null)?.closest<HTMLElement>(
        'a,button,[role="button"],[data-track]',
      );
      if (!el || el.closest('[data-no-track]')) return;
      const d = describe(el);
      if (d) send({ t: 'click', p: location.pathname, k: d.k, l: d.l });
    };
    document.addEventListener('click', onClick, { capture: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, []);

  return null;
}
