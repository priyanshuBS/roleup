import { describe, expect, it } from 'vitest';
import { classifyLevel, extractMinYears } from './level';

describe('classifyLevel', () => {
  it.each([
    ['Software Engineering Intern', 'intern'],
    ['Summer Internship - Data', 'intern'],
    ['Junior Frontend Developer', 'entry'],
    ['Associate Software Engineer', 'entry'],
    ['Software Engineer I', 'entry'],
    ['SDE-1', 'entry'],
    ['SDE 1, Payments', 'entry'],
    ['Graduate Engineer Trainee', 'intern'],
    ['New Grad Software Engineer', 'entry'],
    ['Software Engineer II', 'mid'],
    ['SDE2 - Backend', 'mid'],
    ['Software Engineer III', 'senior'],
    ['SDE-3', 'senior'],
    ['Senior Backend Engineer', 'senior'],
    ['Sr. Data Scientist', 'senior'],
    ['Lead Engineer, Platform', 'senior'],
    ['Tech Lead - Android', 'senior'],
    ['Staff Software Engineer', 'staff'],
    ['Principal Engineer', 'staff'],
    ['Senior Staff Engineer', 'staff'],
    ['Engineering Manager', 'manager'],
    ['Director of Engineering', 'manager'],
    ['Head of Data', 'manager'],
    ['VP, Engineering', 'manager'],
    ['AM/ Manager - Risk & Decision Science', 'manager'],
    ['Group Product Manager', 'manager'],
    ['Senior Product Manager', 'senior'],
    ['Principal Product Manager', 'staff'],
    ['Product Manager II', 'mid'],
    ['Data Analyst III - Payments', 'senior'],
    ['Intermediate Backend Engineer, India', 'mid'],
    ['Web3 Engineer', 'mid'],
    ['SDE-  IV  / Lead Engineer', 'staff'],
    ['Product Management - Paytm Money (Experience : 4-9 yrs)', 'mid'],
  ] as const)('%s → %s', (title, expected) => expect(classifyLevel(title).level).toBe(expected));

  it('Product Manager without seniority is an IC, sized by years', () => {
    expect(
      classifyLevel('Product Manager', 'You have 3+ years of product management experience').level,
    ).toBe('mid');
    expect(classifyLevel('Product Manager').level).toBe('mid');
  });

  it('falls back to years of experience', () => {
    expect(classifyLevel('Software Engineer', '0-1 years of experience').level).toBe('entry');
    expect(
      classifyLevel('Software Engineer', 'At least 6 years of professional experience').level,
    ).toBe('senior');
    expect(classifyLevel('Software Engineer', '8+ years of industry experience').level).toBe(
      'senior',
    );
    expect(classifyLevel('Software Engineer', '10+ years of industry experience').level).toBe(
      'staff',
    );
  });
});

describe('extractMinYears', () => {
  it.each([
    ['3-6 years of relevant Fin-Tech experience', 3],
    ['5+ years of experience building APIs', 5],
    ['Minimum of 4 years experience', 4],
    ['at least 2 yrs of hands-on experience with Go', 2],
    ['2–4 years of experience', 2],
    ['Founded 10 years ago. You bring 3+ years of experience.', 3],
    ['A 4-year degree in CS', null],
    ['We have 12 years of history', null],
    ['', null],
  ] as const)('%s → %s', (text, expected) => expect(extractMinYears(text)).toBe(expected));
});
