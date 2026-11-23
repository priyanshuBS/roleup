import {
  formatInrRange,
  formatUsdCompact,
  REMOTE_TYPE_SHORT,
  type JobListItem,
} from '@roleup/core';

export function locationLabel(
  job: Pick<JobListItem, 'city' | 'remoteType' | 'locationRaw'>,
): string {
  const remote = job.remoteType.startsWith('remote_');
  if (remote) return REMOTE_TYPE_SHORT[job.remoteType];
  const place = job.city?.name ?? (job.locationRaw.split(/[;|]/)[0]?.trim() || 'India');
  return job.remoteType === 'hybrid' ? `${place} · Hybrid` : place;
}

export function salaryLabel(job: Pick<JobListItem, 'salary'>): string | null {
  const s = job.salary;
  if (!s) return null;
  return formatInrRange(s.minInr, s.maxInr);
}

/** Original employer figure, e.g. "$200K–270K/yr", shown alongside INR when not INR. */
export function salaryOriginal(job: Pick<JobListItem, 'salary'>): string | null {
  const s = job.salary;
  if (!s || !s.currency || s.currency === 'INR') return null;
  const per =
    s.interval && s.interval !== 'year'
      ? `/${s.interval === 'hour' ? 'hr' : s.interval === 'month' ? 'mo' : s.interval}`
      : '/yr';
  const fmt = (v: number) =>
    s.currency === 'USD'
      ? formatUsdCompact(v)
      : `${s.currency} ${Math.round(v).toLocaleString('en-IN')}`;
  if (s.min != null && s.max != null && s.min !== s.max)
    return `${fmt(s.min)}–${fmt(s.max).replace('$', '')}${per}`;
  const v = s.max ?? s.min;
  return v != null ? `${fmt(v)}${per}` : null;
}

export function logoSrc(company: { logoUrl: string | null; domain: string | null }): string | null {
  if (company.logoUrl) return company.logoUrl;
  if (company.domain) return `https://icons.duckduckgo.com/ip3/${company.domain}.ico`;
  return null;
}

export function initials(name: string): string {
  const parts = name
    .replace(/[^A-Za-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}
