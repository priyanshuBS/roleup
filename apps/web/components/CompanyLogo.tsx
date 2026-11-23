'use client';

import { useState } from 'react';
import { initials, logoSrc } from '@/lib/format';

/** Fixed-size logo (no layout shift), lazy-loaded, falls back to initials. */
export function CompanyLogo({
  company,
  size = 28,
}: {
  company: { name: string; logoUrl: string | null; domain: string | null };
  size?: number;
}) {
  const src = logoSrc(company);
  const [failed, setFailed] = useState(false);
  const box = { width: size, height: size };
  if (!src || failed) {
    return (
      <span
        aria-hidden
        style={{ ...box, fontSize: Math.round(size * 0.4) }}
        className="inline-flex shrink-0 items-center justify-center rounded-sm border border-border bg-surface-muted font-medium text-text-muted"
      >
        {initials(company.name)}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      style={box}
      className="shrink-0 rounded-sm border border-border bg-surface object-contain p-0.5"
    />
  );
}
