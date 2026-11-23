import Link from 'next/link';
import { timeAgo } from '@roleup/core';
import {
  companies,
  count,
  crawlRuns,
  desc,
  eq,
  fundings,
  getDb,
  inArray,
  isNull,
  jobs,
  ne,
} from '@roleup/db';

export default async function AdminOverview() {
  const db = getDb();
  const [runs, [pending], [openJobs], [companyCount], failing] = await Promise.all([
    db.select().from(crawlRuns).orderBy(desc(crawlRuns.startedAt)).limit(20),
    db.select({ n: count() }).from(fundings).where(eq(fundings.status, 'pending')),
    db.select({ n: count() }).from(jobs).where(isNull(jobs.closedAt)),
    db.select({ n: count() }).from(companies).where(ne(companies.ats, 'none')),
    db
      .select({
        slug: companies.slug,
        name: companies.name,
        status: companies.crawlStatus,
        error: companies.crawlError,
        at: companies.lastCrawledAt,
      })
      .from(companies)
      .where(inArray(companies.crawlStatus, ['error', 'invalid_slug']))
      .orderBy(companies.name),
  ]);
  const now = new Date();

  return (
    <div className="space-y-8">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-4">
        {[
          ['Open jobs', openJobs?.n ?? 0],
          ['Companies with ATS', companyCount?.n ?? 0],
          ['Funding pending review', pending?.n ?? 0],
          ['Companies failing', failing.length],
        ].map(([k, v]) => (
          <div key={k} className="bg-surface p-3">
            <dt className="text-xs text-text-subtle">{k}</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums">
              {Number(v).toLocaleString('en-IN')}
            </dd>
          </div>
        ))}
      </dl>
      {(pending?.n ?? 0) > 0 && (
        <p>
          <Link href="/admin/funding" className="link">
            Review {pending?.n} pending funding entries
          </Link>
        </p>
      )}

      <section>
        <h2 className="mb-2 text-md font-semibold">Recent worker runs</h2>
        <div className="overflow-x-auto rounded-md border border-border bg-surface">
          <table className="w-full text-sm tabular-nums">
            <thead className="text-left text-xs text-text-subtle">
              <tr className="border-b border-border">
                <th className="p-2 font-medium">Worker</th>
                <th className="p-2 font-medium">Started</th>
                <th className="p-2 font-medium">Duration</th>
                <th className="p-2 font-medium">OK / failed</th>
                <th className="p-2 font-medium">Added / updated / closed</th>
                <th className="p-2 font-medium">Errors</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 align-top">
                  <td className="p-2">{r.worker}</td>
                  <td className="p-2 whitespace-nowrap">{timeAgo(r.startedAt, now)}</td>
                  <td className="p-2">
                    {r.finishedAt
                      ? `${Math.round((r.finishedAt.getTime() - r.startedAt.getTime()) / 1000)}s`
                      : 'running / crashed'}
                  </td>
                  <td className="p-2">
                    {r.companiesOk} / {r.companiesFailed}
                  </td>
                  <td className="p-2">
                    {r.jobsAdded} / {r.jobsUpdated} / {r.jobsClosed}
                  </td>
                  <td className="p-2 text-xs text-text-muted">
                    {r.errors.length === 0
                      ? '—'
                      : r.errors.slice(0, 5).map((e, i) => (
                          <div key={i}>
                            {e.company && <strong>{e.company}: </strong>}
                            {e.message}
                          </div>
                        ))}
                    {r.errors.length > 5 && <div>…and {r.errors.length - 5} more</div>}
                  </td>
                </tr>
              ))}
              {runs.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-text-muted">
                    No runs yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-md font-semibold">Companies with crawl problems</h2>
        {failing.length === 0 ? (
          <p className="text-sm text-text-muted">None.</p>
        ) : (
          <ul className="rounded-md border border-border bg-surface text-sm">
            {failing.map((c) => (
              <li key={c.slug} className="border-b border-border p-2 last:border-0">
                <Link href={`/admin/companies?edit=${c.slug}`} className="link">
                  {c.name}
                </Link>{' '}
                <span className="tag tag-danger">{c.status}</span>{' '}
                <span className="text-text-muted">{c.error}</span>
                {c.at && <span className="text-text-subtle"> · {timeAgo(c.at, now)}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
