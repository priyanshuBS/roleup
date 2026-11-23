import { z } from 'zod';

/** Pure helpers for matching our companies to the YC OSS dataset. */

export const ycCompanySchema = z.object({
  name: z.string(),
  website: z.string().nullable().optional(),
  batch: z.string().nullable().optional(),
  former_names: z.array(z.string()).nullable().optional(),
});
export const ycResponseSchema = z.array(ycCompanySchema);
export type YcCompany = z.infer<typeof ycCompanySchema>;

const SEASON: Record<string, string> = {
  winter: 'W',
  summer: 'S',
  spring: 'X',
  fall: 'F',
  autumn: 'F',
};

/** "Winter 2015" → "W15", "Summer 2025" → "S25", "Spring 2025" → "X25". Already-short codes pass through. */
export function batchCode(batch: string | null | undefined): string | null {
  if (!batch) return null;
  const b = batch.trim();
  if (/^[WSXF]\d{2}$/i.test(b)) return b.toUpperCase();
  const m = /^(winter|summer|spring|fall|autumn)\s+(\d{4})$/i.exec(b);
  if (!m) return null;
  return `${SEASON[m[1]!.toLowerCase()]}${m[2]!.slice(2)}`;
}

const MULTI_PART_TLDS = new Set([
  'co.in',
  'co.uk',
  'com.au',
  'co.jp',
  'com.br',
  'com.sg',
  'net.in',
  'org.in',
  'firm.in',
]);

/** Registrable domain: "about.gitlab.com" → "gitlab.com", "www.foo.co.in" → "foo.co.in". */
export function registrableDomain(urlOrHost: string | null | undefined): string | null {
  if (!urlOrHost) return null;
  let host: string;
  try {
    host = new URL(
      urlOrHost.includes('://') ? urlOrHost : `https://${urlOrHost}`,
    ).hostname.toLowerCase();
  } catch {
    return null;
  }
  const parts = host
    .replace(/^www\./, '')
    .split('.')
    .filter(Boolean);
  if (parts.length < 2) return null;
  const last2 = parts.slice(-2).join('.');
  if (MULTI_PART_TLDS.has(last2) && parts.length >= 3) return parts.slice(-3).join('.');
  return last2;
}

export function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.,]/g, '')
    .replace(
      /\b(inc|llc|ltd|limited|pvt|private|technologies|technology|labs|corp|corporation|software|ai|hq|co)\b/g,
      ' ',
    )
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

export interface YcIndex {
  byDomain: Map<string, YcCompany>;
  byName: Map<string, YcCompany>;
}

export function buildYcIndex(list: YcCompany[]): YcIndex {
  const byDomain = new Map<string, YcCompany>();
  const byName = new Map<string, YcCompany>();
  for (const c of list) {
    const d = registrableDomain(c.website);
    if (d && !byDomain.has(d)) byDomain.set(d, c);
    for (const n of [c.name, ...(c.former_names ?? [])]) {
      const k = normalizeCompanyName(n);
      if (k.length >= 3 && !byName.has(k)) byName.set(k, c);
    }
  }
  return { byDomain, byName };
}

/** Match by website domain first, then by normalized name (only if the YC entry has no conflicting domain). */
export function matchYc(
  index: YcIndex,
  company: { name: string; website: string | null; domain: string | null },
): YcCompany | null {
  const d = registrableDomain(company.domain ?? company.website);
  if (d) {
    const hit = index.byDomain.get(d);
    if (hit) return hit;
  }
  const byName = index.byName.get(normalizeCompanyName(company.name));
  if (!byName) return null;
  const ycDomain = registrableDomain(byName.website);
  // Same name, different website: probably a different company.
  if (ycDomain && d && ycDomain !== d) return null;
  return byName;
}
