import { describe, expect, it } from 'vitest';
import type { RawSourceJob } from '../types';
import { jobFingerprint, jobSlug, normalizeJob, normalizeTitle } from './index';

const base: RawSourceJob = {
  source: 'greenhouse',
  sourceJobId: '123',
  title: 'Senior Backend Engineer',
  department: 'Engineering',
  descriptionText: '5+ years of experience with Go and Kafka',
  applyUrl: 'https://example.com/apply',
  locationRaw: 'Bengaluru',
  workplaceHint: null,
  countryHint: null,
  employmentType: 'Full-time',
  salary: { min: 4_000_000, max: 6_000_000, currency: 'INR', interval: 'year' },
  postedAt: new Date('2026-01-01'),
};
const company = { id: 1, slug: 'acme' };

describe('normalizeJob', () => {
  it('keeps and classifies an Indian tech job', () => {
    const r = normalizeJob(base, company, 84);
    expect(r.kept).toBe(true);
    if (!r.kept) return;
    expect(r.job).toMatchObject({
      roleCategory: 'backend',
      level: 'senior',
      minYears: 5,
      citySlug: 'bengaluru',
      remoteType: 'onsite',
      salaryBand: '40to70',
      salarySource: 'employer',
    });
  });
  it('drops non-tech', () => {
    expect(normalizeJob({ ...base, title: 'Account Executive' }, company, 84)).toEqual({
      kept: false,
      reason: 'non_tech',
    });
  });
  it('drops onsite outside India but keeps remote restricted', () => {
    expect(normalizeJob({ ...base, locationRaw: 'London, UK' }, company, 84)).toEqual({
      kept: false,
      reason: 'not_india_relevant',
    });
    const r = normalizeJob({ ...base, locationRaw: 'Remote - US' }, company, 84);
    expect(r.kept && r.job.remoteType).toBe('remote_restricted');
  });
});

describe('fingerprint & slug', () => {
  it('normalizes titles', () => {
    expect(normalizeTitle('Sr. Software Engineer (Bengaluru)')).toBe('senior software engineer');
    expect(jobFingerprint(1, 'Sr. Software Engineer (Remote)', 'remote_india')).toBe(
      '1|senior software engineer|remote_india',
    );
  });
  it('slug is stable and unique per source id', () => {
    const a = jobSlug('Senior Backend Engineer', 'acme', 'greenhouse', '1');
    expect(a).toBe(jobSlug('Senior Backend Engineer', 'acme', 'greenhouse', '1'));
    expect(a).not.toBe(jobSlug('Senior Backend Engineer', 'acme', 'greenhouse', '2'));
    expect(a.startsWith('senior-backend-engineer-at-acme-')).toBe(true);
  });
});
