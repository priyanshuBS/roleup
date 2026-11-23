import { z } from 'zod';
import { htmlToText, parseAshbyInterval, type RawSalary, type RawSourceJob } from '@roleup/core';
import { fetchJson } from '../lib/http';
import { parseDate } from './greenhouse';

/** https://developers.ashbyhq.com/docs/public-job-posting-api — public, no key. */
export const ashbyUrl = (slug: string) =>
  `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(slug)}?includeCompensation=true`;

const compComponent = z.object({
  compensationType: z.string().nullable().optional(),
  interval: z.string().nullable().optional(),
  currencyCode: z.string().nullable().optional(),
  minValue: z.number().nullable().optional(),
  maxValue: z.number().nullable().optional(),
});

const ashbyJob = z.object({
  id: z.string(),
  title: z.string(),
  department: z.string().nullable().optional(),
  team: z.string().nullable().optional(),
  employmentType: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  secondaryLocations: z
    .array(z.object({ location: z.string().nullable().optional() }))
    .nullable()
    .optional(),
  publishedAt: z.string().nullable().optional(),
  isListed: z.boolean().nullable().optional(),
  isRemote: z.boolean().nullable().optional(),
  workplaceType: z.string().nullable().optional(),
  address: z
    .object({
      postalAddress: z
        .object({
          addressCountry: z.string().nullable().optional(),
          addressLocality: z.string().nullable().optional(),
        })
        .nullable()
        .optional(),
    })
    .nullable()
    .optional(),
  jobUrl: z.string(),
  applyUrl: z.string().nullable().optional(),
  descriptionPlain: z.string().nullable().optional(),
  descriptionHtml: z.string().nullable().optional(),
  shouldDisplayCompensationOnJobPostings: z.boolean().nullable().optional(),
  compensation: z
    .object({ summaryComponents: z.array(compComponent).nullable().optional() })
    .nullable()
    .optional(),
});

export const ashbyResponse = z.object({ jobs: z.array(ashbyJob) });

function workplace(j: z.infer<typeof ashbyJob>): RawSourceJob['workplaceHint'] {
  const w = j.workplaceType?.toLowerCase();
  if (w === 'remote' || (j.isRemote && !w)) return 'remote';
  if (w === 'hybrid') return 'hybrid';
  if (w === 'onsite' || w === 'on-site') return 'onsite';
  return null;
}

function salaryFrom(j: z.infer<typeof ashbyJob>): RawSalary | null {
  const c = j.compensation?.summaryComponents?.find(
    (x) =>
      x.compensationType === 'Salary' &&
      x.currencyCode &&
      (x.minValue != null || x.maxValue != null),
  );
  if (!c || !c.currencyCode) return null;
  const interval = parseAshbyInterval(c.interval);
  if (!interval) return null;
  return { min: c.minValue ?? null, max: c.maxValue ?? null, currency: c.currencyCode, interval };
}

function countryCode(name: string | null | undefined): string | null {
  if (!name) return null;
  if (/^india$/i.test(name) || name.toUpperCase() === 'IN') return 'IN';
  return name.length === 2 ? name.toUpperCase() : null;
}

export function parseAshby(data: unknown): RawSourceJob[] {
  return ashbyResponse
    .parse(data)
    .jobs.filter((j) => j.isListed !== false)
    .map((j) => {
      const locs = [j.location, ...(j.secondaryLocations ?? []).map((s) => s.location)].filter(
        Boolean,
      ) as string[];
      return {
        source: 'ashby' as const,
        sourceJobId: j.id,
        title: j.title.trim(),
        department: j.department ?? j.team ?? null,
        descriptionText: (j.descriptionPlain?.trim() || htmlToText(j.descriptionHtml)).slice(
          0,
          20_000,
        ),
        applyUrl: j.jobUrl,
        locationRaw: locs.join('; '),
        workplaceHint: workplace(j),
        countryHint: countryCode(j.address?.postalAddress?.addressCountry),
        employmentType: j.employmentType ?? null,
        salary: salaryFrom(j),
        postedAt: parseDate(j.publishedAt),
      };
    });
}

export async function fetchAshby(slug: string): Promise<RawSourceJob[]> {
  return parseAshby(await fetchJson(ashbyUrl(slug)));
}
