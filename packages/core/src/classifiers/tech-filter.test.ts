import { describe, expect, it } from 'vitest';
import { isTechJob } from './tech-filter';

describe('isTechJob', () => {
  it.each([
    'Senior Software Engineer, Backend',
    'SDE-2 (Payments)',
    'Marketing Data Engineer',
    'Engineering Manager - Platform',
    'Data Scientist II',
    'AM/ Manager - Risk & Decision Science',
    'Product Manager, Growth',
    'Senior Product Designer',
    'Member of Technical Staff',
    'Site Reliability Engineer',
    'QA Automation Analyst',
    'Security Analyst (SOC)',
    'Solutions Architect',
    'iOS Developer',
    'Machine Learning Researcher',
    'Technical Program Manager',
    'Software Engineering Intern',
    'Customer Support Engineer',
    'Analytics Engineer',
  ])('tech: %s', (title) => expect(isTechJob(title)).toBe(true));

  it.each([
    'Account Executive, Mid-Market',
    'Technical Recruiter',
    'Engineering Recruiter',
    'Sales Engineer',
    'Senior Pre-Sales Consultant',
    'Product Marketing Manager',
    'Marketing Manager',
    'HR Business Partner',
    'Senior Accountant',
    'Legal Counsel',
    'Customer Success Manager',
    'Business Development Representative',
    'Mechanical Engineer',
    'Brand Designer',
    'Lead Communication Designer',
    'Creative Illustrator',
    'Financial Analyst',
    'Executive Assistant to CEO',
    'Sales Intern',
    'Talent Acquisition Partner',
  ])('non-tech: %s', (title) => expect(isTechJob(title)).toBe(false));

  it('falls back to the department for ambiguous titles', () => {
    expect(isTechJob('Intern', 'Engineering')).toBe(true);
    expect(isTechJob('Intern', 'Marketing')).toBe(false);
    expect(isTechJob('Specialist', 'Data & Analytics')).toBe(true);
    expect(isTechJob('Associate', 'Sales')).toBe(false);
    expect(isTechJob('Associate')).toBe(false);
  });
});
