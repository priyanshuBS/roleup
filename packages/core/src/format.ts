/** Formatting helpers shared by web and mobile. Pure, locale-stable (en-IN). */

const LAKH = 100_000;
const CRORE = 10_000_000;

/** 2_450_000 -> "24.5L", 15_000_000 -> "1.5Cr". */
export function formatInrCompact(amount: number): string {
  if (amount >= CRORE) return `${trimZero(amount / CRORE)}Cr`;
  if (amount >= LAKH) return `${trimZero(amount / LAKH)}L`;
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

function trimZero(n: number): string {
  const s = n >= 100 ? n.toFixed(0) : n.toFixed(1);
  return s.endsWith('.0') ? s.slice(0, -2) : s;
}

/** Salary range in LPA, e.g. "₹18–32L". */
export function formatInrRange(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  const strip = (n: number) => formatInrCompact(n).replace('₹', '');
  if (min != null && max != null && Math.abs(max - min) > 1) {
    const a = strip(min);
    const b = strip(max);
    // "₹18–32L" when both ends share a unit, "₹80L–1.2Cr" otherwise.
    const unit = (s: string) => s.replace(/[\d.,]/g, '');
    if (unit(a) === unit(b) && unit(a)) return `₹${a.slice(0, -unit(a).length)}–${b}`;
    return `₹${a}–${b}`;
  }
  return `₹${strip((max ?? min) as number)}`;
}

export function formatUsdCompact(amount: number): string {
  if (amount >= 1_000_000_000) return `$${trimZero(amount / 1_000_000_000)}B`;
  if (amount >= 1_000_000) return `$${trimZero(amount / 1_000_000)}M`;
  if (amount >= 1_000) return `$${trimZero(amount / 1_000)}K`;
  return `$${Math.round(amount)}`;
}

/** "3h ago", "2d ago", "just now". `now` is injectable for tests. */
export function timeAgo(date: Date | string | null | undefined, now: Date = new Date()): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  const secs = Math.max(0, Math.round((now.getTime() - d.getTime()) / 1000));
  if (secs < 60) return 'just now';
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.round(months / 12)}y ago`;
}

export function daysBetween(a: Date, b: Date): number {
  return Math.floor(Math.abs(b.getTime() - a.getTime()) / 86_400_000);
}

export function formatCount(n: number): string {
  return n.toLocaleString('en-IN');
}

/** URL-safe slug. */
export function slugify(input: string, maxLength = 80): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');
}

/** Extract bare domain from a URL or host string: "https://www.stripe.com/jobs" -> "stripe.com". */
export function domainFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.includes('://') ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, '').toLowerCase() || null;
  } catch {
    return null;
  }
}
