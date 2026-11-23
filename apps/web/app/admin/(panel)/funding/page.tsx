import { FUNDING_ROUNDS, formatInrCompact, formatUsdCompact } from '@roleup/core';
import { companies, desc, eq, fundings, getDb } from '@roleup/db';
import { ActionForm, Field } from '../../ActionForm';
import { addFunding, setFundingStatus, updateFunding } from '../../actions';

function RoundSelect({ value }: { value?: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-text-muted">
        Round
        <select name="round" defaultValue={value ?? 'Seed'} className="field mt-1">
          {FUNDING_ROUNDS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </label>
    </div>
  );
}

function CurrencySelect({ value }: { value?: string | null }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-text-muted">
        Currency
        <select name="currency" defaultValue={value ?? ''} className="field mt-1">
          <option value="">—</option>
          <option>USD</option>
          <option>INR</option>
          <option>EUR</option>
          <option>GBP</option>
        </select>
      </label>
    </div>
  );
}

export default async function AdminFundingPage() {
  const db = getDb();
  const rows = await db
    .select({
      f: fundings,
      companyName: companies.name,
      companySlug: companies.slug,
      openJobs: companies.openJobsCount,
    })
    .from(fundings)
    .innerJoin(companies, eq(companies.id, fundings.companyId))
    .orderBy(desc(fundings.createdAt))
    .limit(300);
  const pending = rows.filter((r) => r.f.status === 'pending');
  const reviewed = rows.filter((r) => r.f.status !== 'pending').slice(0, 50);

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-xl font-semibold tracking-tight">Funding review queue</h1>
        <p className="mt-1 mb-4 text-sm text-text-muted">
          Extracted automatically from news headlines. Check the source, fix anything wrong, then
          approve. Only approved entries are public.
        </p>
        {pending.length === 0 && <p className="text-sm text-text-muted">Nothing pending.</p>}
        <ul className="space-y-4">
          {pending.map(({ f, companyName, openJobs }) => (
            <li key={f.id} className="rounded-md border border-border bg-surface p-4">
              <p className="text-sm">
                <a href={f.sourceUrl} target="_blank" rel="noopener noreferrer" className="link">
                  {f.headline ?? f.sourceUrl}
                </a>
                <span className="text-text-subtle">
                  {' '}
                  · {f.sourceName} · {f.announcedOn} · {openJobs} open jobs
                </span>
              </p>
              <ActionForm
                action={updateFunding}
                submitLabel="Save"
                className="mt-3"
                extraButtons={
                  <>
                    <button type="submit" name="approve" value="1" className="btn">
                      Save and approve
                    </button>
                    <button
                      formAction={setFundingStatus.bind(null, f.id, 'approved')}
                      className="btn"
                    >
                      Approve as is
                    </button>
                    <button
                      formAction={setFundingStatus.bind(null, f.id, 'rejected')}
                      className="btn"
                    >
                      Reject
                    </button>
                  </>
                }
              >
                <input type="hidden" name="id" value={f.id} />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Field label="Company" name="companyName" defaultValue={companyName} required />
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
                    placeholder="e.g. 20000000"
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
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-md font-semibold">Add funding manually</h2>
        <ActionForm
          action={addFunding}
          submitLabel="Add (approved)"
          className="mt-3 rounded-md border border-border bg-surface p-4"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Company" name="companyName" required />
            <RoundSelect />
            <Field label="Announced on" name="announcedOn" type="date" required />
            <Field label="Amount" name="amount" placeholder="e.g. 20000000" />
            <CurrencySelect value="USD" />
            <Field label="Investors (comma separated)" name="investors" />
            <Field label="Source URL" name="sourceUrl" required className="sm:col-span-2" />
            <Field label="Source name" name="sourceName" required />
          </div>
        </ActionForm>
      </section>

      <section>
        <h2 className="mb-2 text-md font-semibold">Recently reviewed</h2>
        <ul className="rounded-md border border-border bg-surface text-sm">
          {reviewed.map(({ f, companyName }) => (
            <li
              key={f.id}
              className="flex flex-wrap items-center gap-2 border-b border-border p-2 last:border-0"
            >
              <span className={`tag ${f.status === 'approved' ? 'tag-success' : 'tag-danger'}`}>
                {f.status}
              </span>
              <strong>{companyName}</strong>
              <span>{f.round}</span>
              <span className="tabular-nums text-text-muted">
                {f.amountUsd ? formatUsdCompact(f.amountUsd) : ''}
                {f.amountInr ? ` / ₹${formatInrCompact(f.amountInr)}` : ''}
              </span>
              <span className="text-text-subtle">{f.announcedOn}</span>
              <form
                action={setFundingStatus.bind(
                  null,
                  f.id,
                  f.status === 'approved' ? 'rejected' : 'approved',
                )}
                className="ml-auto"
              >
                <button className="link">
                  {f.status === 'approved' ? 'Unapprove' : 'Approve'}
                </button>
              </form>
            </li>
          ))}
          {reviewed.length === 0 && <li className="p-2 text-text-muted">None yet.</li>}
        </ul>
      </section>
    </div>
  );
}
