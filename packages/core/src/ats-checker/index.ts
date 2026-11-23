/**
 * Free ATS resume checker. Pure TypeScript, no AI, no network. Input is extracted text plus a
 * few layout signals from the file parser; output is a 0–100 score with specific fixes.
 * It estimates ATS-friendliness with common rules; real ATS systems differ.
 */
import { extractSkills } from '../skills';
import {
  ACTION_VERBS,
  BULLET_CHARS,
  BUZZWORDS,
  EMAIL_RE,
  findDateRanges,
  findGaps,
  findLocation,
  findSections,
  FIRST_PERSON,
  firstWord,
  garbledRatio,
  GITHUB_RE,
  LINKEDIN_RE,
  lines as toLines,
  METRIC_RE,
  monthLabel,
  PHONE_RE,
  PORTFOLIO_RE,
  symbolCount,
  WEAK_STARTS,
  wordCount,
  yearsCovered,
} from './text';
import type {
  AtsReport,
  CategoryScore,
  CheckCategory,
  CheckResult,
  CheckStatus,
  KeywordReport,
  LayoutSignals,
} from './types';

export * from './types';
export { analyzePdfLayout, type PdfPageInput } from './pdf-layout';

export const ATS_DISCLAIMER =
  'This estimates ATS-friendliness using common rules; real ATS systems differ.';

const CATEGORY_LABELS: Record<CheckCategory, string> = {
  parseability: 'Parseability',
  contact: 'Contact info',
  sections: 'Sections',
  layout: 'Layout',
  length: 'Length',
  dates: 'Dates',
  bullets: 'Bullets & impact',
  wording: 'Wording',
  file: 'File',
};

export interface CheckInput {
  text: string;
  layout: LayoutSignals;
  jobDescription?: { text: string; title?: string; source: 'job' | 'pasted' } | null;
  now?: Date;
}

const WORDS_PER_PAGE = 500;

function check(
  id: string,
  category: CheckCategory,
  title: string,
  maxPoints: number,
  status: CheckStatus,
  detail: string,
  fix = '',
  points?: number,
): CheckResult {
  const p =
    points ?? (status === 'pass' ? maxPoints : status === 'warn' ? Math.round(maxPoints / 2) : 0);
  return {
    id,
    category,
    title,
    status,
    points: Math.max(0, Math.min(maxPoints, p)),
    maxPoints,
    detail,
    fix: status === 'pass' ? '' : fix,
  };
}

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

export function checkResume(input: CheckInput): AtsReport {
  const now = input.now ?? new Date();
  const text = input.text.replace(/\r/g, '');
  const ls = toLines(text);
  const words = wordCount(text);
  const L = input.layout;
  const checks: CheckResult[] = [];

  /* ---------------- parseability (20) ---------------- */
  const garbled = garbledRatio(text);
  const scanned = words < 60 && (L.imageOnlyPages > 0 || L.imageCount > 0 || L.fileType === 'pdf');
  if (scanned) {
    checks.push(
      check(
        'text-extractable',
        'parseability',
        'Text can be extracted',
        12,
        'fail',
        `We found only ${words} words of selectable text. This looks like a scanned or image-only file.`,
        'Export your resume from Word or Google Docs as a text PDF (File → Download → PDF), not a scan or a photo. ATS software cannot read text inside images.',
      ),
    );
  } else {
    checks.push(
      check(
        'text-extractable',
        'parseability',
        'Text can be extracted',
        12,
        L.imageOnlyPages > 0 || words < 150 ? 'warn' : 'pass',
        L.imageOnlyPages > 0
          ? `${L.imageOnlyPages} page(s) are mostly images with little text.`
          : `Extracted ${words.toLocaleString('en-IN')} words of selectable text.`,
        'Replace image-based pages with real text. Anything inside an image is invisible to an ATS.',
      ),
    );
  }
  checks.push(
    check(
      'text-clean',
      'parseability',
      'No garbled characters',
      5,
      garbled > 0.02 ? 'fail' : garbled > 0.004 ? 'warn' : 'pass',
      garbled > 0.004
        ? `About ${(garbled * 100).toFixed(1)}% of characters didn't decode cleanly (unusual fonts or symbols).`
        : 'Characters decode cleanly.',
      'Use a standard font (Calibri, Arial, Helvetica, Georgia, Times) and re-export the PDF. Avoid decorative or icon fonts.',
    ),
  );
  checks.push(
    check(
      'text-length',
      'parseability',
      'Enough content',
      3,
      words < 150 ? 'fail' : words < 250 ? 'warn' : 'pass',
      `${words} words.`,
      'Add detail: most resumes that parse well have at least 300–400 words covering experience, projects and skills.',
    ),
  );

  /* ---------------- contact (10) ---------------- */
  const head = ls.slice(0, 12).join('\n');
  const hasEmail = EMAIL_RE.test(text);
  const hasPhone = PHONE_RE.test(text.replace(/(19|20)\d{2}\s?[-–]\s?(19|20)\d{2}/g, ''));
  const hasLinkedIn = LINKEDIN_RE.test(text);
  const hasGithub = GITHUB_RE.test(text);
  const hasPortfolio = !hasGithub && !hasLinkedIn && PORTFOLIO_RE.test(text.replace(EMAIL_RE, ''));
  const hasLocation = findLocation(head);
  checks.push(
    check(
      'contact-email',
      'contact',
      'Email address',
      3,
      hasEmail ? 'pass' : 'fail',
      hasEmail ? 'Email found.' : 'No email address found.',
      'Add a professional email address near the top, as plain text (not inside an image or icon).',
    ),
  );
  checks.push(
    check(
      'contact-phone',
      'contact',
      'Phone number',
      3,
      hasPhone ? 'pass' : 'fail',
      hasPhone ? 'Phone number found.' : 'No phone number found.',
      'Add your mobile number with country code, e.g. +91 98765 43210.',
    ),
  );
  checks.push(
    check(
      'contact-links',
      'contact',
      'LinkedIn, GitHub or portfolio',
      2,
      hasLinkedIn || hasGithub || hasPortfolio ? 'pass' : 'warn',
      [hasLinkedIn && 'LinkedIn', hasGithub && 'GitHub', hasPortfolio && 'portfolio']
        .filter(Boolean)
        .join(', ') +
        (hasLinkedIn || hasGithub || hasPortfolio ? ' found.' : 'No profile links found.'),
      'Add your LinkedIn URL (linkedin.com/in/yourname) and, for engineering roles, your GitHub. Write the full URL as text, not just an icon.',
    ),
  );
  checks.push(
    check(
      'contact-location',
      'contact',
      'Location',
      2,
      hasLocation ? 'pass' : 'warn',
      hasLocation ? 'City/region found in the header.' : 'No city in the header.',
      'Add your city and country (e.g. "Bengaluru, India") so recruiters can filter by location.',
    ),
  );

  /* ---------------- sections (15) ---------------- */
  const sections = findSections(ls);
  const ranges = findDateRanges(text, now);
  // Experience years come only from the Experience section, so degree dates don't inflate them.
  const expStart = sections.get('experience');
  let expRanges = ranges;
  if (expStart !== undefined) {
    const nextHeading =
      [...sections.values()].filter((i) => i > expStart).sort((a, b) => a - b)[0] ?? ls.length;
    expRanges = findDateRanges(ls.slice(expStart + 1, nextHeading).join('\n'), now);
  } else if (sections.has('education')) {
    const eduStart = sections.get('education')!;
    const nextHeading =
      [...sections.values()].filter((i) => i > eduStart).sort((a, b) => a - b)[0] ?? ls.length;
    const eduText = ls.slice(eduStart + 1, nextHeading).join('\n');
    expRanges = ranges.filter((r) => !eduText.includes(r.raw));
  }
  const years = expRanges.length ? yearsCovered(expRanges) : null;
  const fresher = !sections.has('experience') || (years !== null && years < 1.5);
  const sectionCheck = (
    key: 'experience' | 'education' | 'skills',
    label: string,
    pts: number,
    fix: string,
    optionalForFresher = false,
  ) => {
    const has = sections.has(key);
    const status: CheckStatus = has
      ? 'pass'
      : optionalForFresher && fresher && sections.has('projects')
        ? 'warn'
        : 'fail';
    checks.push(
      check(
        `section-${key}`,
        'sections',
        `${label} section`,
        pts,
        status,
        has ? `Found a "${label}" heading.` : `No "${label}" heading found.`,
        fix,
      ),
    );
  };
  sectionCheck(
    'experience',
    'Experience',
    5,
    'Add an "Experience" (or "Work Experience") section with role, company, dates and bullet points. Internships count.',
    true,
  );
  sectionCheck(
    'education',
    'Education',
    4,
    'Add an "Education" section with degree, institution and graduation year.',
  );
  sectionCheck(
    'skills',
    'Skills',
    4,
    'Add a "Skills" section listing languages, frameworks and tools as plain comma-separated text.',
  );
  const projStatus: CheckStatus = sections.has('projects') ? 'pass' : fresher ? 'fail' : 'warn';
  checks.push(
    check(
      'section-projects',
      'sections',
      'Projects section',
      2,
      projStatus,
      sections.has('projects')
        ? 'Found a "Projects" heading.'
        : fresher
          ? 'No "Projects" section. For freshers this is often the most important section.'
          : 'No "Projects" section.',
      'Add 2–3 projects with what you built, the stack, and a result or link.',
    ),
  );

  /* ---------------- layout (10) ---------------- */
  checks.push(
    check(
      'layout-columns',
      'layout',
      'Single-column layout',
      4,
      L.multiColumnPages > 0 ? 'fail' : 'pass',
      L.multiColumnPages > 0
        ? `Text runs in multiple columns on ${L.multiColumnPages} page(s). Many ATS read across columns and jumble the order.`
        : 'Text reads in a single column.',
      'Use a single-column layout. Move side-column content (skills, contact) into normal sections in the main flow.',
    ),
  );
  checks.push(
    check(
      'layout-tables',
      'layout',
      'No tables',
      3,
      L.tableCount > 1 ? 'fail' : L.tableCount === 1 ? 'warn' : 'pass',
      L.tableCount ? `Found ${L.tableCount} table(s).` : 'No tables detected.',
      'Replace tables with plain text lines. Tables are often skipped or flattened in the wrong order.',
    ),
  );
  checks.push(
    check(
      'layout-header',
      'layout',
      'Contact details not in header/footer',
      2,
      L.contactInHeaderFooter ? 'warn' : 'pass',
      L.contactInHeaderFooter
        ? 'Your contact details appear only in the page header/footer area.'
        : 'Contact details are in the main body.',
      'Put your name, email and phone in the body of the first page, not in the document header or footer. Some ATS ignore those areas.',
    ),
  );
  const symbols = symbolCount(text);
  checks.push(
    check(
      'layout-symbols',
      'layout',
      'Few icons or special characters',
      1,
      symbols > 8 ? 'warn' : 'pass',
      symbols > 8 ? `Found ${symbols} icon/symbol characters.` : 'Minimal icons and symbols.',
      'Replace icons (phone, mail, location pins, skill bars) with words. ATS drop or garble them.',
    ),
  );

  /* ---------------- length (8) ---------------- */
  const estPages = L.pageCount ?? Math.max(1, Math.ceil(words / WORDS_PER_PAGE));
  const maxPages = years !== null && years >= 5 ? 2 : 1;
  const tooThin = words < 150;
  const lenStatus: CheckStatus = tooThin
    ? 'warn'
    : estPages <= maxPages
      ? 'pass'
      : estPages === maxPages + 1
        ? 'warn'
        : 'fail';
  checks.push(
    check(
      'length-pages',
      'length',
      'Length fits your experience',
      8,
      lenStatus,
      `${estPages} page${estPages === 1 ? '' : 's'}${L.pageCount ? '' : ' (estimated)'}; ${years !== null ? `about ${years} years of dated experience` : 'no dated experience found'}. Recommended: up to ${maxPages} page${maxPages === 1 ? '' : 's'}.`,
      tooThin
        ? 'Your resume is very short. Fill one full page with roles, projects and skills before worrying about trimming.'
        : maxPages === 1
          ? 'Trim to one page: keep the last 2–3 roles/projects, cut older or unrelated items, and shorten bullets.'
          : 'Trim to two pages: summarise roles older than ~10 years in one line each.',
    ),
  );

  /* ---------------- dates (8) ---------------- */
  const formats = new Set(ranges.flatMap((r) => r.formats));
  const nonYear = [...formats].filter((f) => f !== 'year-only');
  if (ranges.length === 0) {
    checks.push(
      check(
        'dates-present',
        'dates',
        'Dates are present and parseable',
        5,
        'fail',
        'No date ranges like "Jan 2022 – Present" found.',
        'Add start and end dates to each role and degree, e.g. "Jun 2021 – Mar 2024" or "06/2021 – 03/2024".',
      ),
    );
  } else {
    checks.push(
      check(
        'dates-present',
        'dates',
        'Dates are consistent',
        5,
        nonYear.length > 1 ? 'warn' : 'pass',
        nonYear.length > 1
          ? 'Dates mix formats (e.g. "Jan 2022" and "01/2022").'
          : `Found ${ranges.length} date ranges in a consistent format.`,
        'Use one date format throughout. "Mon YYYY – Mon YYYY" (e.g. "Jun 2021 – Mar 2024") is the safest.',
      ),
    );
  }
  const gaps = findGaps(expRanges);
  checks.push(
    check(
      'dates-gaps',
      'dates',
      'No long unexplained gaps',
      3,
      gaps.length || expRanges.length === 0 ? 'warn' : 'pass',
      expRanges.length === 0
        ? 'No dated roles to check for gaps.'
        : gaps.length
          ? `Gap of ${gaps[0]!.months} months between ${monthLabel(gaps[0]!.fromMonth)} and ${monthLabel(gaps[0]!.toMonth)}${gaps.length > 1 ? ` (and ${gaps.length - 1} more)` : ''}. This is a soft warning.`
          : 'No gaps over 6 months between dated entries.',
      expRanges.length === 0
        ? 'Add start and end dates to each role so tenure and gaps can be read.'
        : "If a gap is intentional (study, caregiving, a break, freelancing), add one line explaining it so it isn't read as missing data.",
      gaps.length ? 2 : expRanges.length === 0 ? 1 : 3,
    ),
  );

  /* ---------------- bullets & impact (14) ---------------- */
  const bullets = ls.filter(
    (l) => BULLET_CHARS.test(l) && l.replace(BULLET_CHARS, '').split(' ').length >= 4,
  );
  const verbStarts = bullets.filter((b) => ACTION_VERBS.has(firstWord(b)));
  const weak = bullets.filter((b) => WEAK_STARTS.test(b.replace(BULLET_CHARS, '')));
  const withMetrics = bullets.filter((b) => METRIC_RE.test(b.replace(BULLET_CHARS, '')));
  checks.push(
    check(
      'bullets-present',
      'bullets',
      'Uses bullet points',
      4,
      bullets.length >= 6 ? 'pass' : bullets.length >= 2 ? 'warn' : 'fail',
      `${bullets.length} bullet points found.`,
      'Describe each role and project with 3–5 bullet points instead of paragraphs.',
    ),
  );
  const verbShare = pct(verbStarts.length, bullets.length);
  checks.push(
    check(
      'bullets-verbs',
      'bullets',
      'Bullets start with action verbs',
      5,
      bullets.length === 0 ? 'fail' : verbShare >= 60 ? 'pass' : verbShare >= 35 ? 'warn' : 'fail',
      bullets.length
        ? `${verbShare}% start with a strong verb${weak.length ? `; ${weak.length} start with weak phrases like "Responsible for"` : ''}.`
        : 'No bullets to check.',
      `Start bullets with a verb: "Built", "Reduced", "Led", "Migrated". ${weak[0] ? `For example, rewrite "${weak[0].replace(BULLET_CHARS, '').slice(0, 60)}…"` : ''}`.trim(),
    ),
  );
  const metricShare = pct(withMetrics.length, bullets.length);
  checks.push(
    check(
      'bullets-metrics',
      'bullets',
      'Bullets show measurable impact',
      5,
      bullets.length === 0
        ? 'fail'
        : metricShare >= 40
          ? 'pass'
          : metricShare >= 20
            ? 'warn'
            : 'fail',
      bullets.length
        ? `${metricShare}% of bullets include a number (%, time, users, ₹, scale).`
        : 'No bullets to check.',
      'Add numbers to at least 4 in 10 bullets: "cut p95 latency from 800ms to 200ms", "served 2M users", "saved ₹12L/year".',
    ),
  );

  /* ---------------- wording (8) ---------------- */
  const pronouns = (text.match(FIRST_PERSON) ?? []).length;
  checks.push(
    check(
      'wording-pronouns',
      'wording',
      'No first-person pronouns',
      3,
      pronouns > 4 ? 'fail' : pronouns > 0 ? 'warn' : 'pass',
      pronouns ? `Found ${pronouns} uses of I/me/my.` : 'No first-person pronouns.',
      'Drop "I", "me" and "my". Write "Built a payments service…" instead of "I built a payments service…".',
    ),
  );
  const low = text.toLowerCase();
  const buzz = BUZZWORDS.filter((b) => low.includes(b));
  checks.push(
    check(
      'wording-buzzwords',
      'wording',
      'Few buzzwords',
      3,
      buzz.length > 3 ? 'fail' : buzz.length > 0 ? 'warn' : 'pass',
      buzz.length
        ? `Found: ${buzz
            .slice(0, 6)
            .map((b) => `"${b}"`)
            .join(', ')}.`
        : 'No overused buzzwords.',
      'Replace adjectives like "passionate" or "results-driven" with evidence: what you built and what changed because of it.',
    ),
  );
  const longBullets = bullets.filter((b) => b.split(' ').length > 35);
  checks.push(
    check(
      'wording-long',
      'wording',
      'Bullets are concise',
      2,
      longBullets.length > 2 ? 'warn' : 'pass',
      longBullets.length
        ? `${longBullets.length} bullets are over 35 words.`
        : 'Bullets are a readable length.',
      'Keep bullets to one or two lines (under ~30 words). Split long ones into two achievements.',
    ),
  );

  /* ---------------- file (7) ---------------- */
  checks.push(
    check(
      'file-type',
      'file',
      'ATS-friendly file type',
      3,
      'pass',
      `${L.fileType.toUpperCase()} is widely supported.`,
    ),
  );
  const base = L.fileName.replace(/\.[a-z0-9]+$/i, '');
  const goodName =
    /^[A-Za-z]+[_\- ][A-Za-z]+([_\- ][A-Za-z]+)?[_\- ](resume|cv)$/i.test(base) ||
    /^[A-Za-z]+[_-][A-Za-z]+[_-](resume|cv)[_-]?\d{0,4}$/i.test(base);
  const sloppy = /(final|copy|new|v\d|untitled|document|\(\d\)|draft|updated|latest)/i.test(base);
  checks.push(
    check(
      'file-name',
      'file',
      'Professional file name',
      4,
      goodName && !sloppy ? 'pass' : sloppy ? 'fail' : 'warn',
      `File name: "${L.fileName}".`,
      'Name the file Firstname_Lastname_Resume.pdf. Recruiters see the file name, and "resume_final_v3.pdf" looks careless.',
    ),
  );

  /* ---------------- score ---------------- */
  const categories: CategoryScore[] = (Object.keys(CATEGORY_LABELS) as CheckCategory[]).map((c) => {
    const cs = checks.filter((x) => x.category === c);
    return {
      category: c,
      label: CATEGORY_LABELS[c],
      points: cs.reduce((a, x) => a + x.points, 0),
      maxPoints: cs.reduce((a, x) => a + x.maxPoints, 0),
    };
  });
  const max = categories.reduce((a, c) => a + c.maxPoints, 0);
  let score = Math.round((categories.reduce((a, c) => a + c.points, 0) / max) * 100);
  // An unreadable file can't score well no matter what else is true.
  if (scanned) score = Math.min(score, 20);

  const verdict =
    score >= 85
      ? 'Strong. Most ATS should parse this cleanly.'
      : score >= 70
        ? 'Good, with a few fixes worth making.'
        : score >= 50
          ? 'Needs work. Some sections may be misread or missed.'
          : 'High risk. An ATS may misread or drop key information.';

  const fixFirst = checks
    .filter((c) => c.status !== 'pass')
    .sort(
      (a, b) => b.maxPoints - b.points - (a.maxPoints - a.points) || (a.status === 'fail' ? -1 : 1),
    )
    .slice(0, 5);

  const resumeSkills = extractSkills(text);
  let keywords: KeywordReport | null = null;
  if (input.jobDescription && input.jobDescription.text.trim()) {
    const jdSkills = extractSkills(input.jobDescription.text);
    const have = new Set(resumeSkills.map((s) => s.name));
    const matched = jdSkills.filter((s) => have.has(s.name)).map((s) => s.name);
    const missing = jdSkills.filter((s) => !have.has(s.name)).map((s) => s.name);
    keywords = {
      source: input.jobDescription.source,
      jobTitle: input.jobDescription.title,
      matched,
      missing,
      matchPercent: jdSkills.length ? Math.round((matched.length / jdSkills.length) * 100) : 0,
    };
  }

  return {
    score,
    verdict,
    categories,
    checks,
    fixFirst,
    keywords,
    stats: {
      words,
      estimatedPages: estPages,
      bullets: bullets.length,
      yearsOfExperience: years,
      skillsFound: resumeSkills.map((s) => s.name),
    },
    disclaimer: ATS_DISCLAIMER,
  };
}
