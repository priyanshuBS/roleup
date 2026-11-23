import { describe, expect, it } from 'vitest';
import type { JobDetail } from '@roleup/core';
import { locationLabel, salaryLabel, salaryOriginal } from './format';
import { employmentTypeLd, jobPostingLd, ldScript } from './jsonld';

const job: JobDetail = {
  id: 1,
  slug: 'backend-engineer-at-acme-abc',
  title: 'Backend Engineer',
  company: {
    id: 1,
    name: 'Acme',
    slug: 'acme',
    logoUrl: null,
    domain: 'acme.com',
    tags: [],
    ycBatch: null,
  },
  roleCategory: 'backend',
  level: 'mid',
  locationRaw: 'Bengaluru',
  city: { name: 'Bengaluru', slug: 'bengaluru' },
  remoteType: 'onsite',
  salary: null,
  postedAt: '2026-11-01T00:00:00.000Z',
  firstSeenAt: '2026-11-01T00:00:00.000Z',
  lastSeenAt: '2026-11-20T00:00:00.000Z',
  closedAt: null,
  descriptionText: 'Build <APIs> & ship\n• Go',
  applyUrl: 'https://acme.com/apply',
  department: 'Engineering',
  employmentType: 'Full-time',
  minYears: 3,
  source: 'greenhouse',
};

describe('jobPostingLd', () => {
  it('omits baseSalary when salary is not employer-provided', () => {
    const ld = jobPostingLd(job, {});
    expect(ld.baseSalary).toBeUndefined();
    expect(ld.jobLocationType).toBeUndefined();
    expect(ld.employmentType).toBe('FULL_TIME');
    expect(ld.jobLocation).toMatchObject({
      address: { addressLocality: 'Bengaluru', addressCountry: 'IN' },
    });
    expect(String(ld.description)).toContain('&lt;APIs&gt; &amp; ship<br>');
  });

  it('adds baseSalary for employer salary and TELECOMMUTE only for remote', () => {
    const ld = jobPostingLd(
      {
        ...job,
        remoteType: 'remote_india',
        city: null,
        salary: {
          minInr: 2_000_000,
          maxInr: 3_000_000,
          band: '20to40',
          currency: 'INR',
          min: 2_000_000,
          max: 3_000_000,
          interval: 'year',
        },
      },
      {},
    );
    expect(ld.jobLocationType).toBe('TELECOMMUTE');
    expect(ld.applicantLocationRequirements).toEqual({ '@type': 'Country', name: 'India' });
    expect(ld.jobLocation).toBeUndefined();
    expect(ld.baseSalary).toMatchObject({
      currency: 'INR',
      value: { minValue: 2_000_000, maxValue: 3_000_000, unitText: 'YEAR' },
    });
    expect(jobPostingLd({ ...job, remoteType: 'hybrid' }, {}).jobLocationType).toBeUndefined();
  });

  it('maps employment types and escapes script content', () => {
    expect(employmentTypeLd('FullTime', 'mid')).toBe('FULL_TIME');
    expect(employmentTypeLd('Contract', 'mid')).toBe('CONTRACTOR');
    expect(employmentTypeLd(null, 'intern')).toBe('INTERN');
    expect(employmentTypeLd('Something', 'mid')).toBeUndefined();
    expect(ldScript({ a: '</script><script>' })).not.toContain('</script>');
  });
});

describe('format', () => {
  it('labels locations and salaries', () => {
    expect(locationLabel(job)).toBe('Bengaluru');
    expect(locationLabel({ ...job, remoteType: 'hybrid' })).toBe('Bengaluru · Hybrid');
    expect(locationLabel({ ...job, remoteType: 'remote_global', city: null })).toBe(
      'Remote (Global)',
    );
    expect(salaryLabel(job)).toBeNull();
    const usd = {
      ...job,
      salary: {
        minInr: 16_800_000,
        maxInr: 22_680_000,
        band: '70plus' as const,
        currency: 'USD',
        min: 200_000,
        max: 270_000,
        interval: 'year',
      },
    };
    expect(salaryLabel(usd)).toBe('₹1.7–2.3Cr');
    expect(salaryOriginal(usd)).toBe('$200K–270K/yr');
  });
});

import { parseDescription } from '../components/JobDescription';

describe('parseDescription', () => {
  it('promotes headings that introduce lists and colon lines', () => {
    const blocks = parseDescription(
      'About us\nWe build payments.\n\nWhat You Will Build\n• APIs\n• Tools\n\nRequirements:\nGo and Kafka.',
    );
    expect(blocks.map((b) => b.type)).toEqual(['p', 'h', 'ul', 'h', 'p']);
    expect(blocks[1]).toEqual({ type: 'h', text: 'What You Will Build' });
    expect(blocks[3]).toEqual({ type: 'h', text: 'Requirements' });
  });
  it('keeps sentences as paragraphs', () => {
    expect(parseDescription('We are hiring.\n• one').map((b) => b.type)).toEqual(['p', 'ul']);
  });
});
