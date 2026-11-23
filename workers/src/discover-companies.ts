/**
 * Set up companies that were added without any URLs (usually from funding news), so they start
 * showing jobs without manual work. For each one:
 *
 *   1. Probe public job boards by name (Greenhouse, Ashby, Lever). A board is accepted only if
 *      the board's own company name matches ours, and it responds with a job list.
 *   2. Otherwise look for the website (name.com, name.ai, …). Accepted only if the page title or
 *      site name names the company. Then find the job board linked from the site / its /careers.
 *
 * Results are written to companies.discovery_note so /admin/companies shows what happened.
 * A company is re-tried every 14 days until something is found.
 *
 *   pnpm discover-companies                 # all companies waiting for discovery
 *   pnpm discover-companies --company acme  # one company (ignores the 14-day wait)
 *   pnpm discover-companies --dry-run       # print, no DB writes
 */
import { pathToFileURL } from 'node:url';
import {
  boardSlugCandidates,
  domainCandidates,
  domainFromUrl,
  mentionsName,
  nameKey,
  pageNamesCompany,
  type AtsProvider,
} from '@roleup/core';
import { and, companies, eq, isNull, lt, or, type Company, type Db } from '@roleup/db';
import { detectFromUrl } from './detect-ats';
import { argValue, hasFlag, loadEnv, openDb } from './lib/env';
import { fetchJson, HttpError, mapLimit } from './lib/http';
import { fetchPage } from './lib/page';
import { FETCHERS } from './sources';

type Ats = Exclude<AtsProvider, 'none'>;
const RETRY_DAYS = 14;

function sameCompany(found: string | null | undefined, ours: string): boolean {
  if (!found) return false;
  return (
    mentionsName(found, ours) || (nameKey(found).length > 1 && nameKey(found) === nameKey(ours))
  );
}

/** The company name a board reports for itself, or null if the board does not exist. */
async function boardName(ats: Ats, slug: string): Promise<string | null> {
  try {
    if (ats === 'greenhouse') {
      const r = (await fetchJson(
        `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}`,
        { retries: 1, timeoutMs: 10_000 },
      )) as { name?: string };
      return r.name ?? null;
    }
    const page = await fetchPage(
      ats === 'lever'
        ? `https://jobs.lever.co/${encodeURIComponent(slug)}`
        : `https://jobs.ashbyhq.com/${encodeURIComponent(slug)}`,
      { timeoutMs: 10_000 },
    );
    if (!page?.ok) return null;
    // "Hevo Data" / "SpotDraft Jobs" / "Hevo Data jobs"
    return (page.title ?? page.siteName ?? '').replace(/\s+jobs?$/i, '').trim() || null;
  } catch (err) {
    if (err instanceof HttpError) return null;
    throw err;
  }
}

async function jobCount(ats: Ats, slug: string): Promise<number | null> {
  try {
    return (await FETCHERS[ats](slug)).length;
  } catch {
    return null;
  }
}

export interface Discovery {
  ats?: Ats;
  atsSlug?: string;
  website?: string;
  note: string;
}

export async function discover(
  c: Pick<Company, 'name' | 'website' | 'careersUrl'>,
): Promise<Discovery> {
  // 1. Job boards by name.
  for (const slug of boardSlugCandidates(c.name)) {
    for (const ats of ['greenhouse', 'ashby', 'lever'] as const) {
      const name = await boardName(ats, slug);
      if (!name) continue;
      if (!sameCompany(name, c.name)) {
        console.log(`  ${ats}/${slug}: board is "${name}", not ${c.name}; skipped`);
        continue;
      }
      const n = await jobCount(ats, slug);
      // A name-only match with no openings is as likely another company with the same name,
      // and gives us nothing to show: skip it.
      if (!n) {
        console.log(`  ${ats}/${slug}: "${name}" has no open jobs; skipped`);
        continue;
      }
      return {
        ats,
        atsSlug: slug,
        note: `Found ${ats} board "${slug}" (board name "${name}" matches) · ${n} open jobs`,
      };
    }
  }

  // 2. Website, then the board linked from it. A guessed website is unreliable on its own
  //    ("Meridian" -> meridian.dev is someone else), so it is kept only when it links a job
  //    board that independently names the company too.
  const sites: { url: string; guessed: boolean; title?: string | null }[] = c.website
    ? [{ url: c.website, guessed: false }]
    : [];
  if (!c.website) {
    for (const domain of domainCandidates(c.name)) {
      const page = await fetchPage(`https://${domain}`, { timeoutMs: 8_000 });
      if (page?.ok && pageNamesCompany(page, c.name)) {
        const origin = new URL(page.url ?? `https://${domain}`).origin;
        if (!sites.some((x) => x.url === origin))
          sites.push({ url: origin, guessed: true, title: page.title });
      }
      if (sites.length >= 3) break;
    }
  }
  for (const site of sites) {
    for (const url of [c.careersUrl, site.url, `${site.url}/careers`, `${site.url}/jobs`]) {
      if (!url) continue;
      const { detection } = await detectFromUrl(url);
      if (!detection) continue;
      const name = await boardName(detection.ats, detection.slug);
      if (site.guessed && !sameCompany(name, c.name)) {
        console.log(
          `  ${url}: links ${detection.ats}/${detection.slug} ("${name}"), not ${c.name}`,
        );
        continue;
      }
      const n = await jobCount(detection.ats, detection.slug);
      if (!n) continue;
      return {
        ats: detection.ats,
        atsSlug: detection.slug,
        website: site.url,
        note: `Website ${domainFromUrl(site.url)} links ${detection.ats} board "${detection.slug}"${name ? ` ("${name}")` : ''} · ${n} open jobs`,
      };
    }
  }
  const possible = sites.filter((x) => x.guessed).map((x) => domainFromUrl(x.url));
  return {
    note: c.website
      ? `Website ${domainFromUrl(c.website)} links no Greenhouse, Lever or Ashby board with open jobs`
      : `No matching job board found${possible.length ? `. Unconfirmed sites: ${possible.join(', ')} (not saved)` : ''}. Add the careers URL in admin if you know it`,
  };
}

export async function discoverCompanies(
  db: Db,
  opts: { only?: string; dry?: boolean; limit?: number } = {},
): Promise<{ checked: number; found: number }> {
  const list = await db
    .select()
    .from(companies)
    .where(
      opts.only
        ? eq(companies.slug, opts.only)
        : and(
            eq(companies.ats, 'none'),
            or(
              isNull(companies.discoveryCheckedAt),
              lt(companies.discoveryCheckedAt, new Date(Date.now() - RETRY_DAYS * 86_400_000)),
            ),
          ),
    )
    .limit(opts.limit ?? 40);
  console.log(`discovering ${list.length} companies`);
  let found = 0;
  await mapLimit(
    list,
    2,
    async (c) => {
      const d = await discover(c);
      if (d.ats) found++;
      console.log(`${d.ats ? 'found' : 'none '} ${c.name}: ${d.note}`);
      if (opts.dry) return;
      await db
        .update(companies)
        .set({
          discoveryNote: d.note,
          discoveryCheckedAt: new Date(),
          ...(d.website && !c.website
            ? { website: d.website, domain: domainFromUrl(d.website) }
            : {}),
          ...(d.ats
            ? {
                ats: d.ats,
                atsSlug: d.atsSlug,
                crawlStatus: 'pending' as const,
                crawlError: null,
                atsDetectRequestedAt: null,
              }
            : {}),
        })
        .where(eq(companies.id, c.id));
    },
    500,
  );
  console.log(`discovery: ${found} of ${list.length} companies set up`);
  return { checked: list.length, found };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const dry = hasFlag('dry-run');
  if (dry) loadEnv();
  const { db, close } = openDb();
  try {
    await discoverCompanies(db, { only: argValue('company'), dry });
  } finally {
    await close();
  }
}
