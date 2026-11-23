'use client';

import { AlertTriangle, CheckCircle2, FileText, X, XCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { AtsReport, CheckResult } from '@roleup/core/ats-checker';
import type { JobListItem, Paginated } from '@roleup/core';

type JobRef = { slug: string; title: string; company: string };

const STATUS_ICON = {
  pass: <CheckCircle2 size={16} className="text-success shrink-0" aria-label="Pass" />,
  warn: <AlertTriangle size={16} className="text-warning shrink-0" aria-label="Warning" />,
  fail: <XCircle size={16} className="text-danger shrink-0" aria-label="Fail" />,
};

function JobPicker({ onPick }: { onPick: (j: JobRef) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<JobRef[]>([]);
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
  const shown = q.trim().length < 2 ? [] : results;
  return (
    <div>
      <label htmlFor="job-search" className="mb-1 block text-xs font-medium text-text-muted">
        Or pick a job on RoleUp
      </label>
      <input
        id="job-search"
        type="search"
        className="field"
        placeholder="Search job title or company"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoComplete="off"
      />
      {shown.length > 0 && (
        <ul className="mt-1 rounded-md border border-border bg-surface text-sm">
          {shown.map((j) => (
            <li key={j.slug}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-surface-muted"
                onClick={() => {
                  onPick(j);
                  setQ('');
                }}
              >
                {j.title} <span className="text-text-muted">· {j.company}</span>
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
    <li className="flex gap-3 border-b border-border px-3 py-2.5 last:border-0">
      <span className="mt-0.5">{STATUS_ICON[c.status]}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-medium">{c.title}</span>
          <span className="shrink-0 text-xs text-text-subtle tabular-nums">
            {c.points}/{c.maxPoints}
          </span>
        </div>
        <p className="text-sm text-text-muted">{c.detail}</p>
        {c.fix && <p className="mt-1 text-sm">{c.fix}</p>}
      </div>
    </li>
  );
}

function Report({ r }: { r: AtsReport }) {
  const tone = r.score >= 85 ? 'text-success' : r.score >= 50 ? 'text-warning' : 'text-danger';
  return (
    <section aria-labelledby="result" className="mt-8 space-y-6">
      <div className="flex flex-wrap items-center gap-5 rounded-md border border-border bg-surface p-4">
        <div className="text-center">
          <div className={`text-2xl font-semibold tabular-nums ${tone}`} id="result">
            {r.score}
            <span className="text-md text-text-subtle">/100</span>
          </div>
          <div className="text-xs text-text-subtle">ATS score</div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{r.verdict}</p>
          <p className="mt-0.5 text-sm text-text-muted tabular-nums">
            {r.stats.words.toLocaleString('en-IN')} words · {r.stats.estimatedPages} page
            {r.stats.estimatedPages === 1 ? '' : 's'} · {r.stats.bullets} bullets
            {r.stats.yearsOfExperience !== null
              ? ` · ~${r.stats.yearsOfExperience} yrs dated experience`
              : ''}
          </p>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-md font-semibold">Breakdown</h2>
        <ul className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-3">
          {r.categories.map((c) => {
            const p = c.maxPoints ? Math.round((c.points / c.maxPoints) * 100) : 0;
            return (
              <li key={c.category} className="text-sm">
                <div className="flex justify-between">
                  <span>{c.label}</span>
                  <span className="tabular-nums text-text-muted">
                    {c.points}/{c.maxPoints}
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-surface-muted" role="presentation">
                  <div
                    className={`h-1.5 rounded-full ${p >= 80 ? 'bg-success' : p >= 50 ? 'bg-warning' : 'bg-danger'}`}
                    style={{ width: `${p}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {r.fixFirst.length > 0 && (
        <div>
          <h2 className="mb-2 text-md font-semibold">Fix these first</h2>
          <ol className="rounded-md border border-border bg-surface">
            {r.fixFirst.map((c) => (
              <CheckRow key={c.id} c={c} />
            ))}
          </ol>
        </div>
      )}

      {r.keywords && (
        <div>
          <h2 className="mb-1 text-md font-semibold">
            Keyword match{r.keywords.jobTitle ? `: ${r.keywords.jobTitle}` : ''}
          </h2>
          {r.keywords.matched.length + r.keywords.missing.length === 0 ? (
            <p className="text-sm text-text-muted">
              We couldn&apos;t find recognisable tech skills in that job description.
            </p>
          ) : (
            <>
              <p className="mb-2 text-sm text-text-muted tabular-nums">
                {r.keywords.matchPercent}% of the skills in the job description appear in your
                resume.
              </p>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="mr-2 text-xs font-medium text-text-muted">Matched</span>
                  {r.keywords.matched.map((k) => (
                    <span key={k} className="tag tag-success mr-1 mb-1">
                      {k}
                    </span>
                  ))}
                  {r.keywords.matched.length === 0 && (
                    <span className="text-text-subtle">None</span>
                  )}
                </div>
                <div>
                  <span className="mr-2 text-xs font-medium text-text-muted">Missing</span>
                  {r.keywords.missing.map((k) => (
                    <span key={k} className="tag tag-danger mr-1 mb-1">
                      {k}
                    </span>
                  ))}
                  {r.keywords.missing.length === 0 && (
                    <span className="text-text-subtle">None</span>
                  )}
                </div>
                {r.keywords.missing.length > 0 && (
                  <p className="text-text-muted">
                    Add missing skills only if you genuinely have them, ideally inside a bullet that
                    shows how you used them.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}

      <div>
        <h2 className="mb-2 text-md font-semibold">All checks</h2>
        <ul className="rounded-md border border-border bg-surface">
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
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<AtsReport | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

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
      <form
        onSubmit={submit}
        className="mt-5 space-y-4 rounded-md border border-border bg-surface p-4"
      >
        <div>
          <label htmlFor="resume" className="mb-1 block text-xs font-medium text-text-muted">
            Resume (PDF or DOCX, up to 5 MB)
          </label>
          <input
            id="resume"
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setReport(null);
            }}
            className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-border-strong file:bg-surface file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-surface-muted"
          />
          {file && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-text-muted">
              <FileText size={12} aria-hidden /> {file.name} · {(file.size / 1024).toFixed(0)} KB
            </p>
          )}
        </div>

        <fieldset className="space-y-3">
          <legend className="text-xs font-medium text-text-muted">
            Compare against a job (optional)
          </legend>
          {job ? (
            <div className="flex items-center justify-between gap-3 rounded-md border border-accent/40 bg-accent-subtle px-3 py-2 text-sm">
              <span>
                Comparing with <strong>{job.title}</strong> at {job.company}
              </span>
              <button
                type="button"
                onClick={() => setJob(null)}
                className="p-1 text-text-muted hover:text-text"
                aria-label="Remove selected job"
              >
                <X size={14} aria-hidden />
              </button>
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="jd" className="mb-1 block text-xs font-medium text-text-muted">
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
            </>
          )}
        </fieldset>

        <div className="flex items-center gap-3">
          <button type="submit" className="btn btn-primary" disabled={busy || !file}>
            {busy ? 'Checking…' : 'Check my resume'}
          </button>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
        </div>
      </form>
      <div ref={resultRef} aria-live="polite">
        {report && <Report r={report} />}
      </div>
    </>
  );
}
