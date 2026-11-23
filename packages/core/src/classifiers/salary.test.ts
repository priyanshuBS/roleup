import { describe, expect, it } from 'vitest';
import {
  bandForInrAnnual,
  inferInterval,
  normalizeSalary,
  parseAshbyInterval,
  parseLeverInterval,
  toInrAnnual,
} from './salary';

const RATE = 84;

describe('salary', () => {
  it('converts and annualizes', () => {
    expect(toInrAnnual(100_000, 'USD', 'year', RATE)).toBe(8_400_000);
    expect(toInrAnnual(150_000, 'INR', 'month', RATE)).toBe(1_800_000);
    expect(toInrAnnual(40, 'USD', 'hour', RATE)).toBe(40 * 2080 * 84);
    expect(toInrAnnual(1000, 'XYZ', 'year', RATE)).toBeNull();
  });

  it.each([
    [500_000, 'lt10'],
    [999_999, 'lt10'],
    [1_000_000, '10to20'],
    [2_500_000, '20to40'],
    [4_000_000, '40to70'],
    [6_999_999, '40to70'],
    [7_000_000, '70plus'],
    [null, 'undisclosed'],
  ] as const)('band(%s) = %s', (inr, band) => expect(bandForInrAnnual(inr)).toBe(band));

  it('bands on the top of the range', () => {
    const s = normalizeSalary(
      { min: 1_800_000, max: 2_500_000, currency: 'INR', interval: 'year' },
      RATE,
    );
    expect(s).toEqual({
      minInrAnnual: 1_800_000,
      maxInrAnnual: 2_500_000,
      band: '20to40',
      source: 'employer',
    });
  });

  it('never invents a salary', () => {
    expect(normalizeSalary(null, RATE)).toMatchObject({ band: 'undisclosed', source: 'none' });
    expect(
      normalizeSalary({ min: null, max: null, currency: 'USD', interval: 'year' }, RATE).source,
    ).toBe('none');
  });

  it('rejects implausible values and swaps inverted ranges', () => {
    expect(
      normalizeSalary({ min: 1, max: 2, currency: 'INR', interval: 'year' }, RATE).source,
    ).toBe('none');
    const s = normalizeSalary(
      { min: 3_000_000, max: 2_000_000, currency: 'INR', interval: 'year' },
      RATE,
    );
    expect([s.minInrAnnual, s.maxInrAnnual]).toEqual([2_000_000, 3_000_000]);
  });

  it('infers intervals', () => {
    expect(inferInterval('Hourly Rate:', 40, 'USD')).toBe('hour');
    expect(inferInterval('Annual Salary', 150000, 'USD')).toBe('year');
    expect(inferInterval(null, 45, 'USD')).toBe('hour');
    expect(inferInterval(null, 120_000, 'USD')).toBe('year');
    expect(inferInterval(null, 80_000, 'INR')).toBe('month');
    expect(inferInterval(null, 2_400_000, 'INR')).toBe('year');
    expect(parseLeverInterval('per-year-salary')).toBe('year');
    expect(parseLeverInterval('per-hour-wage')).toBe('hour');
    expect(parseAshbyInterval('1 MONTH')).toBe('month');
    expect(parseAshbyInterval(null)).toBeNull();
  });
});
