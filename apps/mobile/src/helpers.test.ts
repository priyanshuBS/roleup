import { describe, expect, it } from 'vitest';
import { queryString } from './api';
import { locationLabel, salaryLabel } from './format';

describe('mobile helpers', () => {
  it('builds query strings, skipping empty values', () => {
    expect(queryString({ city: 'pune', q: 'go lang', cursor: undefined, band: '' })).toBe(
      '?city=pune&q=go%20lang',
    );
    expect(queryString({})).toBe('');
  });
  it('labels location and salary like the website', () => {
    const job = {
      city: { name: 'Pune', slug: 'pune' },
      remoteType: 'hybrid' as const,
      locationRaw: 'Pune',
      salary: null,
    };
    expect(locationLabel(job)).toBe('Pune · Hybrid');
    expect(locationLabel({ ...job, remoteType: 'remote_india' })).toBe('Remote (India OK)');
    expect(salaryLabel(job)).toBeNull();
    expect(
      salaryLabel({
        salary: {
          minInr: 1_800_000,
          maxInr: 3_200_000,
          band: '20to40',
          currency: 'INR',
          min: null,
          max: null,
          interval: 'year',
        },
      }),
    ).toBe('₹18–32L');
  });
});
