/**
 * Verify funding entries and approve the trustworthy ones automatically.
 *
 * For each entry we re-open the source article and check its headline names the company, look
 * for other feeds reporting the same raise, and score it (rules in @roleup/core verify.ts).
 *   - pending, never checked      -> scored; approved if auto-approve is on and score >= threshold
 *   - pending, checked before     -> re-checked once a day (a second source may have appeared)
 *   - approved, last check > 7d   -> re-checked; if the article is gone (404/410) it goes back to
 *                                    the review queue
 * Duplicates (same company, another feed, within 7 days of an approved entry) are rejected with
 * a note, so one raise shows once.
 *
 *   pnpm verify-funding            # also runs at the end of pnpm track-funding
 *   pnpm verify-funding --dry-run  # print scores, no DB writes
 */
import { pathToFileURL } from 'node:url';
import { scoreFunding, shouldAutoApprove } from '@roleup/core';
import {
  and,
  companies,
  eq,
  fundings,
  gte,
  isNull,
  lt,
  ne,
  or,
  readSettings,
  refreshRecentlyFundedTags,
  sql,
  type Db,
} from '@roleup/db';
import { hasFlag, openDb } from './lib/env';
import { mapLimit } from './lib/http';
import { fetchPage } from './lib/page';

const DAY = 86_400_000;
const NEAR_DAYS = 7;

export interface VerifyStats {
  checked: number;
  autoApproved: number;
  requeued: number;
  duplicates: number;
}

export async function verifyFundings(
  db: Db,
  opts: { limit?: number; dry?: boolean } = {},
): Promise<VerifyStats> {
  const settings = await readSettings(db);
  const now = Date.now();
  const rows = await db
    .select({ f: fundings, c: companies })
    .from(fundings)
    .innerJoin(companies, eq(companies.id, fundings.companyId))
    .where(
      or(
        and(
          eq(fundings.status, 'pending'),
          or(isNull(fundings.verifiedAt), lt(fundings.verifiedAt, new Date(now - DAY))),
        ),
        and(
          eq(fundings.status, 'approved'),
          or(isNull(fundings.verifiedAt), lt(fundings.verifiedAt, new Date(now - 7 * DAY))),
          gte(fundings.announcedOn, new Date(now - 180 * DAY).toISOString().slice(0, 10)),
        ),
      ),
    )
    .orderBy(sql`${fundings.verifiedAt} nulls first`, fundings.id)
    .limit(opts.limit ?? 80);

  const stats: VerifyStats = { checked: 0, autoApproved: 0, requeued: 0, duplicates: 0 };
  console.log(`verifying ${rows.length} funding entries`);

  await mapLimit(
    rows,
    3,
    async ({ f, c }) => {
      const near = (d: string) =>
        Math.abs(new Date(d).getTime() - new Date(f.announcedOn).getTime()) <= NEAR_DAYS * DAY;
      const siblings = (
        await db
          .select({
            id: fundings.id,
            status: fundings.status,
            sourceName: fundings.sourceName,
            announcedOn: fundings.announcedOn,
          })
          .from(fundings)
          .where(and(eq(fundings.companyId, f.companyId), ne(fundings.id, f.id)))
      ).filter((s) => near(s.announcedOn) && s.status !== 'rejected');

      // Same raise already approved from another source: this one is a duplicate.
      const approvedTwin = siblings.find((s) => s.status === 'approved');
      if (f.status === 'pending' && approvedTwin) {
        stats.duplicates++;
        if (opts.dry) return;
        await db
          .update(fundings)
          .set({
            status: 'rejected',
            headline: null,
            verifiedAt: new Date(),
            verifyNotes: [`Duplicate of #${approvedTwin.id} (same raise, another source)`],
          })
          .where(eq(fundings.id, f.id));
        return;
      }

      const page = await fetchPage(f.sourceUrl);
      const corroborations = new Set(
        siblings.filter((s) => s.sourceName !== f.sourceName).map((s) => s.sourceName),
      ).size;
      const score = scoreFunding({
        company: c.name,
        round: f.round,
        amount: f.amount,
        source: page && { ok: page.ok, status: page.status, title: page.title },
        corroborations,
        knownCompany: c.ats !== 'none' && c.crawlStatus === 'ok',
      });
      stats.checked++;

      const patch: Partial<typeof fundings.$inferInsert> = {
        confidence: score.score,
        verifyNotes: score.notes,
        verifiedAt: new Date(),
        corroborations,
      };
      const gone = page !== null && !page.ok && (page.status === 404 || page.status === 410);
      if (f.status === 'approved' && gone) {
        patch.status = 'pending';
        patch.autoApproved = false;
        patch.verifyNotes = ['Re-check: the source article is no longer online', ...score.notes];
        stats.requeued++;
        console.log(`requeued #${f.id} ${c.name}: source gone`);
      } else if (
        f.status === 'pending' &&
        settings.fundingAutoApprove &&
        shouldAutoApprove(score, settings.fundingAutoApproveMin)
      ) {
        patch.status = 'approved';
        patch.autoApproved = true;
        patch.headline = null;
        stats.autoApproved++;
        console.log(`auto-approved #${f.id} ${c.name} (${score.score})`);
      } else if (f.status === 'pending') {
        console.log(
          `kept for review #${f.id} ${c.name} (${score.score}${score.blocked ? ', blocked' : ''})`,
        );
      }
      if (opts.dry) {
        console.log(`    ${score.notes.join('\n    ')}`);
        return;
      }
      await db.update(fundings).set(patch).where(eq(fundings.id, f.id));
    },
    400,
  );

  if (!opts.dry && (stats.autoApproved || stats.requeued)) await refreshRecentlyFundedTags(db);
  console.log(
    `verify: ${stats.checked} checked, ${stats.autoApproved} auto-approved, ${stats.requeued} requeued, ${stats.duplicates} duplicates`,
  );
  return stats;
}

// Run directly: pnpm verify-funding
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const { db, close } = openDb();
  try {
    await verifyFundings(db, { dry: hasFlag('dry-run') });
  } finally {
    await close();
  }
}
