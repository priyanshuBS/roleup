import type { SalaryBand } from '../constants';
import type { RawSalary, SalaryInterval } from '../types';

/**
 * Approximate USD value of one unit of each currency. Only USD→INR is configurable
 * (`USD_INR_RATE`); the rest are rough static rates so we can show a band. Salaries in
 * currencies not listed here are kept as-is in their source currency but get no INR band.
 */
const USD_PER_UNIT: Record<string, number> = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
  CAD: 0.73,
  AUD: 0.66,
  SGD: 0.75,
  AED: 0.27,
  CHF: 1.13,
  NZD: 0.6,
  JPY: 0.0067,
};

const ANNUAL_MULTIPLIER: Record<SalaryInterval, number> = {
  year: 1,
  month: 12,
  week: 52,
  day: 260,
  hour: 2080,
};

/** Plausible annual INR range for a tech salary; anything outside is treated as bad data. */
const MIN_PLAUSIBLE_INR = 100_000; // 1 LPA
const MAX_PLAUSIBLE_INR = 500_000_000; // 50 Cr

export interface NormalizedSalary {
  minInrAnnual: number | null;
  maxInrAnnual: number | null;
  band: SalaryBand;
  source: 'employer' | 'none';
}

export function toInrAnnual(
  amount: number,
  currency: string,
  interval: SalaryInterval,
  usdInrRate: number,
): number | null {
  const cur = currency.toUpperCase();
  const annual = amount * ANNUAL_MULTIPLIER[interval];
  if (cur === 'INR') return Math.round(annual);
  const usd = USD_PER_UNIT[cur];
  if (usd === undefined) return null;
  return Math.round(annual * usd * usdInrRate);
}

/** Band from INR/year. Uses the top of the range: an 18–25L role sits in 20–40L. */
export function bandForInrAnnual(inr: number | null): SalaryBand {
  if (inr === null) return 'undisclosed';
  const lpa = inr / 100_000;
  if (lpa < 10) return 'lt10';
  if (lpa < 20) return '10to20';
  if (lpa < 40) return '20to40';
  if (lpa < 70) return '40to70';
  return '70plus';
}

/** Normalize employer-provided salary. Never estimates: no employer data → undisclosed. */
export function normalizeSalary(salary: RawSalary | null, usdInrRate: number): NormalizedSalary {
  const none: NormalizedSalary = {
    minInrAnnual: null,
    maxInrAnnual: null,
    band: 'undisclosed',
    source: 'none',
  };
  if (!salary || (salary.min == null && salary.max == null)) return none;
  const conv = (v: number | null) =>
    v == null || !(v > 0) ? null : toInrAnnual(v, salary.currency, salary.interval, usdInrRate);
  let min = conv(salary.min);
  let max = conv(salary.max);
  if (min !== null && max !== null && min > max) [min, max] = [max, min];
  const plausible = (v: number | null) =>
    v === null || (v >= MIN_PLAUSIBLE_INR && v <= MAX_PLAUSIBLE_INR);
  if (!plausible(min) || !plausible(max) || (min === null && max === null)) return none;
  return {
    minInrAnnual: min,
    maxInrAnnual: max,
    band: bandForInrAnnual(max ?? min),
    source: 'employer',
  };
}

/**
 * Infer pay interval when a source doesn't say (Greenhouse pay ranges). Uses the label first,
 * then magnitude: a USD "salary" of 45 is clearly hourly.
 */
export function inferInterval(
  label: string | null | undefined,
  amount: number,
  currency: string,
): SalaryInterval {
  const l = (label ?? '').toLowerCase();
  if (/hour|hourly|\/hr|per hr/.test(l)) return 'hour';
  if (/month|monthly|per mo|stipend/.test(l)) return 'month';
  if (/week/.test(l)) return 'week';
  if (/\bday\b|daily/.test(l)) return 'day';
  if (/year|annual|yearly|base|salary|ote|ctc|per annum|p\.a/.test(l)) return 'year';
  const cur = currency.toUpperCase();
  if (cur === 'INR') return amount < 200_000 ? 'month' : 'year';
  if (amount < 500) return 'hour';
  if (amount < 20_000) return 'month';
  return 'year';
}

/** Parse a Lever interval string ("per-year-salary", "per-hour-wage", …). */
export function parseLeverInterval(v: string | null | undefined): SalaryInterval | null {
  if (!v) return null;
  if (v.includes('year')) return 'year';
  if (v.includes('month')) return 'month';
  if (v.includes('week')) return 'week';
  if (v.includes('day')) return 'day';
  if (v.includes('hour')) return 'hour';
  return null;
}

/** Parse an Ashby interval string ("1 YEAR", "1 MONTH", "1 HOUR", …). */
export function parseAshbyInterval(v: string | null | undefined): SalaryInterval | null {
  if (!v) return null;
  const u = v.toUpperCase();
  if (u.includes('YEAR')) return 'year';
  if (u.includes('MONTH')) return 'month';
  if (u.includes('WEEK')) return 'week';
  if (u.includes('DAY')) return 'day';
  if (u.includes('HOUR')) return 'hour';
  return null;
}
