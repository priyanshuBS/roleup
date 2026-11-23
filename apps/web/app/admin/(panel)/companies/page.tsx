import Link from 'next/link';
import { ATS_PROVIDERS, COMPANY_TAG_LABELS, COMPANY_TAGS, timeAgo } from '@roleup/core';
import { companies, desc, eq, getDb, type Company } from '@roleup/db';
import { ActionForm, Field } from '../../ActionForm';
import { requestAtsDetection, saveCompany } from '../../actions';
import { requireAdmin } from '@/lib/admin-auth';

type Props = { searchParams: Promise<{ edit?: string; q?: string; status?: string }> };

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'live', label: 'Live' },
  { value: 'failing', label: 'Failing' },
  { value: 'noboard', label: 'No job board' },
] as const;

function CompanyForm({ c }: { c?: Company }) {
  const editableTags = COMPANY_TAGS.filter((t) => t !== 'yc' && t !== 'recently_funded');
  return (
    <ActionForm
      action={saveCompany}
      submitLabel={c ? 'Save company' : 'Add company'}
      className="card p-4"
    >
      {c && <input type="hidden" name="id" value={c.id} />}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Name" name="name" defaultValue={c?.name} required />
        <Field label="Website" name="website" defaultValue={c?.website} placeholder="https://" />
        <Field
          label="Careers URL"
          name="careersUrl"
          defaultValue={c?.careersUrl}
          placeholder="https://"
        />
        <div>
          <label className="block text-xs font-medium text-text-muted">
            ATS
            <select name="ats" defaultValue={c?.ats ?? 'none'} className="field mt-1">
              {ATS_PROVIDERS.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </label>
        </div>
        <Field
          label="ATS board slug"
          name="atsSlug"
          defaultValue={c?.atsSlug}
          placeholder="e.g. razorpaysoftwareprivatelimited"
        />
        <Field
          label="HQ country (ISO-2)"
          name="hqCountry"
          defaultValue={c?.hqCountry}
          placeholder="IN"
        />
        <Field
          label="Logo URL (optional)"
          name="logoUrl"
          defaultValue={c?.logoUrl}
          placeholder="https://"
          className="sm:col-span-3"
        />
      </div>
      <fieldset className="mt-3">
        <legend className="field-label">Tags (YC and Recently funded are set automatically)</legend>
        <div className="flex flex-wrap gap-3 text-sm">
          {editableTags.map((t) => (
            <label key={t} className="inline-flex items-center gap-1.5">
              <input type="checkbox" name="tags" value={t} defaultChecked={c?.tags.includes(t)} />
              {COMPANY_TAG_LABELS[t]}
            </label>
          ))}
        </div>
      </fieldset>
    </ActionForm>
  );
}

export default async function AdminCompaniesPage({ searchParams }: Props) {
  await requireAdmin();
  const { edit, q, status } = await searchParams;
  const db = getDb();
  const list = await db
    .select()
    .from(companies)
    .orderBy(desc(companies.openJobsCount), companies.name);
  const filtered = list.filter(
    (c) =>
      (!q || c.name.toLowerCase().includes(q.toLowerCase())) &&
      (status === 'live'
        ? c.crawlStatus === 'ok' && c.ats !== 'none'
        : status === 'failing'
          ? c.crawlStatus === 'error' || c.crawlStatus === 'invalid_slug'
          : status === 'noboard'
            ? c.ats === 'none'
            : true),
  );
  // Companies added without a job board (usually from funding news), newest first.
  const waiting = list
    .filter((c) => c.ats === 'none')
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 30);
  const editing = edit
    ? (await db.select().from(companies).where(eq(companies.slug, edit)))[0]
    : undefined;
  const now = new Date();

  return (
    <div className="space-y-8">
      <section>
        <h1 className="mb-3 text-2xl font-semibold tracking-tight">
          {editing ? `Edit ${editing.name}` : 'Add a company'}
        </h1>
        <CompanyForm key={editing?.id ?? 'new'} c={editing} />
        {editing && (
          <div className="mt-2 flex items-center gap-3 text-sm">
            <form action={requestAtsDetection.bind(null, editing.id)}>
              <button className="btn">Queue ATS detection</button>
            </form>
            <span className="text-text-muted">
              {editing.atsDetectRequestedAt
                ? `Queued ${timeAgo(editing.atsDetectRequestedAt, now)}. Runs with the daily worker.`
                : 'Detection reads the careers URL for a Greenhouse, Lever or Ashby board.'}
            </span>
            <Link href="/admin/companies" className="link ml-auto">
              Cancel
            </Link>
          </div>
        )}
      </section>

      {!editing && waiting.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold">Needs a job board ({waiting.length})</h2>
          <p className="mt-1 max-w-2xl text-sm text-text-muted">
            Added without a careers link, usually from funding news. The daily worker looks for
            their Greenhouse, Lever or Ashby board and website, and only saves a match when the
            board names the company too. If it can&apos;t find one, add the careers URL yourself.
          </p>
          <ul className="mt-4 divide-y divide-border rounded-[var(--radius-lg)] border border-border bg-surface">
            {waiting.map((c) => (
              <li key={c.id} className="flex flex-wrap items-start gap-x-4 gap-y-2 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {c.name}
                    <span className="ml-2 text-xs font-normal text-text-subtle">
                      added {timeAgo(c.createdAt, now)}
                    </span>
                  </p>
                  <p className="mt-0.5 text-sm text-text-muted">
                    {c.discoveryNote ??
                      (c.atsDetectRequestedAt
                        ? 'Queued: will be checked on the next daily run.'
                        : 'Not checked yet: will be checked on the next daily run.')}
                    {c.discoveryCheckedAt && (
                      <span className="text-text-subtle">
                        {' '}
                        · {timeAgo(c.discoveryCheckedAt, now)}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <form action={requestAtsDetection.bind(null, c.id)}>
                    <button className="btn btn-sm btn-ghost">Retry next run</button>
                  </form>
                  <Link href={`/admin/companies?edit=${c.slug}`} className="btn btn-sm">
                    Add careers URL
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            Companies <span className="num font-normal text-text-subtle">{filtered.length}</span>
          </h2>
          <nav aria-label="Filter by status" className="flex gap-1 text-sm">
            {STATUS_FILTERS.map((f) => (
              <Link
                key={f.value}
                href={f.value ? `/admin/companies?status=${f.value}` : '/admin/companies'}
                aria-current={(status ?? '') === f.value ? 'page' : undefined}
                className="rounded-md px-2.5 py-1 text-text-muted hover:text-text aria-[current=page]:bg-surface-muted aria-[current=page]:font-medium aria-[current=page]:text-text"
              >
                {f.label}
              </Link>
            ))}
          </nav>
          <form className="flex gap-2">
            {status && <input type="hidden" name="status" value={status} />}
            <label htmlFor="admin-company-q" className="sr-only">
              Filter
            </label>
            <input
              id="admin-company-q"
              name="q"
              defaultValue={q}
              placeholder="Filter by name"
              className="field w-48"
            />
          </form>
        </div>
        <div className="overflow-x-auto card">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted/60 text-left text-xs text-text-subtle">
              <tr className="border-b border-border">
                <th className="p-2 font-medium">Company</th>
                <th className="p-2 font-medium">ATS</th>
                <th className="p-2 font-medium">Status</th>
                <th className="p-2 font-medium tabular-nums">Open</th>
                <th className="p-2 font-medium">Tags</th>
                <th className="p-2 font-medium">Crawled</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="p-2">
                    <Link href={`/admin/companies?edit=${c.slug}`} className="link">
                      {c.name}
                    </Link>
                  </td>
                  <td className="p-2 text-text-muted">
                    {c.ats === 'none' ? '—' : `${c.ats}/${c.atsSlug}`}
                  </td>
                  <td className="p-2">
                    <span
                      className={`tag ${c.crawlStatus === 'ok' ? 'tag-success' : c.crawlStatus === 'pending' ? '' : 'tag-danger'}`}
                    >
                      {c.crawlStatus}
                    </span>
                  </td>
                  <td className="p-2 tabular-nums">{c.openJobsCount}</td>
                  <td className="p-2 text-xs text-text-muted">
                    {c.tags.join(', ')}
                    {c.ycBatch ? ` (${c.ycBatch})` : ''}
                  </td>
                  <td className="p-2 text-xs text-text-subtle whitespace-nowrap">
                    {c.lastCrawledAt ? timeAgo(c.lastCrawledAt, now) : 'never'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
