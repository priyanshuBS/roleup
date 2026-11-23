import type { Level } from '../constants';

const norm = (s: string) =>
  ` ${s
    .toLowerCase()
    .replace(/[–—]/g, '-')
    .replace(/[^a-z0-9+#./\- ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `;

/**
 * Extract the minimum years of experience from a description: "3-6 years", "5+ years of
 * experience", "minimum of 4 years", "at least 2 yrs". Returns the smallest plausible
 * requirement among matches that look like experience requirements.
 */
export function extractMinYears(text: string | null | undefined): number | null {
  if (!text) return null;
  const s = text.toLowerCase().replace(/[–—]/g, '-');
  const re =
    /(?:minimum(?: of)?|at least|min\.?)?\s*(\d{1,2})(?:\.\d)?\s*(?:\+|plus)?\s*(?:(?:-|to)\s*(\d{1,2})\s*\+?)?\s*(?:years?|yrs?)\b(?:\s*(?:of|in|with|as)?\s*[a-z ,/&-]{0,60}?(?:experience|exp\b))?/g;
  let best: number | null = null;
  for (const m of s.matchAll(re)) {
    const n = Number(m[1]);
    if (!Number.isFinite(n) || n > 25) continue;
    const window = s.slice(Math.max(0, (m.index ?? 0) - 40), (m.index ?? 0) + m[0].length + 60);
    // Skip "company founded 10 years ago", "4-year degree", "2 years of runway", etc.
    if (
      /\b(ago|old|founded|degree|bachelor|warranty|runway|anniversary|history|vesting|year-old)\b/.test(
        window,
      ) &&
      !/experience/.test(window)
    )
      continue;
    if (
      !/experience|exp\b|working|professional|industry|hands-on|track record|background/.test(
        window,
      )
    )
      continue;
    if (best === null || n < best) best = n;
  }
  return best;
}

function levelFromYears(years: number): Level {
  if (years <= 1) return 'entry';
  if (years <= 4) return 'mid';
  if (years <= 9) return 'senior';
  return 'staff';
}

/**
 * Level from title rules first; falls back to years of experience found in the description.
 * Product/program/project "Manager" titles are individual-contributor roles, not people managers.
 */
export function classifyLevel(
  title: string,
  description?: string | null,
): { level: Level; minYears: number | null } {
  const t = norm(title);
  // Titles sometimes carry the requirement: "Product Management (Experience : 4-9 yrs)".
  const minYears = extractMinYears(`${title}\n${description ?? ''}`);

  const titleLevel = ((): Level | null => {
    if (
      /\b(intern|internship|trainee|apprentice|co-op|coop|working student|summer analyst)\b/.test(t)
    )
      return 'intern';
    if (/\b(director|head of|head,|vp|vice president|chief|cto|ciso|cpo|cio)\b/.test(t))
      return 'manager';
    if (/\bhead\b/.test(t) && !/\bhead(less|count)\b/.test(t)) return 'manager';
    // People managers. "Product Manager" etc. are ICs; "Group Product Manager" manages PMs.
    if (/\b(group|director of) product manager\b/.test(t)) return 'manager';
    const isIcManager =
      /\b(product|program|project|account|technical program|technical project|release|delivery|marketing|partner|community|customer success|category|brand) manager\b/.test(
        t,
      );
    if (!isIcManager && /\b(manager|mgr)\b/.test(t)) return 'manager';
    if (/\b(staff|principal|distinguished|fellow)\b/.test(t)) return 'staff';
    if (
      /\b(sde|swe|se|engineer|developer|scientist) ?-? ?(iv|v|4|5)\b|\bl[6-9]\b|\b(senior|sr\.?) staff\b/.test(
        t,
      )
    )
      return 'staff';
    if (/\b(senior|sr|snr|lead|tech lead)\b/.test(t)) return 'senior';
    if (
      /\b(sde|swe|se|engineer|developer|scientist|analyst|designer) ?-? ?(iii|3)\b|\bl5\b/.test(t)
    )
      return 'senior';
    if (
      /\b(sde|swe|se|engineer|developer|scientist|analyst|designer|associate) ?-? ?(ii|2)\b|\bl4\b/.test(
        t,
      )
    )
      return 'mid';
    if (/\b(sde|swe|se|engineer|developer|scientist|analyst|designer) ?-? ?(i|1)\b|\bl3\b/.test(t))
      return 'entry';
    if (
      /\b(junior|jr|entry level|entry-level|graduate|grad|new grad|fresher|freshers|early career|associate engineer|associate software|associate developer|associate data|campus)\b/.test(
        t,
      )
    )
      return 'entry';
    if (/\b(mid(-| )?(level|senior)?|intermediate)\b/.test(t)) return 'mid';
    // Generic trailing grade: "Product Manager II", "Data Analyst 3 - Payments".
    const grade =
      /[a-z]\s(iii|ii|iv|v|i|[1-5])(?!\s*-\s*\d)(?!\s*(?:yrs?|years?)\b)(?=\s*(?:[-,(|/]|$))/.exec(
        t.trimEnd(),
      );
    if (grade) {
      const g = grade[1] as string;
      if (g === 'i' || g === '1') return 'entry';
      if (g === 'ii' || g === '2') return 'mid';
      if (g === 'iii' || g === '3') return 'senior';
      return 'staff';
    }
    return null;
  })();

  if (titleLevel) return { level: titleLevel, minYears };
  if (minYears !== null) return { level: levelFromYears(minYears), minYears };
  return { level: 'mid', minYears };
}
