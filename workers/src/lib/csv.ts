import { readFileSync, writeFileSync } from 'node:fs';
import { z } from 'zod';
import { ATS_PROVIDERS, COMPANY_TAGS, type AtsProvider, type CompanyTag } from '@roleup/core';

/** Minimal RFC-4180 CSV parser (quoted fields, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      if (row.some((f) => f.trim() !== '')) rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== '')) rows.push(row);
  return rows;
}

const csvField = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export const seedRowSchema = z.object({
  name: z.string().min(1),
  website: z.string().url(),
  careers_url: z.string().url().or(z.literal('')),
  ats: z.enum(ATS_PROVIDERS),
  ats_slug: z.string(),
  tags: z
    .string()
    .transform((s) =>
      s
        .split('|')
        .map((t) => t.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.enum(COMPANY_TAGS))),
  hq_country: z.string().length(2).or(z.literal('')),
});

export interface SeedRow {
  name: string;
  website: string;
  careers_url: string;
  ats: AtsProvider;
  ats_slug: string;
  tags: CompanyTag[];
  hq_country: string;
}

export const SEED_HEADER = [
  'name',
  'website',
  'careers_url',
  'ats',
  'ats_slug',
  'tags',
  'hq_country',
] as const;

export function readSeed(path: string): SeedRow[] {
  const [header, ...rows] = parseCsv(readFileSync(path, 'utf8'));
  if (!header || header.join(',') !== SEED_HEADER.join(',')) {
    throw new Error(`Unexpected CSV header in ${path}: ${header?.join(',')}`);
  }
  return rows.map((r, i) => {
    const obj = Object.fromEntries(SEED_HEADER.map((h, j) => [h, (r[j] ?? '').trim()]));
    const parsed = seedRowSchema.safeParse(obj);
    if (!parsed.success) throw new Error(`Row ${i + 2} invalid: ${parsed.error.message}`);
    return parsed.data;
  });
}

export function writeSeed(path: string, rows: SeedRow[]): void {
  const lines = [
    SEED_HEADER.join(','),
    ...rows.map((r) =>
      [r.name, r.website, r.careers_url, r.ats, r.ats_slug, r.tags.join('|'), r.hq_country]
        .map(csvField)
        .join(','),
    ),
  ];
  writeFileSync(path, `${lines.join('\n')}\n`);
}
