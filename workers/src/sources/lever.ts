import { z } from 'zod';
import { htmlToText, parseLeverInterval, type RawSalary, type RawSourceJob } from '@roleup/core';
import { fetchJson } from '../lib/http';
import { parseDate } from './greenhouse';

/** https://github.com/lever/postings-api — public, no key. */
export const leverUrl = (slug: string) =>
  `https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`;

const leverPosting = z.object({
  id: z.string(),
  text: z.string(),
  hostedUrl: z.string(),
  applyUrl: z.string().nullable().optional(),
  createdAt: z.number().nullable().optional(),
  country: z.string().nullable().optional(),
  workplaceType: z.string().nullable().optional(),
  categories: z
    .object({
      commitment: z.string().nullable().optional(),
      department: z.string().nullable().optional(),
      location: z.string().nullable().optional(),
      team: z.string().nullable().optional(),
      allLocations: z.array(z.string()).nullable().optional(),
    })
    .nullable()
    .optional(),
  descriptionPlain: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  lists: z
    .array(
      z.object({
        text: z.string().nullable().optional(),
        content: z.string().nullable().optional(),
      }),
    )
    .nullable()
    .optional(),
  additionalPlain: z.string().nullable().optional(),
  salaryRange: z
    .object({
      min: z.number().nullable().optional(),
      max: z.number().nullable().optional(),
      currency: z.string().nullable().optional(),
      interval: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});

export const leverResponse = z.array(leverPosting);

function workplace(v: string | null | undefined): RawSourceJob['workplaceHint'] {
  if (v === 'remote') return 'remote';
  if (v === 'hybrid') return 'hybrid';
  if (v === 'onsite' || v === 'on-site') return 'onsite';
  return null;
}

function salaryFrom(s: z.infer<typeof leverPosting>['salaryRange']): RawSalary | null {
  if (!s || !s.currency || (s.min == null && s.max == null)) return null;
  const interval = parseLeverInterval(s.interval);
  if (!interval) return null; // "one-time" etc. aren't salaries
  return { min: s.min ?? null, max: s.max ?? null, currency: s.currency, interval };
}

export function parseLever(data: unknown): RawSourceJob[] {
  return leverResponse.parse(data).map((p) => {
    const locs = p.categories?.allLocations?.length
      ? p.categories.allLocations
      : [p.categories?.location ?? ''];
    const lists = (p.lists ?? [])
      .map((l) => `${l.text ?? ''}\n${htmlToText(l.content)}`)
      .join('\n\n');
    const description = [
      p.descriptionPlain?.trim() || htmlToText(p.description),
      lists,
      p.additionalPlain?.trim(),
    ]
      .filter(Boolean)
      .join('\n\n')
      .slice(0, 20_000);
    return {
      source: 'lever' as const,
      sourceJobId: p.id,
      title: p.text.trim(),
      department: p.categories?.department ?? p.categories?.team ?? null,
      descriptionText: description,
      applyUrl: p.hostedUrl,
      locationRaw: locs.filter(Boolean).join('; '),
      workplaceHint: workplace(p.workplaceType),
      countryHint: p.country ?? null,
      employmentType: p.categories?.commitment ?? null,
      salary: salaryFrom(p.salaryRange),
      postedAt: parseDate(p.createdAt),
    };
  });
}

export async function fetchLever(slug: string): Promise<RawSourceJob[]> {
  return parseLever(await fetchJson(leverUrl(slug)));
}
