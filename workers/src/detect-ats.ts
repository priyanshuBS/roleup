/**
 * Detect a company's ATS from its careers page and save ats + ats_slug.
 *
 *   pnpm detect-ats                         # companies queued for detection, or with ats = none
 *   pnpm detect-ats --company acme          # one company
 *   pnpm detect-ats --url https://acme.com/careers   # dry run, no DB
 *
 * Respects robots.txt. Verifies the detected board actually responds before saving.
 */
import { pathToFileURL } from 'node:url';
import { and, companies, eq, isNotNull, or, type Company } from '@roleup/db';
import { argValue, loadEnv, openDb } from './lib/env';
import { detectAts, type AtsDetection } from './lib/detect';
import { mapLimit, politeFetch } from './lib/http';
import { allowedByRobots } from './lib/page';
import { FETCHERS } from './sources';

export async function detectFromUrl(
  careersUrl: string,
): Promise<{ detection: AtsDetection | null; reason?: string }> {
  let url: URL;
  try {
    url = new URL(careersUrl);
  } catch {
    return { detection: null, reason: 'invalid url' };
  }
  // The URL itself may already be a board.
  const direct = detectAts(url.href);
  if (direct) return { detection: direct };
  if (!(await allowedByRobots(url))) return { detection: null, reason: 'blocked by robots.txt' };
  try {
    const res = await politeFetch(url.href, { accept: 'text/html', retries: 1 });
    const final = detectAts(res.url);
    if (final) return { detection: final };
    const html = (await res.text()).slice(0, 2_000_000);
    const det = detectAts(html);
    return det ? { detection: det } : { detection: null, reason: 'no ATS link found' };
  } catch (err) {
    return { detection: null, reason: err instanceof Error ? err.message : String(err) };
  }
}

/** Confirm the board exists (responds and parses) before we save it. */
async function verifyBoard(det: AtsDetection): Promise<number | null> {
  try {
    return (await FETCHERS[det.ats](det.slug)).length;
  } catch {
    return null;
  }
}

async function main() {
  const dryUrl = argValue('url');
  if (dryUrl) {
    loadEnv();
    const r = await detectFromUrl(dryUrl);
    const jobsCount = r.detection ? await verifyBoard(r.detection) : null;
    console.log(JSON.stringify({ ...r, jobs: jobsCount }, null, 2));
    return;
  }
  const { db, close } = openDb();
  try {
    const only = argValue('company');
    const list: Company[] = await db
      .select()
      .from(companies)
      .where(
        only
          ? eq(companies.slug, only)
          : and(
              isNotNull(companies.careersUrl),
              or(eq(companies.ats, 'none'), isNotNull(companies.atsDetectRequestedAt)),
            ),
      );
    console.log(`checking ${list.length} companies`);
    await mapLimit(
      list,
      3,
      async (c) => {
        const url = c.careersUrl ?? c.website;
        if (!url) return;
        const { detection, reason } = await detectFromUrl(url);
        const n = detection ? await verifyBoard(detection) : null;
        if (detection && n !== null) {
          await db
            .update(companies)
            .set({
              ats: detection.ats,
              atsSlug: detection.slug,
              crawlStatus: 'pending',
              crawlError: null,
              atsDetectRequestedAt: null,
            })
            .where(eq(companies.id, c.id));
          console.log(`found ${c.slug.padEnd(22)} ${detection.ats}/${detection.slug} (${n} jobs)`);
        } else {
          await db
            .update(companies)
            .set({ atsDetectRequestedAt: null })
            .where(eq(companies.id, c.id));
          console.log(
            `none  ${c.slug.padEnd(22)} ${detection ? `board ${detection.ats}/${detection.slug} did not respond` : reason}`,
          );
        }
      },
      500,
    );
  } finally {
    await close();
  }
}

// Run only when executed directly (discover-companies imports detectFromUrl).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
