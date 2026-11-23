'use client';

import { useMemo, useState } from 'react';

type Row = { day: string; views: number; visitors: number; clicks: number };
type Metric = 'views' | 'visitors' | 'clicks';
const LABEL: Record<Metric, string> = {
  views: 'Page views',
  visitors: 'Visitors',
  clicks: 'Clicks',
};

/** Nice round axis max and 3 gridlines. */
function niceMax(v: number): number {
  if (v <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(v));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * pow * 4 >= v) ?? 10;
  return step * pow * 4;
}

function fmtDay(d: string, withYear = false) {
  return new Date(`${d}T00:00:00Z`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  });
}

/**
 * Single-series daily bar chart (one hue, one axis; the metric switch swaps the series rather
 * than overlaying a second scale). Hover/focus shows the exact value; a table view is provided.
 */
export function DailyChart({ data }: { data: Row[] }) {
  const [metric, setMetric] = useState<Metric>('views');
  const [hover, setHover] = useState<number | null>(null);
  const values = data.map((d) => d[metric]);
  const max = useMemo(() => niceMax(Math.max(0, ...values)), [values]);

  const W = 1000;
  const H = 260;
  const pad = { l: 36, r: 8, t: 12, b: 24 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const slot = iw / data.length;
  const bw = Math.max(2, Math.min(28, slot - 2)); // 2px surface gap between bars
  const y = (v: number) => pad.t + ih - (v / max) * ih;
  const ticks = [0, max / 4, max / 2, (3 * max) / 4, max];
  const labelEvery = Math.ceil(data.length / 8);
  const total = values.reduce((a, b) => a + b, 0);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-md font-semibold">
          {LABEL[metric]} per day{' '}
          <span className="font-normal text-text-subtle tabular-nums">
            · {total.toLocaleString('en-IN')} total
          </span>
        </h2>
        <div
          role="radiogroup"
          aria-label="Metric"
          className="inline-flex rounded-md border border-border-strong p-0.5 text-sm"
        >
          {(Object.keys(LABEL) as Metric[]).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={metric === m}
              onClick={() => setMetric(m)}
              className={`rounded-sm px-2.5 py-1 ${metric === m ? 'bg-accent-subtle text-accent font-medium' : 'text-text-muted hover:text-text'}`}
            >
              {LABEL[m]}
            </button>
          ))}
        </div>
      </div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label={`${LABEL[metric]} per day for the last ${data.length} days`}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={pad.l}
                x2={W - pad.r}
                y1={y(t)}
                y2={y(t)}
                stroke="var(--ru-border)"
                strokeWidth={1}
              />
              <text
                x={pad.l - 6}
                y={y(t)}
                dy="0.32em"
                textAnchor="end"
                fontSize={11}
                fill="var(--ru-text-subtle)"
                className="tabular-nums"
              >
                {t >= 1000 ? `${(t / 1000).toFixed(t % 1000 ? 1 : 0)}k` : Math.round(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const v = d[metric];
            const x = pad.l + i * slot + (slot - bw) / 2;
            const h = Math.max(v > 0 ? 2 : 0, pad.t + ih - y(v));
            const r = Math.min(4, bw / 2, h);
            return (
              <g key={d.day}>
                {/* Hit target: the whole column, bigger than the bar. */}
                <rect
                  x={pad.l + i * slot}
                  y={pad.t}
                  width={slot}
                  height={ih}
                  fill={hover === i ? 'var(--ru-surface-muted)' : 'transparent'}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                />
                {h > 0 && (
                  <path
                    pointerEvents="none"
                    fill="var(--ru-chart)"
                    d={`M${x},${pad.t + ih} V${pad.t + ih - h + r} Q${x},${pad.t + ih - h} ${x + r},${pad.t + ih - h} H${x + bw - r} Q${x + bw},${pad.t + ih - h} ${x + bw},${pad.t + ih - h + r} V${pad.t + ih} Z`}
                  />
                )}
                {i % labelEvery === 0 && (
                  <text
                    x={pad.l + i * slot + slot / 2}
                    y={H - 6}
                    textAnchor="middle"
                    fontSize={11}
                    fill="var(--ru-text-subtle)"
                  >
                    {fmtDay(d.day)}
                  </text>
                )}
              </g>
            );
          })}
          <line
            x1={pad.l}
            x2={W - pad.r}
            y1={pad.t + ih}
            y2={pad.t + ih}
            stroke="var(--ru-border-strong)"
            strokeWidth={1}
          />
        </svg>
        {hover !== null && data[hover] && (
          <div
            role="status"
            className="pointer-events-none absolute top-0 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs shadow-sm"
            style={{
              left: `${((pad.l + hover * slot + slot / 2) / W) * 100}%`,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="text-text-muted">{fmtDay(data[hover].day, true)}</div>
            <div className="font-medium tabular-nums">
              {data[hover][metric].toLocaleString('en-IN')} {LABEL[metric].toLowerCase()}
            </div>
          </div>
        )}
      </div>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-text-muted hover:text-text">Show as table</summary>
        <div className="mt-2 max-h-64 overflow-auto rounded-md border border-border">
          <table className="w-full text-left tabular-nums">
            <thead className="sticky top-0 bg-surface text-xs text-text-subtle">
              <tr>
                <th className="p-2 font-medium">Day</th>
                <th className="p-2 font-medium text-right">Views</th>
                <th className="p-2 font-medium text-right">Visitors</th>
                <th className="p-2 font-medium text-right">Clicks</th>
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map((d) => (
                <tr key={d.day} className="border-t border-border">
                  <td className="p-2">{fmtDay(d.day, true)}</td>
                  <td className="p-2 text-right">{d.views}</td>
                  <td className="p-2 text-right">{d.visitors}</td>
                  <td className="p-2 text-right">{d.clicks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
