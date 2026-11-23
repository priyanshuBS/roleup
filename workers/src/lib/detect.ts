import type { AtsProvider } from '@roleup/core';

/** Pure: find an ATS board link/embed in careers page HTML. */
export interface AtsDetection {
  ats: Exclude<AtsProvider, 'none'>;
  slug: string;
}

const PATTERNS: { ats: AtsDetection['ats']; re: RegExp }[] = [
  // boards.greenhouse.io/<slug>, job-boards.greenhouse.io/<slug>, embed?for=<slug>
  {
    ats: 'greenhouse',
    re: /(?:job-boards|boards)(?:\.eu)?\.greenhouse\.io\/(?:embed\/job_board(?:\/js)?\?for=)?([a-z0-9_-]+)/gi,
  },
  { ats: 'greenhouse', re: /boards-api\.greenhouse\.io\/v1\/boards\/([a-z0-9_-]+)/gi },
  { ats: 'lever', re: /jobs\.(?:eu\.)?lever\.co\/([a-z0-9_.-]+)/gi },
  { ats: 'lever', re: /api\.lever\.co\/v0\/postings\/([a-z0-9_.-]+)/gi },
  { ats: 'ashby', re: /jobs\.ashbyhq\.com\/([a-z0-9_.%-]+)/gi },
  { ats: 'ashby', re: /api\.ashbyhq\.com\/posting-api\/job-board\/([a-z0-9_.%-]+)/gi },
];

const IGNORE_SLUGS = new Set([
  'embed',
  'v1',
  'api',
  'jobs',
  'js',
  'static',
  'assets',
  'favicon.ico',
  'job_board',
]);

/** Most-mentioned board wins (careers pages often link the same board many times). */
export function detectAts(html: string): AtsDetection | null {
  const counts = new Map<string, { det: AtsDetection; n: number }>();
  for (const { ats, re } of PATTERNS) {
    for (const m of html.matchAll(re)) {
      const slug = decodeURIComponent(m[1] ?? '')
        .replace(/[.]+$/, '')
        .toLowerCase();
      if (!slug || IGNORE_SLUGS.has(slug)) continue;
      const key = `${ats}:${slug}`;
      const cur = counts.get(key) ?? { det: { ats, slug }, n: 0 };
      cur.n++;
      counts.set(key, cur);
    }
  }
  let best: { det: AtsDetection; n: number } | null = null;
  for (const v of counts.values()) if (!best || v.n > best.n) best = v;
  return best?.det ?? null;
}

/**
 * Minimal robots.txt evaluation for our user agent: honours groups for `RoleUpBot` or `*`,
 * Allow/Disallow with `*` and `$`, longest match wins.
 */
export function robotsAllows(robotsTxt: string, path: string, agent = 'roleupbot'): boolean {
  const groups: { agents: string[]; rules: { allow: boolean; pattern: string }[] }[] = [];
  let current: (typeof groups)[number] | null = null;
  let lastWasAgent = false;
  for (const rawLine of robotsTxt.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, '').trim();
    if (!line) continue;
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (key === 'user-agent') {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else {
      lastWasAgent = false;
      if (current && (key === 'allow' || key === 'disallow'))
        current.rules.push({ allow: key === 'allow', pattern: value });
    }
  }
  const specific = groups.filter((g) => g.agents.some((a) => a !== '*' && agent.includes(a)));
  const applicable = specific.length ? specific : groups.filter((g) => g.agents.includes('*'));
  let best: { allow: boolean; len: number } | null = null;
  for (const g of applicable) {
    for (const r of g.rules) {
      if (r.pattern === '') continue; // "Disallow:" (empty) allows everything
      const re = new RegExp(
        `^${r.pattern
          .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
          .replace(/\*/g, '.*')
          .replace(/\\\$$/, '$')}`,
      );
      if (
        re.test(path) &&
        (!best || r.pattern.length > best.len || (r.pattern.length === best.len && r.allow))
      ) {
        best = { allow: r.allow, len: r.pattern.length };
      }
    }
  }
  return best ? best.allow : true;
}
