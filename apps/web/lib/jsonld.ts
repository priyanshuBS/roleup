import type { JobDetail } from '@roleup/core';
import { absoluteUrl } from './site';
import { logoSrc } from './format';

export function employmentTypeLd(raw: string | null, level: string): string | undefined {
  if (level === 'intern') return 'INTERN';
  const s = (raw ?? '').toLowerCase().replace(/[\s_-]+/g, '');
  if (!s) return undefined;
  if (s.includes('intern')) return 'INTERN';
  if (s.includes('contract') || s.includes('freelance')) return 'CONTRACTOR';
  if (s.includes('parttime')) return 'PART_TIME';
  if (s.includes('temp')) return 'TEMPORARY';
  if (s.includes('fulltime') || s.includes('permanent') || s.includes('regular'))
    return 'FULL_TIME';
  return undefined;
}

/** schema.org JobPosting. baseSalary only for employer-provided salary; TELECOMMUTE only for fully remote. */
export function jobPostingLd(job: JobDetail, company: { website?: string | null }) {
  const remote = job.remoteType.startsWith('remote_');
  const posted = job.postedAt ?? job.firstSeenAt;
  const validThrough = new Date(new Date(job.lastSeenAt).getTime() + 30 * 86_400_000).toISOString();
  const logo = logoSrc(job.company);
  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.descriptionText
      .split('\n')
      .map((l) => l.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]!))
      .join('<br>'),
    datePosted: posted,
    validThrough,
    identifier: {
      '@type': 'PropertyValue',
      name: job.company.name,
      value: `${job.source}:${job.id}`,
    },
    hiringOrganization: {
      '@type': 'Organization',
      name: job.company.name,
      ...(company.website ? { sameAs: company.website } : {}),
      ...(logo ? { logo } : {}),
    },
    directApply: false,
    url: absoluteUrl(`/jobs/${job.slug}`),
  };
  const et = employmentTypeLd(job.employmentType, job.level);
  if (et) ld.employmentType = et;
  if (remote) {
    ld.jobLocationType = 'TELECOMMUTE';
    // India-eligible remote roles: India is always an accepted applicant location.
    ld.applicantLocationRequirements = { '@type': 'Country', name: 'India' };
  }
  if (!remote || job.city) {
    ld.jobLocation = {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        ...(job.city ? { addressLocality: job.city.name } : {}),
        addressCountry: 'IN',
      },
    };
  }
  if (job.salary && (job.salary.min != null || job.salary.max != null) && job.salary.currency) {
    const unit =
      { year: 'YEAR', month: 'MONTH', week: 'WEEK', day: 'DAY', hour: 'HOUR' }[
        job.salary.interval ?? 'year'
      ] ?? 'YEAR';
    ld.baseSalary = {
      '@type': 'MonetaryAmount',
      currency: job.salary.currency,
      value: {
        '@type': 'QuantitativeValue',
        ...(job.salary.min != null ? { minValue: job.salary.min } : {}),
        ...(job.salary.max != null ? { maxValue: job.salary.max } : {}),
        unitText: unit,
      },
    };
  }
  return ld;
}

/** Serialize JSON-LD safely for a <script> tag. */
export function ldScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
