/**
 * Fetch every seed company's board, run the real normalizer, and report how many India-relevant
 * tech jobs each yields. With --write, rewrites data/companies.seed.csv keeping only companies
 * that returned at least --min jobs (default 1). No database needed.
 *
 *   pnpm --filter @roleup/workers verify-seed [--write] [--min 3]
 */
import 'dotenv/config';
import { normalizeJob, slugify } from '@roleup/core';
import { readSeed, writeSeed } from './lib/csv';
import { mapLimit } from './lib/http';
import { repoPath } from './lib/paths';
import { FETCHERS } from './sources';

const args = process.argv.slice(2);
const write = args.includes('--write');
const minIdx = args.indexOf('--min');
const min = minIdx >= 0 ? Number(args[minIdx + 1]) : 1;
const rate = Number(process.env.USD_INR_RATE) || 84;

const path = repoPath('data/companies.seed.csv');
const rows = readSeed(path);

const results = await mapLimit(rows, 5, async (row, i) => {
  if (row.ats === 'none') return { row, total: 0, kept: 0, india: 0, error: 'no ats' };
  try {
    const raw = await FETCHERS[row.ats](row.ats_slug);
    const ctx = { id: i, slug: slugify(row.name), hqCountry: row.hq_country, tags: row.tags };
    const kept = raw.map((r) => normalizeJob(r, ctx, rate)).filter((r) => r.kept);
    const india = kept.filter((r) => r.kept && r.job.remoteType !== 'remote_restricted').length;
    return { row, total: raw.length, kept: kept.length, india, error: null as string | null };
  } catch (err) {
    return {
      row,
      total: 0,
      kept: 0,
      india: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
});

console.log(
  'company'.padEnd(18),
  'ats'.padEnd(11),
  'total'.padStart(6),
  'kept'.padStart(6),
  'india'.padStart(6),
);
for (const r of results) {
  console.log(
    r.row.name.padEnd(18),
    r.row.ats.padEnd(11),
    String(r.total).padStart(6),
    String(r.kept).padStart(6),
    String(r.india).padStart(6),
    r.error ? `  ERROR ${r.error}` : r.india < min ? '  (drop)' : '',
  );
}
const keep = results.filter((r) => !r.error && r.india >= min);
console.log(
  `\n${keep.length}/${rows.length} companies yield >= ${min} India-eligible tech jobs; ` +
    `${keep.reduce((a, r) => a + r.kept, 0)} kept jobs, ${keep.reduce((a, r) => a + r.india, 0)} India-eligible.`,
);
if (write) {
  writeSeed(
    path,
    keep.map((r) => r.row),
  );
  console.log(`wrote ${path}`);
}
