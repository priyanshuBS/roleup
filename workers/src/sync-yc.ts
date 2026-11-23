/**
 * Tag companies that went through Y Combinator, using the community-maintained YC OSS dataset.
 * Stores only facts (the `yc` tag and the batch code), never YC's descriptions.
 *
 *   pnpm sync-yc
 */
import { companies, crawlRuns, eq } from '@roleup/db';
import { openDb } from './lib/env';
import { fetchJson } from './lib/http';
import { batchCode, buildYcIndex, matchYc, ycResponseSchema } from './lib/yc';

const YC_URL = 'https://yc-oss.github.io/api/companies/all.json';

const { db, close } = openDb();
try {
  const [run] = await db
    .insert(crawlRuns)
    .values({ worker: 'sync-yc' })
    .returning({ id: crawlRuns.id });
  const list = ycResponseSchema.parse(await fetchJson(YC_URL, { timeoutMs: 60_000 }));
  const index = buildYcIndex(list);
  console.log(`YC dataset: ${list.length} companies`);

  const ours = await db.select().from(companies);
  let tagged = 0;
  let untagged = 0;
  for (const c of ours) {
    const hit = matchYc(index, c);
    const batch = hit ? batchCode(hit.batch) : null;
    const hasTag = c.tags.includes('yc');
    if (hit) {
      if (!hasTag || c.ycBatch !== batch) {
        await db
          .update(companies)
          .set({ tags: [...new Set([...c.tags, 'yc'])], ycBatch: batch })
          .where(eq(companies.id, c.id));
        tagged++;
        console.log(`yc  ${c.slug.padEnd(22)} ${batch ?? '(no batch)'}`);
      }
    } else if (hasTag) {
      await db
        .update(companies)
        .set({ tags: c.tags.filter((t) => t !== 'yc'), ycBatch: null })
        .where(eq(companies.id, c.id));
      untagged++;
    }
  }
  const total = (
    await db.select({ id: companies.id, tags: companies.tags }).from(companies)
  ).filter((c) => c.tags.includes('yc')).length;
  await db
    .update(crawlRuns)
    .set({ finishedAt: new Date(), companiesOk: total, jobsUpdated: tagged })
    .where(eq(crawlRuns.id, run!.id));
  console.log(
    `done: ${tagged} newly tagged/updated, ${untagged} untagged, ${total} YC companies total`,
  );
} finally {
  await close();
}
