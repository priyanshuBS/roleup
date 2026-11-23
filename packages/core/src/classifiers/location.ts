import type { RemoteType } from '../constants';
import { CITIES, type CityDef } from '../data/cities';

export interface LocationInput {
  /** Raw location string(s) from the source, e.g. "Bengaluru; Remote - India". */
  locationRaw: string;
  workplaceHint?: 'remote' | 'hybrid' | 'onsite' | null;
  /** ISO-2 country from the source if it provides one (Lever does). */
  countryHint?: string | null;
  /** Optional description text, used only to resolve a bare "Remote". */
  description?: string | null;
  /** Company context used to resolve a bare "Remote". */
  companyHqCountry?: string | null;
  companyRemoteFirst?: boolean;
}

export interface LocationResult {
  citySlug: string | null;
  country: string | null;
  remoteType: RemoteType;
  /** Whether a person in India can take this job (onsite/hybrid in India, or remote India/global). */
  indiaEligible: boolean;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const CITY_MATCHERS: { city: CityDef; re: RegExp }[] = CITIES.map((city) => ({
  city,
  re: new RegExp(`(^|[^a-z])(${city.aliases.map(escape).join('|')})([^a-z]|$)`, 'i'),
}));

const INDIA_RE = /\b(india|indian|bharat)\b/i;
/** Country code written as ", IN" / "- IN" (case-sensitive, so "in" the word never matches). */
const INDIA_CODE_RE = /(?:,|-|\()\s*IN\b(?!-)/;
const APAC_RE =
  /\b(apac|asia|asia pacific|asia-pacific|south asia|ist|indian standard time|gmt\+5:?30|utc\+5:?30)\b/i;
const GLOBAL_RE =
  /\b(anywhere|worldwide|global|globally|international|any location|any timezone|all locations|distributed)\b/i;
const REMOTE_RE =
  /\b(remote|work from home|wfh|home[- ]based|telecommute|distributed|anywhere|worldwide)\b/i;
const HYBRID_RE = /\bhybrid\b/i;

/** Regions/countries that, when they are the only ones named, make a remote role non-India. */
const FOREIGN_RE = new RegExp(
  [
    'us',
    'usa',
    'u\\.s\\.a?\\.?',
    'united states',
    'america',
    'americas',
    'amer',
    'north america',
    'latam',
    'latin america',
    'canada',
    'mexico',
    'brazil',
    'argentina',
    'colombia',
    'chile',
    'uk',
    'u\\.k\\.',
    'united kingdom',
    'england',
    'scotland',
    'ireland',
    'london',
    'eu',
    'europe',
    'european',
    'emea',
    'germany',
    'france',
    'spain',
    'portugal',
    'netherlands',
    'poland',
    'italy',
    'sweden',
    'denmark',
    'norway',
    'finland',
    'switzerland',
    'austria',
    'belgium',
    'czech',
    'romania',
    'greece',
    'serbia',
    'ukraine',
    'israel',
    'uae',
    'dubai',
    'saudi',
    'turkey',
    'egypt',
    'nigeria',
    'kenya',
    'south africa',
    'australia',
    'new zealand',
    'anz',
    'japan',
    'tokyo',
    'korea',
    'seoul',
    'singapore',
    'philippines',
    'vietnam',
    'indonesia',
    'malaysia',
    'thailand',
    'china',
    'hong kong',
    'taiwan',
    'pakistan',
    'bangladesh',
    'sri lanka',
    'new york',
    'nyc',
    'san francisco',
    'sf',
    'bay area',
    'seattle',
    'austin',
    'boston',
    'chicago',
    'los angeles',
    'denver',
    'atlanta',
    'toronto',
    'vancouver',
    'montreal',
    'berlin',
    'paris',
    'amsterdam',
    'dublin',
    'madrid',
    'barcelona',
    'lisbon',
    'warsaw',
    'zurich',
    'stockholm',
    'sydney',
    'melbourne',
    // US state abbreviations as they appear in "City, ST"
    'ca',
    'ny',
    'wa',
    'tx',
    'ma',
    'il',
    'co',
    'ga',
    'nc',
    'va',
    'fl',
    'or',
    'nj',
    'pa',
    'az',
    'ut',
    'mn',
    'oh',
    'mi',
    'dc',
  ]
    .map((s) => `\\b${s}\\b`)
    .join('|'),
  'i',
);

const RESTRICTED_DESC_RE =
  /\b(must (be|reside|live)( located| based)? in (the )?(us|u\.s\.|united states|canada|uk|europe|eu)|(us|u\.s\.)[- ]based|authori[sz]ed to work in the (us|u\.s\.|united states)|within the (us|u\.s\.|united states|eu|european union)|us time ?zones?|(pst|est|cst|mst|pacific|eastern|central) time ?zones?)\b/i;
const GLOBAL_DESC_RE =
  /\b(work from anywhere|anywhere in the world|fully distributed team across|remote[- ]first.{0,40}(world|global)|hire (globally|anywhere|worldwide))\b/i;
const INDIA_DESC_RE =
  /\b(remote[^.]{0,40}india|india[^.]{0,40}remote|based in india|located in india|from india)\b/i;

export function matchCity(text: string): CityDef | null {
  let best: { city: CityDef; index: number } | null = null;
  for (const { city, re } of CITY_MATCHERS) {
    const m = re.exec(text);
    if (m && (best === null || m.index < best.index)) best = { city, index: m.index };
  }
  return best?.city ?? null;
}

/**
 * Classify location and remote eligibility. Pure.
 *
 * Remote buckets:
 *  - remote_india: remote, and India (or an Indian city, or APAC/Asia) is named
 *  - remote_global: remote, and "anywhere/worldwide/global" is named
 *  - remote_restricted: remote, but only non-India regions are named (US/EU/UK/Canada/…)
 *  - bare "Remote": resolved from the description, then company context (Indian HQ → India),
 *    else treated as restricted (conservative: don't promise India eligibility we can't see)
 */
export function classifyLocation(input: LocationInput): LocationResult {
  const raw = input.locationRaw ?? '';
  const text = raw.replace(/\s+/g, ' ').trim();
  const city = matchCity(text);
  const countryHint = input.countryHint?.toUpperCase() ?? null;
  const mentionsIndia =
    INDIA_RE.test(text) || INDIA_CODE_RE.test(text) || city !== null || countryHint === 'IN';
  const isRemote = input.workplaceHint === 'remote' || REMOTE_RE.test(text);
  const isHybrid = input.workplaceHint === 'hybrid' || HYBRID_RE.test(text);

  const country = mentionsIndia ? 'IN' : countryHint;

  // Hybrid/onsite take precedence when an Indian city is named alongside "Remote" in a
  // multi-location string only if the source marks it hybrid/onsite.
  if (isRemote && !(input.workplaceHint === 'onsite' && city)) {
    // Text with the Indian/global signals stripped, to see what else is named.
    const others = text
      .replace(
        /\b(remote|hybrid|on-?site|office|work from home|wfh|home[- ]based|or|and|in|of|the|based|only|first|friendly)\b/gi,
        ' ',
      )
      .replace(INDIA_RE, ' ');
    const namesForeign = FOREIGN_RE.test(others);
    let remoteType: RemoteType;
    if (mentionsIndia || APAC_RE.test(text)) remoteType = 'remote_india';
    else if (GLOBAL_RE.test(text) && !namesForeign) remoteType = 'remote_global';
    else if (GLOBAL_RE.test(text) && namesForeign)
      remoteType = /\b(anywhere|worldwide)\b/i.test(text) ? 'remote_global' : 'remote_restricted';
    else if (namesForeign) remoteType = 'remote_restricted';
    else {
      // Bare "Remote".
      const desc = input.description ?? '';
      if (INDIA_DESC_RE.test(desc)) remoteType = 'remote_india';
      else if (RESTRICTED_DESC_RE.test(desc)) remoteType = 'remote_restricted';
      else if (GLOBAL_DESC_RE.test(desc)) remoteType = 'remote_global';
      else if (input.companyHqCountry?.toUpperCase() === 'IN') remoteType = 'remote_india';
      else if (input.companyRemoteFirst) remoteType = 'remote_global';
      else remoteType = 'remote_restricted';
    }
    return {
      citySlug: city?.slug ?? null,
      country: remoteType === 'remote_india' ? 'IN' : country,
      remoteType,
      indiaEligible: remoteType !== 'remote_restricted',
    };
  }

  const remoteType: RemoteType = isHybrid ? 'hybrid' : 'onsite';
  return {
    citySlug: city?.slug ?? null,
    country,
    remoteType,
    indiaEligible: mentionsIndia,
  };
}
