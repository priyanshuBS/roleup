import Link from 'next/link';
import { analyticsSummary, getDb } from '@roleup/db';
import { DailyChart } from './DailyChart';

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
    <section className="rounded-md border border-border bg-surface">
      <h2 className="border-b border-border px-3 py-2 text-sm font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="px-3 py-4 text-sm text-text-muted">{empty}</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-text-subtle">
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
  const { range } = await searchParams;
  const days = RANGES.includes(Number(range) as (typeof RANGES)[number]) ? Number(range) : 30;
  const s = await analyticsSummary(getDb(), days);
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
      label: 'Apply rate',
      value: pct(t.applyClicks, t.jobViews),
      note: `of ${n(t.jobViews)} job page views`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Analytics</h1>
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
        <nav
          aria-label="Date range"
          className="inline-flex rounded-md border border-border-strong p-0.5 text-sm"
        >
          {RANGES.map((r) => (
            <Link
              key={r}
              href={`/admin/analytics?range=${r}`}
              aria-current={r === days ? 'page' : undefined}
              className={`rounded-sm px-3 py-1 ${r === days ? 'bg-accent-subtle font-medium text-accent' : 'text-text-muted hover:text-text'}`}
            >
              {r} days
            </Link>
          ))}
        </nav>
      </div>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((x) => (
          <div key={x.label} className="bg-surface p-3">
            <dt className="text-xs text-text-subtle">{x.label}</dt>
            <dd className="mt-0.5 text-xl font-semibold tabular-nums">{x.value}</dd>
            <dd className="mt-0.5 min-h-4">
              {x.delta ?? <span className="text-xs text-text-subtle">{x.note}</span>}
            </dd>
          </div>
        ))}
      </dl>

      <section className="rounded-md border border-border bg-surface p-4">
        <DailyChart data={s.daily} />
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
