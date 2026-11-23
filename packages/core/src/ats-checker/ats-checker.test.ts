import { describe, expect, it } from 'vitest';
import { extractSkills } from '../skills';
import { analyzePdfLayout, checkResume, type LayoutSignals } from './index';
import { findDateRanges, findGaps, headingKey, yearsCovered } from './text';

const NOW = new Date('2026-11-23T00:00:00Z');

const layout = (over: Partial<LayoutSignals> = {}): LayoutSignals => ({
  fileType: 'pdf',
  fileName: 'Priya_Sharma_Resume.pdf',
  pageCount: 1,
  multiColumnPages: 0,
  tableCount: 0,
  contactInHeaderFooter: false,
  imageOnlyPages: 0,
  imageCount: 0,
  ...over,
});

const GOOD = `Priya Sharma
Bengaluru, India · priya.sharma@example.com · +91 98765 43210 · linkedin.com/in/priyasharma · github.com/priyas

SUMMARY
Backend engineer with 4 years building payments systems in Go and Java.

EXPERIENCE
Software Engineer II, Razorpay — Bengaluru
Jun 2023 – Present
• Built a reconciliation service in Go processing 2M transactions/day with 99.95% uptime
• Reduced settlement API p95 latency from 800ms to 180ms by adding Redis caching
• Led migration of 14 services from EC2 to Kubernetes, cutting infra cost by 22%
• Mentored 3 junior engineers and introduced contract tests across 6 teams

Software Engineer, Freshworks — Chennai
Jul 2021 – May 2023
• Developed REST APIs in Java and Spring Boot used by 40,000 customers
• Automated release pipeline with GitHub Actions, shrinking deploy time from 40 to 8 minutes
• Designed PostgreSQL schema changes for multi-tenant billing with zero downtime
• Fixed 120+ production bugs as part of on-call rotation

PROJECTS
• Shipped an open-source rate limiter in Go with 1.2k GitHub stars
• Wrote a Kafka consumer benchmark comparing 3 client libraries

EDUCATION
B.Tech, Computer Science, NIT Trichy
2017 – 2021

SKILLS
Go, Java, Spring Boot, PostgreSQL, Redis, Kafka, Kubernetes, Docker, AWS, gRPC, CI/CD`;

const WEAK = `RESUME

Objective
I am a passionate, hardworking and results-driven team player looking for a role where I can grow and my skills will be used.

Work
Responsible for handling various tasks in the team and working on many things including frontend and backend and databases and also testing and deployment, and I also helped my manager with reports every single week of the year without fail.
Worked on the website.

Education
B.E. 2019

Skills: HTML CSS JavaScript`;

describe('checkResume', () => {
  it('scores a well-structured resume highly', () => {
    const r = checkResume({ text: GOOD, layout: layout(), now: NOW });
    expect(r.score).toBeGreaterThanOrEqual(85);
    expect(r.verdict).toMatch(/^Strong/);
    expect(r.stats.yearsOfExperience).toBeGreaterThan(4);
    expect(r.stats.bullets).toBeGreaterThanOrEqual(10);
    const byId = Object.fromEntries(r.checks.map((c) => [c.id, c]));
    expect(byId['contact-email']!.status).toBe('pass');
    expect(byId['contact-phone']!.status).toBe('pass');
    expect(byId['contact-links']!.status).toBe('pass');
    expect(byId['contact-location']!.status).toBe('pass');
    expect(byId['section-experience']!.status).toBe('pass');
    expect(byId['bullets-verbs']!.status).toBe('pass');
    expect(byId['bullets-metrics']!.status).toBe('pass');
    expect(byId['wording-pronouns']!.status).toBe('pass');
    expect(r.disclaimer).toContain('real ATS systems differ');
  });

  it('flags a weak resume with specific fixes, worst first', () => {
    const r = checkResume({
      text: WEAK,
      layout: layout({ fileName: 'resume_final_v3 (1).pdf' }),
      now: NOW,
    });
    expect(r.score).toBeLessThan(50);
    const byId = Object.fromEntries(r.checks.map((c) => [c.id, c]));
    expect(byId['contact-email']!.status).toBe('fail');
    expect(byId['contact-phone']!.status).toBe('fail');
    expect(byId['dates-present']!.status).toBe('fail');
    expect(byId['wording-pronouns']!.status).toBe('fail');
    expect(byId['wording-buzzwords']!.status).toBe('fail');
    expect(byId['file-name']!.status).toBe('fail');
    expect(r.fixFirst.length).toBe(5);
    const lost = r.fixFirst.map((c) => c.maxPoints - c.points);
    expect([...lost].sort((a, b) => b - a)).toEqual(lost);
    expect(r.fixFirst.every((c) => c.fix.length > 10)).toBe(true);
  });

  it('caps scanned PDFs', () => {
    const r = checkResume({
      text: 'Priya Sharma',
      layout: layout({ imageOnlyPages: 1, imageCount: 1 }),
      now: NOW,
    });
    expect(r.score).toBeLessThanOrEqual(20);
    expect(r.checks.find((c) => c.id === 'text-extractable')!.status).toBe('fail');
  });

  it('penalizes multi-column layouts and tables', () => {
    const clean = checkResume({ text: GOOD, layout: layout(), now: NOW }).score;
    const messy = checkResume({
      text: GOOD,
      layout: layout({ multiColumnPages: 1, tableCount: 2, contactInHeaderFooter: true }),
      now: NOW,
    }).score;
    expect(messy).toBeLessThan(clean - 5);
  });

  it('allows 2 pages with 5+ years, not with less', () => {
    // GOOD has Jul 2021 – present (5.4 years); education dates must not count.
    expect(
      checkResume({ text: GOOD, layout: layout({ pageCount: 2 }), now: NOW }).checks.find(
        (c) => c.id === 'length-pages',
      )!.status,
    ).toBe('pass');
    const junior = GOOD.replace('Jul 2021 – May 2023', 'Jan 2023 – May 2023');
    const j = checkResume({ text: junior, layout: layout({ pageCount: 2 }), now: NOW });
    expect(j.stats.yearsOfExperience).toBeLessThan(5);
    expect(j.checks.find((c) => c.id === 'length-pages')!.status).toBe('warn');
  });

  it('matches job description keywords with aliases', () => {
    const r = checkResume({
      text: GOOD,
      layout: layout(),
      now: NOW,
      jobDescription: {
        source: 'pasted',
        text: 'We need Golang, k8s, Postgres and TypeScript experience. Kafka is a plus. React nice to have.',
      },
    });
    expect(r.keywords!.matched).toEqual(
      expect.arrayContaining(['Go', 'Kubernetes', 'PostgreSQL', 'Kafka']),
    );
    expect(r.keywords!.missing).toEqual(expect.arrayContaining(['TypeScript', 'React']));
    expect(r.keywords!.matchPercent).toBe(67);
  });
});

describe('text helpers', () => {
  it('detects heading variants', () => {
    expect(headingKey('WORK EXPERIENCE')).toBe('experience');
    expect(headingKey('Professional Experience:')).toBe('experience');
    expect(headingKey('Technical Skills')).toBe('skills');
    expect(headingKey('Academic Projects')).toBe('projects');
    expect(headingKey('Educational Qualifications')).toBe('education');
    expect(headingKey('Career Objective')).toBe('summary');
    expect(headingKey('I worked on experience with many teams')).toBeNull();
  });

  it('parses date ranges and gaps', () => {
    const ranges = findDateRanges('Jan 2020 - Dec 2020\n03/2022 – Present\n2016 to 2018', NOW);
    expect(ranges).toHaveLength(3);
    expect(findGaps(ranges).map((g) => g.months)).toEqual([12, 14]);
    expect(yearsCovered(findDateRanges('Jun 2021 – Jun 2023\nJan 2023 – Dec 2023'))).toBeCloseTo(
      2.6,
      1,
    );
  });

  it('extracts skills without false positives', () => {
    const names = extractSkills(
      'Worked with C++, C#, Node.js, .NET, k8s and Golang. Spring 2023 intern. The rest of the team. My CV.',
    ).map((s) => s.name);
    expect(names).toEqual(
      expect.arrayContaining(['C++', 'C#', 'Node.js', '.NET', 'Kubernetes', 'Go']),
    );
    expect(names).not.toContain('Spring Boot');
    expect(names).not.toContain('REST APIs');
    expect(names).not.toContain('Computer Vision');
    expect(extractSkills('Google and good governance').map((s) => s.name)).not.toContain('Go');
  });
});

describe('analyzePdfLayout', () => {
  const W = 600;
  const H = 800;
  const item = (str: string, x: number, y: number, width = str.length * 5) => ({
    str,
    x,
    y,
    width,
    height: 10,
  });

  it('reads single-column text in order and finds contact in body', () => {
    const items = [
      item('Priya Sharma', 50, 760),
      item('priya@example.com', 50, 740),
      ...Array.from({ length: 15 }, (_, i) => item(`Line ${i} of experience`, 50, 700 - i * 20)),
    ];
    const r = analyzePdfLayout([{ width: W, height: H, items }]);
    expect(r.multiColumnPages).toBe(0);
    expect(r.text.split('\n')[0]).toBe('Priya Sharma');
    expect(r.contactInHeaderFooter).toBe(false);
  });

  it('detects two columns and reads left column first', () => {
    const items = Array.from({ length: 16 }, (_, i) => [
      item(`Left ${i}`, 40, 750 - i * 20, 120),
      item(`Right ${i}`, 330, 750 - i * 20, 150),
    ]).flat();
    const r = analyzePdfLayout([{ width: W, height: H, items }]);
    expect(r.multiColumnPages).toBe(1);
    const t = r.text.split('\n');
    expect(t.indexOf('Left 15')).toBeLessThan(t.indexOf('Right 0'));
  });

  it('flags contact only in header area and image-only pages', () => {
    const items = [
      item('priya@example.com · +91 98765 43210', 50, 790),
      ...Array.from({ length: 5 }, (_, i) => item(`Body ${i}`, 50, 600 - i * 20)),
    ];
    const r = analyzePdfLayout([
      { width: W, height: H, items },
      { width: W, height: H, items: [], imageCoverage: 0.95, imageCount: 1 },
    ]);
    expect(r.contactInHeaderFooter).toBe(true);
    expect(r.imageOnlyPages).toBe(1);
  });
});
