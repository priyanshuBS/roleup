/** Text analysis helpers for the ATS checker. Pure functions. */
import { CITIES } from '../data/cities';

export const BULLET_CHARS =
  /^[\s]*([•●○◦▪▫■□►▸‣⁃∙·*\-–—]|[\uf0a7\uf0b7\uf076\uf0d8\uf0fc\uf0e0]|\d{1,2}[.)])\s+/;

export function lines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

export function wordCount(text: string): number {
  return (text.match(/[A-Za-z0-9][A-Za-z0-9+#.'’-]*/g) ?? []).length;
}

/* ---------- contact ---------- */

export const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
/** Indian mobiles (+91 / 0 / bare 10-digit starting 6-9) and general international numbers. */
export const PHONE_RE =
  /(?:\+?91[\s-]?)?(?:0)?[6-9]\d{4}[\s-]?\d{5}\b|\+\d{1,3}[\s-]?\(?\d{2,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}\b|\(\d{3}\)\s?\d{3}-\d{4}/;
export const LINKEDIN_RE = /linkedin\.com\/(in|pub)\/[A-Za-z0-9_-]+/i;
export const GITHUB_RE = /github\.com\/[A-Za-z0-9_-]+/i;
export const PORTFOLIO_RE =
  /\b(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+\.(?:dev|io|me|in|com|app|site|tech|xyz|page|github\.io|vercel\.app|netlify\.app)(?:\/[^\s]*)?\b/i;

const CITY_WORDS = new RegExp(
  `\\b(${[
    ...CITIES.flatMap((c) => c.aliases),
    'india',
    'remote',
    'karnataka',
    'maharashtra',
    'telangana',
    'tamil nadu',
    'haryana',
    'uttar pradesh',
    'kerala',
    'gujarat',
    'west bengal',
    'rajasthan',
  ]
    .map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')})\\b`,
  'i',
);

export function findLocation(headerText: string): boolean {
  return CITY_WORDS.test(headerText);
}

/* ---------- sections ---------- */

export type SectionKey =
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'certifications'
  | 'achievements';

export const SECTION_HEADINGS: Record<SectionKey, RegExp> = {
  summary:
    /^(professional |career |executive )?(summary|profile|objective|career objective|about me|about|overview)$/i,
  experience:
    /^((work|professional|relevant|industry) )?(experience|experiences|employment( history)?|work history|career history|internships?|internship experience|work)$/i,
  education:
    /^(education|educational (background|qualifications?)|academic (background|qualifications?|details)|academics|qualifications?)$/i,
  skills:
    /^((technical|key|core|relevant) )?(skills|skill set|skillset|competencies|core competencies|technologies|tech stack|tools( (and|&) technologies)?|technical proficiency)$/i,
  projects: /^((personal|academic|key|selected|side|major|notable) )?projects?$/i,
  certifications: /^(certifications?|licenses?( (and|&) certifications?)?|courses|training)$/i,
  achievements:
    /^(achievements|awards|honors|honours|accomplishments|awards (and|&) achievements|extra-?curricular( activities)?|positions of responsibility)$/i,
};

/** Strip decoration and trailing colons from a candidate heading line. */
export function headingKey(line: string): SectionKey | null {
  // Inline headings: "Skills: Go, Java, Kafka" → "Skills".
  const colon = line.indexOf(':');
  const candidate = colon > 0 && colon < 40 ? line.slice(0, colon) : line;
  const clean = candidate
    .replace(/^[^A-Za-z]+/, '')
    .replace(/[:\-–—|]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean || clean.split(' ').length > 5) return null;
  for (const [k, re] of Object.entries(SECTION_HEADINGS) as [SectionKey, RegExp][]) {
    if (re.test(clean)) return k;
  }
  return null;
}

export function findSections(ls: string[]): Map<SectionKey, number> {
  const found = new Map<SectionKey, number>();
  ls.forEach((l, i) => {
    const k = headingKey(l);
    if (k && !found.has(k)) found.set(k, i);
  });
  return found;
}

/* ---------- dates ---------- */

const MONTHS =
  'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?';
const MONTH_INDEX: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

const DATE_TOKEN = `(?:(?:${MONTHS})\\.?\\s*'?\\d{2,4}|\\d{1,2}[/.-]\\d{2,4}|(?:19|20)\\d{2})`;
const RANGE_RE = new RegExp(
  `(${DATE_TOKEN})\\s*(?:-|–|—|to|till|until)\\s*(${DATE_TOKEN}|present|current|now|ongoing|today|date)`,
  'gi',
);

export type DateFormat = 'month-name' | 'numeric' | 'year-only';

function formatOf(token: string): DateFormat {
  if (new RegExp(`^(${MONTHS})`, 'i').test(token)) return 'month-name';
  if (/^\d{1,2}[/.-]/.test(token)) return 'numeric';
  return 'year-only';
}

/** Months since year 0; null if unparseable. "Present" → now. */
function toMonth(token: string, now: Date, isEnd: boolean): number | null {
  const t = token.toLowerCase().trim();
  if (/^(present|current|now|ongoing|today|date)$/.test(t))
    return now.getFullYear() * 12 + now.getMonth();
  const mName = new RegExp(`^(${MONTHS})\\.?\\s*'?(\\d{2,4})$`, 'i').exec(t);
  if (mName) {
    const y = normYear(mName[2]!);
    return y === null ? null : y * 12 + (MONTH_INDEX[mName[1]!.slice(0, 3)] ?? 0);
  }
  const num = /^(\d{1,2})[/.-](\d{2,4})$/.exec(t);
  if (num) {
    const y = normYear(num[2]!);
    const m = Number(num[1]) - 1;
    return y === null || m < 0 || m > 11 ? null : y * 12 + m;
  }
  const y = /^(19|20)\d{2}$/.test(t) ? Number(t) : null;
  return y === null ? null : y * 12 + (isEnd ? 11 : 0);
}

function normYear(y: string): number | null {
  const n = Number(y);
  if (y.length === 2) return n > 50 ? 1900 + n : 2000 + n;
  return n >= 1970 && n <= 2100 ? n : null;
}

export interface DateRange {
  start: number;
  end: number;
  formats: DateFormat[];
  raw: string;
}

export function findDateRanges(text: string, now: Date = new Date()): DateRange[] {
  const out: DateRange[] = [];
  for (const m of text.matchAll(RANGE_RE)) {
    const a = m[1]!;
    const b = m[2]!;
    const start = toMonth(a, now, false);
    const end = toMonth(b, now, true);
    if (start === null || end === null || end < start || end - start > 600) continue;
    const formats = [formatOf(a)];
    if (!/^(present|current|now|ongoing|today|date)$/i.test(b)) formats.push(formatOf(b));
    out.push({ start, end, formats, raw: m[0] });
  }
  return out;
}

/** Total experience in years: union of ranges (overlaps counted once). */
export function yearsCovered(ranges: DateRange[]): number {
  if (ranges.length === 0) return 0;
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  let total = 0;
  let curS = sorted[0]!.start;
  let curE = sorted[0]!.end;
  for (const r of sorted.slice(1)) {
    if (r.start <= curE + 1) curE = Math.max(curE, r.end);
    else {
      total += curE - curS + 1;
      curS = r.start;
      curE = r.end;
    }
  }
  total += curE - curS + 1;
  return Math.round((total / 12) * 10) / 10;
}

/** Gaps longer than `minMonths` between consecutive ranges. */
export function findGaps(
  ranges: DateRange[],
  minMonths = 6,
): { fromMonth: number; toMonth: number; months: number }[] {
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const gaps: { fromMonth: number; toMonth: number; months: number }[] = [];
  let maxEnd = sorted[0]?.end ?? 0;
  for (const r of sorted.slice(1)) {
    const gap = r.start - maxEnd - 1;
    if (gap > minMonths) gaps.push({ fromMonth: maxEnd, toMonth: r.start, months: gap });
    maxEnd = Math.max(maxEnd, r.end);
  }
  return gaps;
}

export function monthLabel(m: number): string {
  const names = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return `${names[m % 12]} ${Math.floor(m / 12)}`;
}

/* ---------- bullets & wording ---------- */

export const ACTION_VERBS = new Set(
  (
    'achieved accelerated added analyzed analysed architected automated boosted built championed collaborated configured consolidated ' +
    'contributed converted coordinated created cut debugged decreased defined delivered deployed designed developed diagnosed directed ' +
    'drove eliminated enabled engineered enhanced established evaluated executed expanded facilitated fixed founded generated grew guided ' +
    'handled headed identified implemented improved increased initiated innovated instrumented integrated introduced launched led ' +
    'maintained managed mentored migrated modernized modernised monitored negotiated optimized optimised orchestrated organized organised ' +
    'overhauled owned partnered performed pioneered planned prepared presented prioritized prioritised produced profiled programmed ' +
    'prototyped published quantified raised rebuilt reduced refactored redesigned replaced researched resolved restructured revamped ' +
    'saved scaled secured shipped simplified solved spearheaded standardized standardised streamlined strengthened supervised supported ' +
    'tested trained transformed tuned unified upgraded validated wrote won worked'
  ).split(' '),
);

export const WEAK_STARTS =
  /^(responsible for|worked on|helped( with)?|assisted( in| with)?|involved in|duties included|tasked with|participated in|handled various)\b/i;

export const BUZZWORDS = [
  'synergy',
  'go-getter',
  'team player',
  'hard worker',
  'hardworking',
  'hard-working',
  'detail-oriented',
  'detail oriented',
  'results-driven',
  'results driven',
  'self-starter',
  'self starter',
  'think outside the box',
  'dynamic',
  'passionate',
  'motivated',
  'proactive',
  'go to person',
  'rockstar',
  'ninja',
  'guru',
  'best of breed',
  'value add',
  'thought leader',
  'out of the box',
  'highly skilled',
  'quick learner',
  'fast learner',
];

/** "I" only as a pronoun ("I built"), not the grade in "Software Engineer I". */
export const FIRST_PERSON = /\b(?:I(?=\s+[a-z])|[Mm]e|[Mm]y|[Mm]ine|[Mm]yself)\b/g;

export const METRIC_RE =
  /(\d+(\.\d+)?\s?(%|x\b|k\b|m\b|ms\b|s\b|hrs?\b|users|customers|requests|rps|qps|tps|lakh|crore|cr\b|million|billion|mn\b)|[$₹]\s?\d|\b\d{2,}\b)/i;

export function firstWord(bullet: string): string {
  return (bullet.replace(BULLET_CHARS, '').match(/[A-Za-z]+/)?.[0] ?? '').toLowerCase();
}

/** Characters PDF fonts often turn into garbage: replacement chars, (cid:123), private-use glyphs. */
export function garbledRatio(text: string): number {
  if (!text) return 0;
  const bad =
    (text.match(/\ufffd/g)?.length ?? 0) +
    (text.match(/\(cid:\d+\)/g)?.length ?? 0) * 5 +
    // eslint-disable-next-line no-control-regex -- deliberately counting control characters
    (text.match(/[\u0000-\u0008\u000e-\u001f]/g)?.length ?? 0);
  return bad / text.length;
}

/** Icons/symbol characters that ATS tools usually drop or mangle. */
export function symbolCount(text: string): number {
  return (text.match(/[\u2600-\u27bf\ue000-\uf8ff\u{1f300}-\u{1faff}]/gu) ?? []).filter(
    (c) => !/[\uf0a7\uf0b7]/.test(c),
  ).length;
}
