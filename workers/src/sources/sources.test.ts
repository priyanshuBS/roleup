import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { normalizeJob } from '@roleup/core';
import { parseAshby, parseGreenhouse, parseLever } from './index';

const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'));

describe('greenhouse parser (recorded fixture)', () => {
  const jobs = parseGreenhouse(fixture('greenhouse'));

  it('parses every job with required fields', () => {
    expect(jobs).toHaveLength(8);
    for (const j of jobs) {
      expect(j.source).toBe('greenhouse');
      expect(j.sourceJobId).toMatch(/^\d+$/);
      expect(j.applyUrl).toMatch(/^https:\/\//);
      expect(j.title.length).toBeGreaterThan(0);
      expect(j.descriptionText).not.toMatch(/<[a-z]|&lt;/i);
    }
  });

  it('maps India locations and ignores team-named offices', () => {
    const designer = jobs.find((j) => j.title.startsWith('AI Builder'));
    expect(designer?.locationRaw).toBe('Bengaluru');
    expect(designer?.postedAt?.toISOString()).toBe('2026-10-22T08:36:22.000Z');
  });

  it('reads pay transparency ranges with interval', () => {
    const hourly = jobs.find((j) => j.title === 'Acceleration Programs Intern');
    expect(hourly?.salary).toEqual({ min: 40, max: 40, currency: 'USD', interval: 'hour' });
    const annual = jobs.find((j) => j.title.startsWith('Analyst, Privacy'));
    expect(annual?.salary).toEqual({ min: 135320, max: 159200, currency: 'USD', interval: 'year' });
  });

  it('rejects malformed payloads', () => {
    expect(() => parseGreenhouse({ jobs: [{ id: 'x' }] })).toThrow();
  });
});

describe('lever parser (recorded fixture)', () => {
  const jobs = parseLever(fixture('lever'));

  it('parses postings', () => {
    expect(jobs).toHaveLength(8);
    const first = jobs[0]!;
    expect(first).toMatchObject({
      source: 'lever',
      title: 'AM/ Manager - Risk & Decision Science',
      locationRaw: 'Bangalore, Karnataka',
      workplaceHint: 'onsite',
      countryHint: 'IN',
      employmentType: 'Full Time Employee',
    });
    expect(first.descriptionText).toContain('What you will need');
    expect(first.postedAt).toBeInstanceOf(Date);
  });

  it('reads salaryRange in USD and CAD', () => {
    const withSalary = jobs.filter((j) => j.salary);
    expect(withSalary.map((j) => j.salary?.currency).sort()).toEqual(['CAD', 'USD']);
    expect(withSalary.every((j) => j.salary?.interval === 'year')).toBe(true);
  });

  it('end to end: keeps India tech roles, drops HR/finance', () => {
    const company = { id: 1, slug: 'meesho' };
    const kept = jobs.map((j) => normalizeJob(j, company, 84)).filter((r) => r.kept);
    const titles = kept.map((r) => (r.kept ? r.job.title : ''));
    expect(titles).toContain('AM/ Manager - Risk & Decision Science');
    expect(titles).toContain('AI Product Engineer');
    expect(titles).not.toContain('Assistant Manager HR : HRBP');
    expect(titles).not.toContain('Assistant Manager - Business Finance | CA pass -out 2026');
    const ai = kept.find((r) => r.kept && r.job.title === 'AI Product Engineer');
    expect(ai?.kept && ai.job).toMatchObject({
      citySlug: 'pune',
      remoteType: 'hybrid',
      roleCategory: 'ml_ai',
    });
  });
});

describe('ashby parser (recorded fixture)', () => {
  const jobs = parseAshby(fixture('ashby'));

  it('parses jobs and compensation', () => {
    expect(jobs).toHaveLength(7);
    const pm = jobs[0]!;
    expect(pm.salary).toEqual({ min: 200000, max: 270000, currency: 'USD', interval: 'year' });
    expect(pm.applyUrl).toMatch(/^https:\/\/jobs\.ashbyhq\.com\//);
  });

  it('reads workplace type', () => {
    const head = jobs.find((j) => j.title === 'Head of Ecosystem');
    expect(head?.workplaceHint).toBe('remote');
    expect(head?.locationRaw).toBe('Remote, AMER');
    const sarvam = jobs.find((j) => j.title.startsWith('Data Scientist - Evaluations'));
    expect(sarvam).toMatchObject({ workplaceHint: 'onsite', locationRaw: 'Bengaluru' });
  });

  it('end to end: Indian onsite + remote restricted classification', () => {
    const company = { id: 2, slug: 'x' };
    const res = jobs.map((j) => normalizeJob(j, company, 84));
    const byTitle = new Map(
      res.filter((r) => r.kept).map((r) => (r.kept ? [r.job.title, r.job] : ['', null])),
    );
    expect(byTitle.get('Embedded Infrastructure Engineer, Chanakya')).toMatchObject({
      citySlug: 'delhi-ncr',
      remoteType: 'onsite',
      roleCategory: 'devops',
    });
    // Ambiguous title, but Engineering department: kept as an engineering leadership role.
    expect(byTitle.get('Head of Ecosystem')).toMatchObject({
      level: 'manager',
      remoteType: 'remote_restricted',
    });
    expect(byTitle.has('Senior Accountant')).toBe(false);
    const pm = [...byTitle.values()].find((j) => j?.title.startsWith('Product Manager'));
    expect(pm).toMatchObject({
      remoteType: 'remote_restricted',
      salaryBand: '70plus',
      salarySource: 'employer',
    });
  });
});
