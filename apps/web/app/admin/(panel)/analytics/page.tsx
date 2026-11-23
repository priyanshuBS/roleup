import Link from 'next/link';
import { analyticsInsights, analyticsSummary, getDb } from '@roleup/db';
import { DailyChart } from './DailyChart';
import { requireAdmin } from '@/lib/admin-auth';

type Props = { searchParams: Promise<{ range?: string }> };

const RANGES = [7, 30, 90] as const;

function Delta({ cur, prev }: { cur: number; prev: number }) {
  if (prev === 0) return <span className="text-xs text-text-subtle">{cur > 0 ? 'new' : '—'}</span>;
  const pct = Math.round(((cur - prev) / prev) * 100);
  const up = pct >= 0;
  return (
    <span className={`text-xs tabular-nums ${up ? 'text-success' : 'text-danger'}`}>
      {up ? '▲' : '▼'} {Math.abs(pct)}% <span className="text-text-subtle">vs previous</span>
    </span>
  );
}

function Table({
  title,
  cols,
  rows,
  empty = 'No data yet.',
}: {
  title: string;
  cols: string[];
  rows: (string | number | React.ReactNode)[][];
  empty?: string;
}) {
  return (
    <section className="card overflow-hidden">
      <h2 className="border-b border-border px-4 py-3 text-sm font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="px-3 py-4 text-sm text-text-muted">{empty}</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-surface-muted/60 text-left text-xs text-text-subtle">
            <tr>
              {cols.map((c, i) => (
                <th key={c} className={`px-3 py-1.5 font-medium ${i > 0 ? 'text-right' : ''}`}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-border align-top">
                {r.map((cell, j) => (
                  <td
                    key={j}
                    className={`px-3 py-1.5 ${j > 0 ? 'text-right tabular-nums text-text-muted' : 'max-w-0 w-full truncate'}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

const pct = (n: number, d: number) => (d > 0 ? `${((n / d) * 100).toFixed(1)}%` : '—');
const n = (v: number) => v.toLocaleString('en-IN');

function describeTarget(t: string): string {
  if (t.startsWith('out:')) return `Outbound → ${t.slice(4)}`;
  if (t.startsWith('button:')) return `Button: ${t.slice(7)}`;
  return t;
}

export default async function AnalyticsPage({ searchParams }: Props) {
  await requireAdmin();
  const { range } = await searchParams;
  const days = RANGES.includes(Number(range) as (typeof RANGES)[number]) ? Number(range) : 30;
  const db = getDb();
  const [s, ins] = await Promise.all([analyticsSummary(db, days), analyticsInsights(db, days)]);
  const peakHour = Math.max(1, ...ins.hours);
  const sectionTotal = ins.sections.reduce((a, r) => a + r.views, 0);
  const t = s.totals;
  const p = s.previous;
  const deviceTotal = s.devices.reduce((a, d) => a + d.views, 0);

  const tiles: { label: string; value: string; delta?: React.ReactNode; note?: string }[] = [
    { label: 'Page views', value: n(t.views), delta: <Delta cur={t.views} prev={p.views} /> },
    {
      label: 'Visitors',
      value: n(t.visitors),
      delta: <Delta cur={t.visitors} prev={p.visitors} />,
      note: 'unique per day',
    },
    { label: 'Clicks', value: n(t.clicks), delta: <Delta cur={t.clicks} prev={p.clicks} /> },
    {
      label: 'Apply clicks',
      value: n(t.applyClicks),
      delta: <Delta cur={t.applyClicks} prev={p.applyClicks} />,
    },
    {
      label: 'App downloads',
      value: n(ins.appDownloads),
      note: 'Download APK clicks',
    },
    {
      label: 'Apply rate',
      value: pct(t.applyClicks, t.jobViews),
      note: `of ${n(t.jobViews)} job page views`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span
                className={`inline-block h-2 w-2 rounded-full ${s.activeNow > 0 ? 'bg-success' : 'bg-border-strong'}`}
                aria-hidden
              />
              {n(s.activeNow)} {s.activeNow === 1 ? 'visitor' : 'visitors'} in the last 30 minutes
            </span>
            <span className="text-text-subtle">
              {' '}
              · days in IST · bots, admin pages and Do-Not-Track visitors are excluded
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href={`/admin/export?range=${days}`} className="btn btn-sm btn-ghost" download>
            Export CSV
          </a>
          <nav
            aria-label="Date range"
            className="inline-flex rounded-full border border-border bg-surface p-1 text-sm"
          >
            {RANGES.map((r) => (
              <Link
                key={r}
                href={`/admin/analytics?range=${r}`}
                aria-current={r === days ? 'page' : undefined}
                className={`rounded-full px-3 py-1 ${r === days ? 'bg-text font-medium text-bg' : 'text-text-muted hover:text-text'}`}
              >
                {r} days
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((x) => (
          <div key={x.label} className="card p-4">
            <dt className="text-xs text-text-subtle">{x.label}</dt>
            <dd className="display num mt-1 text-2xl">{x.value}</dd>
            <dd className="mt-0.5 min-h-4">
              {x.delta ?? <span className="text-xs text-text-subtle">{x.note}</span>}
            </dd>
          </div>
        ))}
      </dl>

      <section className="card p-5">
        <DailyChart data={s.daily} />
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-sm font-semibold">Visitor funnel</h2>
          <p className="mt-0.5 text-xs text-text-subtle">Each visitor counted once per day</p>
          <ol className="mt-4 space-y-3">
            {[
              { label: 'Visited the site', v: ins.funnel.visited },
              { label: 'Opened a job', v: ins.funnel.viewedJob },
              { label: 'Clicked Apply', v: ins.funnel.applied },
            ].map((step, i, all) => {
              const w = ins.funnel.visited ? (step.v / ins.funnel.visited) * 100 : 0;
              const prevV = i > 0 ? all[i - 1]!.v : null;
              return (
                <li key={step.label}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span>{step.label}</span>
                    <span className="num text-text-muted">
                      {n(step.v)}
                      {prevV !== null && (
                        <span className="ml-2 text-xs text-text-subtle">
                          {pct(step.v, prevV)} of previous
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-surface-muted">
                    <div
                      className="h-2 rounded-full bg-accent"
                      style={{ width: `${Math.max(w, step.v ? 1 : 0)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
        <section className="card p-5">
          <h2 className="text-sm font-semibold">Traffic by hour (IST)</h2>
          <p className="mt-0.5 text-xs text-text-subtle">Page views in each hour of the day</p>
          <div
            className="mt-4 flex h-28 items-end gap-[3px]"
            role="img"
            aria-label="Page views by hour of day"
          >
            {ins.hours.map((v, h) => (
              <div key={h} className="flex h-full flex-1 items-end">
                <div
                  className="w-full rounded-t-[3px] bg-accent/70 hover:bg-accent"
                  style={{ height: `${(v / peakHour) * 100}%`, minHeight: v ? 2 : 0 }}
                  title={`${String(h).padStart(2, '0')}:00 · ${n(v)} views`}
                />
              </div>
            ))}
          </div>
          <div className="num mt-1.5 flex justify-between text-[10px] text-text-subtle">
            <span>00</span>
            <span>06</span>
            <span>12</span>
            <span>18</span>
            <span>23</span>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Table
          title="Top searches"
          cols={['Search', 'Searches', 'Visitors']}
          empty="No searches yet."
          rows={ins.searches.map((r) => [
            <a
              key={r.query}
              href={`/?q=${encodeURIComponent(r.query)}`}
              target="_blank"
              rel="noreferrer"
              className="hover:underline"
            >
              {r.query}
            </a>,
            n(r.searches),
            n(r.visitors),
          ])}
        />
        <Table
          title="Landing pages"
          cols={['First page of a visit', 'Visits']}
          rows={ins.landing.map((r) => [r.path, n(r.visits)])}
        />
        <Table
          title="Sections"
          cols={['Section', 'Views', 'Share']}
          rows={ins.sections.map((r) => [r.section, n(r.views), pct(r.views, sectionTotal)])}
        />
        <Table
          title="Most-viewed companies"
          cols={['Company', 'Views']}
          empty="No company or job views yet."
          rows={ins.companies.map((r) => [
            <a
              key={r.slug}
              href={`/companies/${r.slug}`}
              target="_blank"
              rel="noreferrer"
              className="hover:underline"
            >
              {r.name}
            </a>,
            n(r.views),
          ])}
        />
        <Table
          title="Top pages"
          cols={['Page', 'Views', 'Visitors']}
          rows={s.topPages.map((r) => [
            <a
              key={r.path}
              href={r.path}
              target="_blank"
              rel="noreferrer"
              className="hover:underline"
              title={r.path}
            >
              {r.path}
            </a>,
            n(r.views),
            n(r.visitors),
          ])}
        />
        <Table
          title="Most-applied jobs"
          cols={['Job', 'Apply clicks', 'Apply rate']}
          empty="No apply clicks yet."
          rows={s.topApplies.map((r) => [
            <a
              key={r.slug}
              href={`/jobs/${r.slug}`}
              target="_blank"
              rel="noreferrer"
              className="hover:underline"
              title={r.slug}
            >
              {r.title ? `${r.title} · ${r.company}` : r.slug}
            </a>,
            n(r.clicks),
            pct(r.clicks, r.views),
          ])}
        />
        <Table
          title="Top clicks"
          cols={['Clicked', 'Clicks']}
          rows={s.topClicks.map((r) => [
            <span key={r.target} title={r.label ?? r.target}>
              {describeTarget(r.target)}
              {r.label && !r.target.includes(r.label) ? (
                <span className="text-text-subtle"> · “{r.label}”</span>
              ) : null}
            </span>,
            n(r.clicks),
          ])}
        />
        <Table
          title="Referrers"
          cols={['Site', 'Views']}
          empty="No external referrers yet (direct traffic only)."
          rows={s.referrers.map((r) => [r.host, n(r.views)])}
        />
        <Table
          title="Devices"
          cols={['Device', 'Views', 'Share']}
          rows={s.devices.map((r) => [
            r.device[0]!.toUpperCase() + r.device.slice(1),
            n(r.views),
            pct(r.views, deviceTotal),
          ])}
        />
        <Table
          title="Countries"
          cols={['Country', 'Views']}
          empty="Country is only available when deployed on Vercel."
          rows={s.countries.map((r) => [r.country === '??' ? 'Unknown' : r.country, n(r.views)])}
        />
      </div>
    </div>
  );
}
