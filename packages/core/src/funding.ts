/**
 * Deterministic funding extraction from news headlines. No AI. Returns facts only (company,
 * round, amount); the worker stores those plus the source URL, never article text.
 * Everything extracted goes to a human review queue before it is shown.
 */
import type { FundingRound } from './constants';

export interface ExtractedFunding {
  company: string;
  round: FundingRound;
  amount: number | null;
  currency: 'USD' | 'INR' | 'EUR' | 'GBP' | null;
  amountUsd: number | null;
  amountInr: number | null;
}

const VERBS =
  /\b(raises|raised|raise|nets|netted|bags|bagged|secures|secured|lands|landed|closes|closed|gets|got|picks up|picked up|scores|grabs|mops up|receives|received|snags|attracts|rakes in|draws)\b/i;

/** Not a completed round, or not a company raising for itself. */
const REJECT = [
  /\b(in talks|talks to|plans to|planning to|set to|looks to|looking to|aims to|eyes|eyeing|seeks|seeking|to raise|may raise|could raise|reportedly in talks|mulls|considering)\b/i,
  // A VC raising its own fund: "raises an $85 million fund", "closes $1.3 billion Fund IV".
  /(\$|₹|rs\.?|inr|usd)\s?[\d.,]+\s?(billion|bn|million|mn|m|b|crore|cr)?\s+(fund|vehicle|corpus)\b/i,
  /\b(maiden|debut|new|second|third|fourth|fifth|flagship|early-stage|growth) fund\b/i,
  /\b(ipo|listing|shares|stake sale|buyback|acquires|acquired|acquisition|merger|layoffs?)\b/i,
];

const ROUND_PATTERNS: [FundingRound, RegExp][] = [
  ['Pre-Series A', /\bpre[- ]?series[- ]?a\b/i],
  ['Pre-Seed', /\bpre[- ]?seed\b/i],
  ['Series F', /\bseries[- ]f\b/i],
  ['Series E', /\bseries[- ]e\b/i],
  ['Series D', /\bseries[- ]d\b/i],
  ['Series C', /\bseries[- ]c\b/i],
  ['Series B', /\bseries[- ]b\b/i],
  ['Series A', /\bseries[- ]a\b/i],
  ['Seed', /\bseed\b/i],
  ['Bridge', /\bbridge\b/i],
  ['Debt', /\b(debt|venture debt|credit facility|ncds?)\b/i],
];

export function extractRound(text: string): FundingRound | null {
  for (const [round, re] of ROUND_PATTERNS) if (re.test(text)) return round;
  return null;
}

const num = (s: string) => Number(s.replace(/,/g, ''));

/** Parse the first money amount: "$20M", "$1.5 billion", "₹50 Cr", "Rs 10 crore", "INR 2,500 Cr", "€12M". */
export function extractAmount(
  text: string,
  usdInrRate: number,
): Pick<ExtractedFunding, 'amount' | 'currency' | 'amountUsd' | 'amountInr'> | null {
  const usd =
    /(?:US\s?)?(\$|USD\s?|€|EUR\s?|£|GBP\s?)\s?(\d[\d,]*(?:\.\d+)?)\s?(billion|bn|b|million|mn|mln|m|thousand|k)?\b/i.exec(
      text,
    ) ?? null;
  const usdWords = /(\d[\d,]*(?:\.\d+)?)\s?(billion|million|mn)\s?(dollars|usd)\b/i.exec(text);
  const inr =
    /(₹|rs\.?|inr)\s?(\d[\d,]*(?:\.\d+)?)\s?(lakh crore|crore|cr|lakh|lac|l|bn|billion|mn|million|k)?\b/i.exec(
      text,
    );

  const candidates: { index: number; v: ReturnType<typeof extractAmount> }[] = [];
  if (usd) {
    const sym = usd[1]!.trim().toUpperCase();
    const currency =
      sym === '€' || sym === 'EUR' ? 'EUR' : sym === '£' || sym === 'GBP' ? 'GBP' : 'USD';
    const mult = unitMultiplier(usd[3]);
    const amount = num(usd[2]!) * mult;
    const toUsd = currency === 'EUR' ? 1.08 : currency === 'GBP' ? 1.27 : 1;
    if (mult > 1 || amount >= 10_000) {
      candidates.push({
        index: usd.index,
        v: {
          amount,
          currency,
          amountUsd: Math.round(amount * toUsd),
          amountInr: Math.round(amount * toUsd * usdInrRate),
        },
      });
    }
  }
  if (usdWords) {
    const amount = num(usdWords[1]!) * unitMultiplier(usdWords[2]);
    candidates.push({
      index: usdWords.index,
      v: {
        amount,
        currency: 'USD',
        amountUsd: Math.round(amount),
        amountInr: Math.round(amount * usdInrRate),
      },
    });
  }
  if (inr) {
    const unit = (inr[3] ?? '').toLowerCase();
    const mult =
      unit === 'lakh crore'
        ? 1e12
        : unit === 'crore' || unit === 'cr'
          ? 1e7
          : unit === 'lakh' || unit === 'lac' || unit === 'l'
            ? 1e5
            : unit === 'bn' || unit === 'billion'
              ? 1e9
              : unit === 'mn' || unit === 'million'
                ? 1e6
                : unit === 'k'
                  ? 1e3
                  : 1;
    const amount = num(inr[2]!) * mult;
    if (amount >= 100_000) {
      candidates.push({
        index: inr.index,
        v: {
          amount,
          currency: 'INR',
          amountInr: Math.round(amount),
          amountUsd: Math.round(amount / usdInrRate),
        },
      });
    }
  }
  candidates.sort((a, b) => a.index - b.index);
  return candidates[0]?.v ?? null;
}

function unitMultiplier(unit: string | undefined): number {
  const u = (unit ?? '').toLowerCase();
  if (u === 'billion' || u === 'bn' || u === 'b') return 1e9;
  if (u === 'million' || u === 'mn' || u === 'mln' || u === 'm') return 1e6;
  if (u === 'thousand' || u === 'k') return 1e3;
  return 1;
}

/** Descriptor words that come before the company name in headlines. */
const GENERIC = new Set(
  [
    'startup',
    'startups',
    'platform',
    'firm',
    'company',
    'maker',
    'brand',
    'unicorn',
    'giant',
    'major',
    'player',
    'provider',
    'marketplace',
    'app',
    'operator',
    'developer',
    'manufacturer',
    'lender',
    'nbfc',
    'saas',
    'd2c',
    'b2b',
    'b2c',
    'ai-powered',
    'ai-first',
    'ai-native',
    'neobank',
    'insurer',
    'insurtech',
    'fintech',
    'edtech',
    'healthtech',
    'agritech',
    'proptech',
    'legaltech',
    'deeptech',
    'spacetech',
    'cleantech',
    'climatetech',
    'mobility',
    'ev',
    'cybersecurity',
    'logistics',
    'gaming',
    'beauty',
    'fashion',
    'jewellery',
    'foodtech',
    'quick',
    'commerce',
    'e-commerce',
    'ecommerce',
    'robotics',
    'drone',
    'chip',
    'chipmaker',
    'biotech',
    'the',
    'a',
    'an',
    'indian',
    'india',
    'us',
    'us-based',
    'viral',
    'stealth',
    'new',
    'early-stage',
    'growth-stage',
    'homegrown',
  ].map((w) => w.toLowerCase()),
);

const ADVERBS = /\b(reportedly|finally|now|also|quietly|officially|just|today|has|have|had)\b/gi;

/** Company name: the trailing run of proper-noun tokens before the funding verb. */
export function extractCompany(headline: string): string | null {
  const m = VERBS.exec(headline);
  if (!m) return null;
  let before = headline.slice(0, m.index).replace(ADVERBS, ' ');
  // "Bijnis rebrands as Zorit, raises…" → the new name.
  const rebrand = /\brebrands? (?:as|to) ([^,]+)/i.exec(before);
  if (rebrand) before = rebrand[1]!;
  before = before
    .replace(/[,:;|]+\s*$/, '')
    .replace(/['’]s\b/g, '')
    .trim();
  const tokens = before.split(/\s+/).filter(Boolean);
  const picked: string[] = [];
  for (let i = tokens.length - 1; i >= 0; i--) {
    const tok = tokens[i]!.replace(/^[("'“‘]+|[)"'”’]+$/g, '');
    const low = tok.toLowerCase();
    if (!tok) continue;
    if (/-(backed|based|led|founded|owned|focused)$/i.test(tok)) break;
    if (GENERIC.has(low) || (/tech$/i.test(low) && picked.length > 0)) break;
    const proper = /^[A-Z0-9]/.test(tok) || /^[a-z]+[A-Z]/.test(tok) || /\.[a-z]{2,}$/i.test(tok);
    if (!proper) break;
    picked.unshift(tok);
    if (picked.length >= 4) break;
  }
  const name = picked
    .join(' ')
    .replace(/[.,]+$/, '')
    .trim();
  if (!name || name.length < 2 || /^\d/.test(name)) return null;
  return name;
}

export function extractFunding(
  headline: string,
  usdInrRate: number,
  extraText = '',
): ExtractedFunding | null {
  const h = headline.replace(/\s+/g, ' ').trim();
  if (!VERBS.test(h)) return null;
  if (REJECT.some((r) => r.test(h))) return null;
  const company = extractCompany(h);
  if (!company) return null;
  const amount =
    extractAmount(h, usdInrRate) ??
    (extraText ? extractAmount(extraText.slice(0, 400), usdInrRate) : null);
  const round = extractRound(h) ?? (extraText ? extractRound(extraText.slice(0, 400)) : null);
  if (!amount && !round) return null;
  return {
    company,
    round: round ?? 'Undisclosed',
    amount: amount?.amount ?? null,
    currency: amount?.currency ?? null,
    amountUsd: amount?.amountUsd ?? null,
    amountInr: amount?.amountInr ?? null,
  };
}
