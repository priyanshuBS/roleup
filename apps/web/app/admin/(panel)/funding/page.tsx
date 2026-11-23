import Link from 'next/link';
import { FUNDING_ROUNDS, formatInrCompact, formatUsdCompact, timeAgo } from '@roleup/core';
import { companies, desc, eq, fundings, getDb, readSettings } from '@roleup/db';
import { formatDate } from '@/lib/format';
import { ActionForm, Field } from '../../ActionForm';
import {
  addFunding,
  approveVerified,
  reverifyFunding,
  setFundingStatus,
  updateFunding,
} from '../../actions';
import { requireAdmin } from '@/lib/admin-auth';

function RoundSelect({ value }: { value?: string }) {
  return (
    <label className="block">
      <span className="field-label">Round</span>
      <select name="round" defaultValue={value ?? 'Seed'} className="field">
        {FUNDING_ROUNDS.map((r) => (
          <option key={r}>{r}</option>
        ))}
      </select>
    </label>
  );
}

function CurrencySelect({ value }: { value?: string | null }) {
  return (
    <label className="block">
      <span className="field-label">Currency</span>
      <select name="currency" defaultValue={value ?? ''} className="field">
        <option value="">—</option>
        <option>USD</option>
        <option>INR</option>
        <option>EUR</option>
        <option>GBP</option>
      </select>
    </label>
  );
}

function Score({ value, min }: { value: number | null; min: number }) {
  if (value === null) return <span className="tag">Not checked yet</span>;
  const cls = value >= min ? 'tag-success' : value >= min - 20 ? 'tag-warning' : 'tag-danger';
  return (
    <span className={`tag num ${cls}`} title={`Auto-approve needs ${min}`}>
      Score {value}
    </span>
  );
}

function Notes({ notes }: { notes: string[] }) {
  if (notes.length === 0) return null;
  return (
    <ul className="mt-3 grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
      {notes.map((n) => (
        <li
          key={n}
          className={
            n.startsWith('✓')
              ? 'text-success'
              : n.startsWith('✗') || n.startsWith('Re-check')
                ? 'text-danger'
                : 'text-text-muted'
          }
        >
          {n}
        </li>
      ))}
    </ul>
  );
}

export default async function AdminFundingPage() {
  await requireAdmin();
  const db = getDb();
  const [rows, settings] = await Promise.all([
    db
      .select({
        f: fundings,
        companyName: companies.name,
        companySlug: companies.slug,
        openJobs: companies.openJobsCount,
        ats: companies.ats,
      })
      .from(fundings)
      .innerJoin(companies, eq(companies.id, fundings.companyId))
      .orderBy(desc(fundings.createdAt))
      .limit(300),
    readSettings(db),
  ]);
  const min = settings.fundingAutoApproveMin;
  const pending = rows
    .filter((r) => r.f.status === 'pending')
    .sort((a, b) => (b.f.confidence ?? -1) - (a.f.confidence ?? -1));
  const reviewed = rows.filter((r) => r.f.status !== 'pending').slice(0, 60);
  const readyCount = pending.filter(
    (r) => (r.f.confidence ?? 0) >= min && !r.f.verifyNotes.some((n) => n.startsWith('✗')),
  ).length;
  const now = new Date();

  return (
    <div className="space-y-12">
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Funding queue</h1>
            <p className="mt-1 max-w-2xl text-sm text-text-muted">
              News items are verified automatically every day.{' '}
              {settings.fundingAutoApprove ? (
                <>
                  Auto-approve is <strong className="text-success">on</strong> at score {min}, so
                  only items that need a person are left here.
                </>
              ) : (
                <>
                  Auto-approve is <strong>off</strong>; every item waits for you.
                </>
              )}{' '}
              <Link href="/admin/settings" className="link">
                Change
              </Link>
            </p>
          </div>
          {readyCount > 0 && (
            <form action={approveVerified}>
              <button className="btn btn-primary">Approve {readyCount} verified</button>
            </form>
          )}
        </div>

        {pending.length === 0 ? (
          <p className="mt-6 rounded-[var(--radius-md)] border border-dashed border-border p-6 text-center text-sm text-text-muted">
            Nothing waiting for review.
          </p>
        ) : (
          <ul className="mt-6 space-y-4">
            {pending.map(({ f, companyName, companySlug, openJobs, ats }) => (
              <li
                key={f.id}
                className="rounded-[var(--radius-lg)] border border-border bg-surface p-5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Score value={f.confidence} min={min} />
                  {f.corroborations > 0 && (
                    <span className="tag tag-accent">+{f.corroborations} source</span>
                  )}
                  <span className="text-xs text-text-subtle">
                    {f.sourceName} · {formatDate(f.announcedOn)}
                    {f.verifiedAt ? ` · checked ${timeAgo(f.verifiedAt, now)}` : ''}
                  </span>
                  <span className="ml-auto text-xs text-text-subtle">
                    <Link href={`/admin/companies?edit=${companySlug}`} className="link">
                      {companyName}
                    </Link>{' '}
                    · {ats === 'none' ? 'no job board yet' : `${openJobs} open jobs`}
                  </span>
                </div>
                <p className="mt-2 text-[0.9375rem] font-medium">
                  <a
                    href={f.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {f.headline ?? f.sourceUrl}
                  </a>
                </p>
                <Notes notes={f.verifyNotes} />

                <details className="group mt-4">
                  <summary className="inline-flex list-none items-center gap-1 text-sm font-medium text-text-muted hover:text-text">
                    <span className="transition-transform group-open:rotate-90">›</span> Edit
                    details
                  </summary>
                  <ActionForm
                    action={updateFunding}
                    submitLabel="Save"
                    className="mt-3"
                    extraButtons={
                      <button type="submit" name="approve" value="1" className="btn">
                        Save and approve
                      </button>
                    }
                  >
                    <input type="hidden" name="id" value={f.id} />
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <Field
                        label="Company"
                        name="companyName"
                        defaultValue={companyName}
                        required
                      />
                      <RoundSelect value={f.round} />
                      <Field
                        label="Announced on"
                        name="announcedOn"
                        type="date"
                        defaultValue={f.announcedOn}
                        required
                      />
                      <Field
                        label="Amount"
                        name="amount"
                        defaultValue={f.amount ?? ''}
                        placeholder="20000000"
                      />
                      <CurrencySelect value={f.currency} />
                      <Field
                        label="Investors (comma separated)"
                        name="investors"
                        defaultValue={f.investors.join(', ')}
                      />
                      <Field
                        label="Source URL"
                        name="sourceUrl"
                        defaultValue={f.sourceUrl}
                        required
                        className="sm:col-span-2"
                      />
                      <Field
                        label="Source name"
                        name="sourceName"
                        defaultValue={f.sourceName}
                        required
                      />
                    </div>
                  </ActionForm>
                </details>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                  <form action={setFundingStatus.bind(null, f.id, 'approved')}>
                    <button className="btn btn-sm btn-primary">Approve</button>
                  </form>
                  <form action={setFundingStatus.bind(null, f.id, 'rejected')}>
                    <button className="btn btn-sm">Reject</button>
                  </form>
                  <form action={reverifyFunding.bind(null, f.id)} className="ml-auto">
                    <button
                      className="btn btn-sm btn-ghost"
                      title="Checked again on the next daily run"
                    >
                      Re-check next run
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Add funding manually</h2>
        <p className="mt-1 text-sm text-text-muted">Goes live immediately.</p>
        <ActionForm
          action={addFunding}
          submitLabel="Add funding"
          className="mt-4 rounded-[var(--radius-lg)] border border-border bg-surface p-5"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Company" name="companyName" required />
            <RoundSelect />
            <Field label="Announced on" name="announcedOn" type="date" required />
            <Field label="Amount" name="amount" placeholder="20000000" />
            <CurrencySelect value="USD" />
            <Field label="Investors (comma separated)" name="investors" />
            <Field label="Source URL" name="sourceUrl" required className="sm:col-span-2" />
            <Field label="Source name" name="sourceName" required />
          </div>
        </ActionForm>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Recently decided</h2>
        <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-text-subtle">
              <tr className="border-b border-border">
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Company</th>
                <th className="px-3 py-2 font-medium">Round</th>
                <th className="px-3 py-2 text-right font-medium">Amount</th>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Score</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {reviewed.map(({ f, companyName }) => (
                <tr key={f.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span
                      className={`tag ${f.status === 'approved' ? 'tag-success' : 'tag-danger'}`}
                    >
                      {f.status === 'approved'
                        ? f.autoApproved
                          ? 'Auto-approved'
                          : 'Approved'
                        : 'Rejected'}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-medium" title={f.verifyNotes.join('\n')}>
                    {companyName}
                  </td>
                  <td className="px-3 py-2 text-text-muted">{f.round}</td>
                  <td className="num px-3 py-2 text-right text-text-muted whitespace-nowrap">
                    {f.amountUsd ? formatUsdCompact(f.amountUsd) : ''}
                    {f.amountInr ? ` / ₹${formatInrCompact(f.amountInr)}` : ''}
                  </td>
                  <td className="px-3 py-2 text-text-subtle whitespace-nowrap">
                    {formatDate(f.announcedOn)}
                  </td>
                  <td className="num px-3 py-2 text-text-subtle">{f.confidence ?? '—'}</td>
                  <td className="px-3 py-2 text-right">
                    <form
                      action={setFundingStatus.bind(
                        null,
                        f.id,
                        f.status === 'approved' ? 'rejected' : 'approved',
                      )}
                    >
                      <button className="link text-xs">
                        {f.status === 'approved' ? 'Unapprove' : 'Approve'}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {reviewed.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-text-muted">
                    Nothing decided yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
