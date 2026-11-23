import { describe, expect, it } from 'vitest';
import { classifyRoleCategory } from './role-category';

describe('classifyRoleCategory', () => {
  it.each([
    ['Senior Backend Engineer (Go)', 'backend'],
    ['Java Developer', 'backend'],
    ['Frontend Engineer - React', 'frontend'],
    ['Full Stack Developer', 'fullstack'],
    ['Software Engineer, Android', 'mobile'],
    ['iOS Engineer II', 'mobile'],
    ['Data Engineer', 'data'],
    ['Data Platform Engineer', 'data'],
    ['Analytics Engineer', 'data'],
    ['Machine Learning Engineer', 'ml_ai'],
    ['Research Scientist, LLMs', 'ml_ai'],
    ['ML Infrastructure Engineer', 'ml_ai'],
    ['Site Reliability Engineer', 'devops'],
    ['Cloud Infrastructure Engineer', 'devops'],
    ['Platform Engineer', 'devops'],
    ['Cloud Security Engineer', 'security'],
    ['Application Security Engineer', 'security'],
    ['SDET II', 'qa'],
    ['QA Engineer (Android)', 'qa'],
    ['Senior Product Designer', 'design'],
    ['AI Builder (Senior Product Designer)', 'design'],
    ['UX Researcher', 'design'],
    ['Product Manager, AI', 'product'],
    ['Technical Program Manager', 'product'],
    ['Solutions Engineer', 'other_tech'],
    ['Support Engineer (APAC)', 'other_tech'],
    ['Developer Relations Engineer', 'other_tech'],
    ['IT System Administrator I', 'devops'],
    ['Senior Product Analyst', 'data'],
    ['Forward Deployed Engineer II', 'other_tech'],
    ['Senior Solutions Architect', 'other_tech'],
  ] as const)('%s → %s', (title, expected) => expect(classifyRoleCategory(title)).toBe(expected));

  it('uses department when title is generic', () => {
    expect(classifyRoleCategory('Software Engineer', 'Infrastructure')).toBe('devops');
    expect(classifyRoleCategory('Software Engineer', 'Machine Learning')).toBe('ml_ai');
  });

  it('votes on description keywords for generic SWE titles', () => {
    expect(
      classifyRoleCategory('Software Engineer', null, 'We use Java, Spring, Kafka and Postgres'),
    ).toBe('backend');
    expect(
      classifyRoleCategory(
        'Software Engineer',
        null,
        'React, Next.js, Tailwind and CSS on the web',
      ),
    ).toBe('frontend');
    expect(
      classifyRoleCategory(
        'Software Engineer',
        null,
        'React and CSS on the frontend, Java and Kafka on the backend',
      ),
    ).toBe('fullstack');
    expect(classifyRoleCategory('Software Engineer', null, 'Join our team')).toBe('other_tech');
  });
});
