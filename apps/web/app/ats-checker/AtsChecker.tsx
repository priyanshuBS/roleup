'use client';

import {
  CircleCheck,
  CircleX,
  CloudUpload,
  FileText,
  ListChecks,
  LoaderCircle,
  Search,
  Sparkles,
  Tags,
  Target,
  TriangleAlert,
  Wrench,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { AtsReport, CheckResult } from '@roleup/core/ats-checker';
import type { JobListItem, Paginated } from '@roleup/core';

type JobRef = { slug: string; title: string; company: string };

const ACCEPT =
  '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const STATUS_ICON = {
  pass: <CircleCheck size={18} className="shrink-0 text-success" aria-label="Pass" />,
  warn: <TriangleAlert size={18} className="shrink-0 text-warning" aria-label="Warning" />,
  fail: <CircleX size={18} className="shrink-0 text-danger" aria-label="Fail" />,
};

type Tone = 'success' | 'warning' | 'danger';
function tone(pct: number): Tone {
  return pct >= 85 ? 'success' : pct >= 50 ? 'warning' : 'danger';
}
// Literal class names so Tailwind's scanner picks them up.
const TONE_TEXT: Record<Tone, string> = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
};
const TONE_BG: Record<Tone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
};

function JobPicker({ onPick }: { onPick: (j: JobRef) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<JobRef[]>([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (q.trim().length < 2) return;
    const ctl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/v1/jobs?limit=6&q=${encodeURIComponent(q.trim())}`, { signal: ctl.signal })
        .then((r) => r.json() as Promise<Paginated<JobListItem>>)
        .then((d) =>
          setResults(
            d.items.map((j) => ({ slug: j.slug, title: j.title, company: j.company.name })),
          ),
        )
        .catch(() => undefined);
    }, 250);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [q]);
  const shown = !open || q.trim().length < 2 ? [] : results;
  return (
    <div
      className="relative"
      onBlur={(e) => {
        // Close when focus leaves the picker entirely (not when moving into the results).
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setOpen(false);
      }}
    >
      <label htmlFor="job-search" className="field-label">
        <Search size={13} aria-hidden className="text-text-subtle" />
        Or pick a job on RoleUp
      </label>
      <input
        id="job-search"
        type="search"
        className="field"
        placeholder="Search job title or company"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={shown.length > 0}
        aria-controls="job-search-results"
      />
      {shown.length > 0 && (
        <ul
          id="job-search-results"
          className="card absolute inset-x-0 top-full z-20 mt-1.5 overflow-hidden p-1 text-sm shadow-[var(--shadow-lg)]"
        >
          {shown.map((j) => (
            <li key={j.slug}>
              <button
                type="button"
                className="w-full rounded-sm px-3 py-2 text-left transition-colors hover:bg-surface-muted"
                onClick={() => {
                  onPick(j);
                  setQ('');
                  setOpen(false);
                }}
              >
                <span className="font-medium">{j.title}</span>{' '}
                <span className="text-text-muted">· {j.company}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CheckRow({ c }: { c: CheckResult }) {
  return (
    <li className="flex gap-3 border-b border-border px-4 py-3.5 last:border-0">
      <span className="mt-0.5">{STATUS_ICON[c.status]}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-semibold">{c.title}</span>
          <span className="num shrink-0 text-xs text-text-subtle">
            {c.points}/{c.maxPoints}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-text-muted">{c.detail}</p>
        {c.fix && (
          <p className="mt-2 flex gap-1.5 rounded-sm bg-surface-muted px-2.5 py-1.5 text-sm">
            <Wrench size={14} aria-hidden className="mt-0.5 shrink-0 text-accent" />
            {c.fix}
          </p>
        )}
      </div>
    </li>
  );
}

/** Circular score gauge. */
function ScoreRing({ score }: { score: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const t = tone(score);
  return (
    <div className="relative h-36 w-36 shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden>
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="var(--ru-surface-muted)"
          strokeWidth="10"
        />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={`var(--ru-${t})`}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
          style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.2, 0.7, 0.2, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span id="result" className={`display num text-[2.5rem] leading-none ${TONE_TEXT[t]}`}>
          {score}
        </span>
        <span className="mt-1 text-xs text-text-subtle">out of 100</span>
      </div>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: typeof Target;
  children: React.ReactNode;
}) {
  return (
    <h2 className="display mb-3 flex items-center gap-2.5 text-xl">
      <span className="icon-tile !h-8 !w-8 !rounded-sm">
        <Icon size={16} aria-hidden />
      </span>
      {children}
    </h2>
  );
}

function Report({ r }: { r: AtsReport }) {
  return (
    <section aria-labelledby="result" className="animate-fade-up mt-10 space-y-10">
      <div className="card relative flex flex-col items-center gap-6 overflow-hidden p-6 text-center sm:flex-row sm:p-8 sm:text-left">
        <div
          aria-hidden
          className="bg-dots mask-radial pointer-events-none absolute inset-0 opacity-50"
        />
        <div className="relative">
          <ScoreRing score={r.score} />
        </div>
        <div className="relative min-w-0 flex-1">
          <p className="eyebrow">ATS score</p>
          <p className="display mt-1.5 text-2xl">{r.verdict}</p>
          <ul className="mt-4 flex flex-wrap justify-center gap-1.5 sm:justify-start">
            <li className="tag">
              <span className="num">{r.stats.words.toLocaleString('en-IN')}</span> words
            </li>
            <li className="tag">
              <span className="num">{r.stats.estimatedPages}</span> page
              {r.stats.estimatedPages === 1 ? '' : 's'}
            </li>
            <li className="tag">
              <span className="num">{r.stats.bullets}</span> bullets
            </li>
            {r.stats.yearsOfExperience !== null && (
              <li className="tag">
                ~<span className="num">{r.stats.yearsOfExperience}</span> yrs dated experience
              </li>
            )}
          </ul>
        </div>
      </div>

      <div>
        <SectionTitle icon={Target}>Breakdown</SectionTitle>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {r.categories.map((c) => {
            const p = c.maxPoints ? Math.round((c.points / c.maxPoints) * 100) : 0;
            return (
              <li key={c.category} className="card p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium">{c.label}</span>
                  <span className="num text-xs text-text-muted">
                    {c.points}/{c.maxPoints}
                  </span>
                </div>
                <p className={`display num mt-2 text-2xl leading-none ${TONE_TEXT[tone(p)]}`}>
                  {p}%
                </p>
                <div className="mt-3 h-2 rounded-full bg-surface-muted" role="presentation">
                  <div
                    className={`h-2 rounded-full ${TONE_BG[tone(p)]}`}
                    style={{ width: `${p}%`, transition: 'width 0.8s ease' }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {r.fixFirst.length > 0 && (
        <div>
          <SectionTitle icon={Wrench}>Fix these first</SectionTitle>
          <ol className="card overflow-hidden">
            {r.fixFirst.map((c) => (
              <CheckRow key={c.id} c={c} />
            ))}
          </ol>
        </div>
      )}

      {r.keywords && (
        <div>
          <SectionTitle icon={Tags}>
            Keyword match{r.keywords.jobTitle ? `: ${r.keywords.jobTitle}` : ''}
          </SectionTitle>
          {r.keywords.matched.length + r.keywords.missing.length === 0 ? (
            <p className="text-sm text-text-muted">
              We couldn&apos;t find recognisable tech skills in that job description.
            </p>
          ) : (
            <div className="card space-y-4 p-5">
              <div>
                <div className="mb-1.5 flex items-baseline justify-between text-sm">
                  <span className="text-text-muted">Skills from the job found in your resume</span>
                  <span className="num font-semibold">{r.keywords.matchPercent}%</span>
                </div>
                <div className="h-2 rounded-full bg-surface-muted" role="presentation">
                  <div
                    className={`h-2 rounded-full ${TONE_BG[tone(r.keywords.matchPercent)]}`}
                    style={{ width: `${r.keywords.matchPercent}%` }}
                  />
                </div>
              </div>
              <div>
                <p className="field-label">
                  <CircleCheck size={13} aria-hidden className="text-success" /> Matched
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {r.keywords.matched.map((k) => (
                    <span key={k} className="tag tag-success">
                      {k}
                    </span>
                  ))}
                  {r.keywords.matched.length === 0 && (
                    <span className="text-sm text-text-subtle">None</span>
                  )}
                </div>
              </div>
              <div>
                <p className="field-label">
                  <CircleX size={13} aria-hidden className="text-danger" /> Missing
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {r.keywords.missing.map((k) => (
                    <span key={k} className="tag tag-danger">
                      {k}
                    </span>
                  ))}
                  {r.keywords.missing.length === 0 && (
                    <span className="text-sm text-text-subtle">None</span>
                  )}
                </div>
              </div>
              {r.keywords.missing.length > 0 && (
                <p className="text-sm text-text-muted">
                  Add missing skills only if you genuinely have them, ideally inside a bullet that
                  shows how you used them.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <div>
        <SectionTitle icon={ListChecks}>All checks</SectionTitle>
        <ul className="card overflow-hidden">
          {r.checks.map((c) => (
            <CheckRow key={c.id} c={c} />
          ))}
        </ul>
      </div>
    </section>
  );
}

export function AtsChecker({ initialJob }: { initialJob: JobRef | null }) {
  const [file, setFile] = useState<File | null>(null);
  const [jd, setJd] = useState('');
  const [job, setJob] = useState<JobRef | null>(initialJob);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<AtsReport | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const pick = (f: File | null) => {
    setFile(f);
    setReport(null);
    setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return setError('Choose a PDF or DOCX file first.');
    if (file.size > 5 * 1024 * 1024) return setError('The file is larger than 5 MB.');
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.append('file', file);
    if (job) fd.append('job', job.slug);
    else if (jd.trim()) fd.append('jd', jd.trim());
    try {
      const res = await fetch('/api/v1/ats-check', { method: 'POST', body: fd });
      const data = (await res.json()) as AtsReport | { error: { message: string } };
      if (!res.ok || 'error' in data)
        throw new Error('error' in data ? data.error.message : 'Check failed');
      setReport(data);
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ block: 'start' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check failed. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <form onSubmit={submit} className="card mt-6 space-y-6 p-5 sm:p-7">
        <div>
          <span className="field-label">
            <FileText size={13} aria-hidden className="text-text-subtle" />
            Resume (PDF or DOCX, up to 5 MB)
          </span>
          <label
            htmlFor="resume"
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              const f = e.dataTransfer.files?.[0];
              if (f) pick(f);
            }}
            className={`group relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
              drag
                ? 'border-accent bg-accent-subtle'
                : file
                  ? 'border-success/40 bg-success-subtle/50'
                  : 'border-border-strong bg-surface-muted/50 hover:border-accent/60 hover:bg-accent-subtle/40'
            }`}
          >
            <span
              className={`icon-tile icon-tile-lg transition-transform group-hover:-translate-y-0.5 ${file ? '!bg-success-subtle !text-success' : ''}`}
            >
              {file ? <FileText size={22} aria-hidden /> : <CloudUpload size={22} aria-hidden />}
            </span>
            {file ? (
              <>
                <span className="font-semibold">{file.name}</span>
                <span className="num text-xs text-text-muted">
                  {(file.size / 1024).toFixed(0)} KB · click or drop to replace
                </span>
              </>
            ) : (
              <>
                <span className="font-semibold">
                  Drop your resume here, or <span className="text-accent">browse</span>
                </span>
                <span className="text-xs text-text-muted">
                  PDF or DOCX · read in memory, never stored
                </span>
              </>
            )}
            <input
              id="resume"
              type="file"
              accept={ACCEPT}
              onChange={(e) => pick(e.target.files?.[0] ?? null)}
              className="sr-only"
            />
          </label>
        </div>

        <fieldset className="space-y-4">
          <legend className="field-label">
            <Target size={13} aria-hidden className="text-text-subtle" />
            Compare against a job (optional)
          </legend>
          {job ? (
            <div className="flex items-center justify-between gap-3 rounded-md border border-accent/30 bg-accent-subtle px-4 py-3 text-sm">
              <span>
                Comparing with <strong>{job.title}</strong> at {job.company}
              </span>
              <button
                type="button"
                onClick={() => setJob(null)}
                className="btn btn-ghost btn-sm btn-icon"
                aria-label="Remove selected job"
              >
                <X size={15} aria-hidden />
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="jd" className="field-label">
                  Paste a job description
                </label>
                <textarea
                  id="jd"
                  rows={5}
                  className="field"
                  maxLength={20000}
                  value={jd}
                  onChange={(e) => setJd(e.target.value)}
                  placeholder="Paste the requirements section here"
                />
              </div>
              <JobPicker onPick={(j) => setJob(j)} />
            </div>
          )}
        </fieldset>

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
          <button type="submit" className="btn btn-primary btn-lg" disabled={busy || !file}>
            {busy ? (
              <LoaderCircle size={17} aria-hidden className="animate-spin" />
            ) : (
              <Sparkles size={17} aria-hidden />
            )}
            {busy ? 'Checking…' : 'Check my resume'}
          </button>
          {error && (
            <p role="alert" className="flex items-center gap-1.5 text-sm text-danger">
              <CircleX size={15} aria-hidden /> {error}
            </p>
          )}
        </div>
      </form>
      <div ref={resultRef} aria-live="polite" className="scroll-mt-24">
        {report && <Report r={report} />}
      </div>
    </>
  );
}
