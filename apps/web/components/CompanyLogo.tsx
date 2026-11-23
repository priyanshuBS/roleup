'use client';

import { useState } from 'react';
import { initials, logoSrc } from '@/lib/format';

/** Fixed-size logo (no layout shift), lazy-loaded, falls back to tinted initials. */
export function CompanyLogo({
  company,
  size = 44,
}: {
  company: { name: string; logoUrl: string | null; domain: string | null };
  size?: number;
}) {
  const src = logoSrc(company);
  const [failed, setFailed] = useState(false);
  const radius = Math.round(size * 0.22);
  const box = { width: size, height: size, borderRadius: radius };
  if (!src || failed) {
    return (
      <span
        aria-hidden
        style={{ ...box, fontSize: Math.round(size * 0.36) }}
        className="inline-flex shrink-0 items-center justify-center border border-border bg-surface-muted font-semibold tracking-[-0.02em] text-text-muted"
      >
        {initials(company.name)}
      </span>
    );
  }
  return (
    <span
      style={box}
      className="inline-flex shrink-0 items-center justify-center overflow-hidden border border-border bg-white"
    >
      <img
        src={src}
        alt=""
        width={Math.round(size * 0.62)}
        height={Math.round(size * 0.62)}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="object-contain"
      />
    </span>
  );
}
