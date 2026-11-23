import { z } from 'zod';
import {
  htmlToText,
  inferInterval,
  matchCity,
  type RawSalary,
  type RawSourceJob,
} from '@roleup/core';
import { fetchJson } from '../lib/http';

/** https://developers.greenhouse.io/job-board.html — public, no key. */
export const greenhouseUrl = (slug: string) =>
  `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs?content=true&pay_transparency=true`;

const payRange = z.object({
  min_cents: z.number().nullable().optional(),
  max_cents: z.number().nullable().optional(),
  currency_type: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
});

const ghJob = z.object({
  id: z.number(),
  title: z.string(),
  absolute_url: z.string(),
  updated_at: z.string().nullable().optional(),
  first_published: z.string().nullable().optional(),
  location: z.object({ name: z.string().nullable().optional() }).nullable().optional(),
  content: z.string().nullable().optional(),
  departments: z
    .array(z.object({ name: z.string() }))
    .nullable()
    .optional(),
  offices: z
    .array(
      z.object({
        name: z.string().nullable().optional(),
        location: z.string().nullable().optional(),
      }),
    )
    .nullable()
    .optional(),
  pay_input_ranges: z.array(payRange).nullable().optional(),
  metadata: z
    .array(z.object({ name: z.string().nullable().optional(), value: z.unknown() }))
    .nullable()
    .optional(),
});

export const greenhouseResponse = z.object({ jobs: z.array(ghJob) });
export type GreenhouseResponse = z.infer<typeof greenhouseResponse>;

function salaryFrom(ranges: z.infer<typeof payRange>[] | null | undefined): RawSalary | null {
  const r = ranges?.find((p) => p.currency_type && (p.min_cents || p.max_cents));
  if (!r || !r.currency_type) return null;
  const min = r.min_cents ? r.min_cents / 100 : null;
  const max = r.max_cents ? r.max_cents / 100 : null;
  return {
    min,
    max,
    currency: r.currency_type,
    interval: inferInterval(r.title, (max ?? min) as number, r.currency_type),
  };
}

function employmentType(meta: z.infer<typeof ghJob>['metadata']): string | null {
  const m = meta?.find((x) => /employment type|job type|commitment/i.test(x.name ?? ''));
  return typeof m?.value === 'string' ? m.value : null;
}

export function parseGreenhouse(data: unknown): RawSourceJob[] {
  const parsed = greenhouseResponse.parse(data);
  return parsed.jobs.map((j) => {
    const loc = j.location?.name?.trim() ?? '';
    // Office names are sometimes teams ("Platforms"), so only use ones that look like places.
    const offices = (j.offices ?? [])
      .map((o) => o.location || o.name || '')
      .filter((o) => o && (matchCity(o) || /\b(remote|india)\b/i.test(o)));
    // Location name is primary; offices often add the other cities of multi-location roles.
    const locationRaw = [loc, ...offices.filter((o) => o && !loc.includes(o))]
      .filter(Boolean)
      .join('; ');
    return {
      source: 'greenhouse' as const,
      sourceJobId: String(j.id),
      title: j.title.trim(),
      department: j.departments?.[0]?.name ?? null,
      descriptionText: htmlToText(j.content),
      applyUrl: j.absolute_url,
      locationRaw,
      workplaceHint: null,
      countryHint: null,
      employmentType: employmentType(j.metadata),
      salary: salaryFrom(j.pay_input_ranges),
      postedAt: parseDate(j.first_published ?? j.updated_at),
    };
  });
}

export async function fetchGreenhouse(slug: string): Promise<RawSourceJob[]> {
  return parseGreenhouse(await fetchJson(greenhouseUrl(slug)));
}

export function parseDate(v: string | number | null | undefined): Date | null {
  if (v === null || v === undefined || v === '') return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
