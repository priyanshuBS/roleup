import { describe, expect, it } from 'vitest';
import { parseCsv } from './csv';
import { detectAts, robotsAllows } from './detect';
import { batchCode, buildYcIndex, matchYc, normalizeCompanyName, registrableDomain } from './yc';

describe('detectAts', () => {
  it.each([
    [
      '<a href="https://boards.greenhouse.io/stripe/jobs/123">',
      { ats: 'greenhouse', slug: 'stripe' },
    ],
    [
      '<a href="https://job-boards.greenhouse.io/razorpaysoftwareprivatelimited">',
      { ats: 'greenhouse', slug: 'razorpaysoftwareprivatelimited' },
    ],
    [
      '<script src="https://boards.greenhouse.io/embed/job_board/js?for=acme"></script>',
      { ats: 'greenhouse', slug: 'acme' },
    ],
    ['<a href="https://jobs.lever.co/meesho">Careers</a>', { ats: 'lever', slug: 'meesho' }],
    ['<iframe src="https://jobs.ashbyhq.com/Sarvam/embed">', { ats: 'ashby', slug: 'sarvam' }],
  ] as const)('%s', (html, expected) => expect(detectAts(html)).toEqual(expected));

  it('prefers the most-linked board and returns null when absent', () => {
    const html = 'jobs.lever.co/a jobs.lever.co/b jobs.lever.co/b';
    expect(detectAts(html)).toEqual({ ats: 'lever', slug: 'b' });
    expect(detectAts('<a href="/careers">Careers</a>')).toBeNull();
  });
});

describe('robotsAllows', () => {
  const robots = `User-agent: *\nDisallow: /private\nAllow: /private/careers\n\nUser-agent: BadBot\nDisallow: /`;
  it('applies longest match', () => {
    expect(robotsAllows(robots, '/careers')).toBe(true);
    expect(robotsAllows(robots, '/private/x')).toBe(false);
    expect(robotsAllows(robots, '/private/careers')).toBe(true);
  });
  it('honours agent-specific groups and wildcards', () => {
    expect(robotsAllows('User-agent: RoleUpBot\nDisallow: /', '/careers')).toBe(false);
    expect(robotsAllows('User-agent: *\nDisallow: /*.pdf$', '/a.pdf')).toBe(false);
    expect(robotsAllows('User-agent: *\nDisallow:', '/anything')).toBe(true);
    expect(robotsAllows('', '/anything')).toBe(true);
  });
});

describe('yc matching', () => {
  it('batch codes', () => {
    expect(batchCode('Winter 2015')).toBe('W15');
    expect(batchCode('Summer 2016')).toBe('S16');
    expect(batchCode('Spring 2025')).toBe('X25');
    expect(batchCode('Fall 2024')).toBe('F24');
    expect(batchCode('Unspecified')).toBeNull();
  });
  it('registrable domains', () => {
    expect(registrableDomain('https://about.gitlab.com/jobs')).toBe('gitlab.com');
    expect(registrableDomain('http://www.meesho.com')).toBe('meesho.com');
    expect(registrableDomain('https://shop.foo.co.in')).toBe('foo.co.in');
    expect(registrableDomain('')).toBeNull();
  });
  it('matches by domain, then name, but not same-name-different-site', () => {
    const idx = buildYcIndex([
      { name: 'GitLab', website: 'http://gitlab.com/', batch: 'Winter 2015' },
      { name: 'Acme Labs', website: 'https://acme.io', batch: 'Summer 2020' },
      { name: 'Nimbus', website: null, batch: 'Winter 2021' },
    ]);
    expect(
      matchYc(idx, {
        name: 'GitLab',
        website: 'https://about.gitlab.com',
        domain: 'about.gitlab.com',
      })?.batch,
    ).toBe('Winter 2015');
    expect(
      matchYc(idx, { name: 'Nimbus Inc', website: 'https://nimbus.dev', domain: 'nimbus.dev' })
        ?.batch,
    ).toBe('Winter 2021');
    expect(
      matchYc(idx, { name: 'Acme', website: 'https://acme.com', domain: 'acme.com' }),
    ).toBeNull();
    expect(normalizeCompanyName('Razorpay Software Pvt. Ltd.')).toBe('razorpay');
  });
});

describe('parseCsv', () => {
  it('handles quotes, escaped quotes and CRLF', () => {
    expect(parseCsv('a,b\r\n"x, y","say ""hi"""\n\n')).toEqual([
      ['a', 'b'],
      ['x, y', 'say "hi"'],
    ]);
  });
});
