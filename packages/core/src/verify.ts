/**
 * Pure verification rules for automated funding approval and company discovery. The workers do
 * the network calls and pass the observations in; everything here is deterministic and tested.
 */
import type { FundingRound } from './constants';

/** Lowercase, strip legal suffixes and punctuation: "Acme Labs, Inc." -> "acme". */
export function nameKey(name: string): string {
  return name
    .toLowerCase()
    .replace(
      /\b(inc|llc|ltd|limited|pvt|private|technologies|technology|labs|corp|co|ai|hq)\b\.?/g,
      '',
    )
    .replace(/[^a-z0-9]+/g, '');
}

/** Does `text` mention the company as a whole word (case-insensitive)? */
export function mentionsName(text: string, company: string): boolean {
  const n = company.trim();
  if (n.length < 2) return false;
  const esc = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\p{L}\\p{N}])${esc}($|[^\\p{L}\\p{N}])`, 'iu').test(text);
}

/**
 * Names that are also ordinary words are easy to mis-extract ("Meta", "Notion" are fine because
 * they are known, but "Mint" or "Nova" alone often are not the company). Short or very common
 * words get a penalty so they need corroboration before auto-approval.
 */
const COMMON_WORDS = new Set([
  'ai',
  'app',
  'apps',
  'bank',
  'cloud',
  'data',
  'fund',
  'health',
  'labs',
  'money',
  'nova',
  'one',
  'pay',
  'platform',
  'robotics',
  'startup',
  'tech',
  'the',
  'this',
  'company',
  'firm',
  'fintech',
  'edtech',
  'healthtech',
  'saas',
  'india',
  'indian',
  'us',
  'uk',
  'global',
]);

export function riskyName(name: string): boolean {
  const k = name.trim().toLowerCase();
  return k.length < 3 || COMMON_WORDS.has(k) || /^\d+$/.test(k);
}

export interface FundingObservation {
  company: string;
  round: FundingRound | string;
  amount: number | null;
  /** Fetched the source URL again. null = could not fetch (network/robots). */
  source: { ok: boolean; status?: number; title?: string | null } | null;
  /** Other feeds reporting this company raising within a few days of this item. */
  corroborations: number;
  /** The company already exists with a working job board. */
  knownCompany: boolean;
}

export interface FundingScore {
  score: number;
  notes: string[];
  /** Hard blockers: never auto-approve, regardless of score. */
  blocked: boolean;
}

/**
 * Score 0-100. Auto-approval needs the live source to name the company (hard requirement) and a
 * score at or above the admin's threshold (default 70):
 *   source live and names company 40 · amount 20 · specific round 10 · corroborated 20 ·
 *   known company 10 · risky name -30
 */
export function scoreFunding(o: FundingObservation): FundingScore {
  const notes: string[] = [];
  let score = 0;
  let blocked = false;

  if (!o.source) {
    notes.push('✗ Could not re-open the source article');
    blocked = true;
  } else if (!o.source.ok) {
    notes.push(`✗ Source article returned HTTP ${o.source.status ?? 'error'}`);
    blocked = true;
  } else if (o.source.title && mentionsName(o.source.title, o.company)) {
    score += 40;
    notes.push('✓ Source article is live and its headline names the company');
  } else {
    notes.push('✗ Source article is live but its headline does not name the company');
    blocked = true;
  }

  if (o.amount != null && o.amount > 0) {
    score += 20;
    notes.push('✓ Amount found');
  } else notes.push('· Amount not found in the headline');

  if (o.round && o.round !== 'Undisclosed') {
    score += 10;
    notes.push(`✓ Round identified (${o.round})`);
  } else notes.push('· Round not stated');

  if (o.corroborations > 0) {
    score += 20;
    notes.push(
      `✓ Also reported by ${o.corroborations} other source${o.corroborations === 1 ? '' : 's'}`,
    );
  } else notes.push('· Reported by one source only');

  if (o.knownCompany) {
    score += 10;
    notes.push('✓ Company already tracked with a job board');
  }

  if (riskyName(o.company)) {
    score -= 30;
    notes.push('✗ Company name is short or a common word; check it is right');
  }

  return { score: Math.max(0, Math.min(100, score)), notes, blocked };
}

export function shouldAutoApprove(s: FundingScore, min: number): boolean {
  return !s.blocked && s.score >= min;
}

/** URL-safe slug candidates for probing public job boards: "Wispr Flow" -> wisprflow, wispr-flow. */
export function boardSlugCandidates(name: string): string[] {
  const base = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  if (!base) return [];
  const words = base.split(' ');
  const out = [words.join(''), words.join('-')];
  // "Serval AI" -> also "serval".
  const core = words.filter((w) => !['ai', 'inc', 'labs', 'hq', 'app', 'technologies'].includes(w));
  if (core.length && core.length < words.length) out.push(core.join(''), core.join('-'));
  return [...new Set(out)].filter((s) => s.length >= 2 && s.length <= 60);
}

/** Domains to try for a company with no website: wispr.com, wispr.ai, wispr.io, wispr.in, … */
export function domainCandidates(name: string): string[] {
  const slugs = boardSlugCandidates(name).filter((s) => !s.includes('-'));
  const tlds = ['com', 'ai', 'io', 'co', 'in', 'app', 'dev'];
  return [...new Set(slugs.flatMap((s) => tlds.map((t) => `${s}.${t}`)))].slice(0, 14);
}

const PARKED =
  /\b(for sale|is parked|parked (free|domain)|buy this domain|domain (is )?for sale|premium domain|digital asset|make an offer|this domain|coming soon|under construction)\b/i;

/** Domain-parking / reseller / placeholder pages that merely repeat the domain name. */
export function looksParked(title: string | null | undefined): boolean {
  return !!title && PARKED.test(title);
}

/**
 * A fetched page could be the company's site if its <title> or og:site_name names it and it is
 * not a parked/for-sale page. Redirects are allowed (wispr.com -> wisprflow.ai). This alone is
 * NOT proof: a guessed site is only kept when it also links a job board whose name matches.
 */
export function pageNamesCompany(
  page: { title?: string | null; siteName?: string | null },
  company: string,
): boolean {
  if (looksParked(page.title) || looksParked(page.siteName)) return false;
  return [page.title, page.siteName].some((t) => !!t && mentionsName(t, company));
}
