import Link from 'next/link';
import { ATS_PROVIDERS, COMPANY_TAG_LABELS, COMPANY_TAGS, timeAgo } from '@roleup/core';
import { companies, desc, eq, getDb, type Company } from '@roleup/db';
import { ActionForm, Field } from '../../ActionForm';
import { requestAtsDetection, saveCompany } from '../../actions';

type Props = { searchParams: Promise<{ edit?: string; q?: string }> };

function CompanyForm({ c }: { c?: Company }) {
  const editableTags = COMPANY_TAGS.filter((t) => t !== 'yc' && t !== 'recently_funded');
  return (
    <ActionForm
      action={saveCompany}
      submitLabel={c ? 'Save company' : 'Add company'}
      className="rounded-md border border-border bg-surface p-4"
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
          <label className="mb-1 block text-xs font-medium text-text-muted">
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
        <legend className="mb-1 text-xs font-medium text-text-muted">
          Tags (YC and Recently funded are set automatically)
        </legend>
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
  const { edit, q } = await searchParams;
  const db = getDb();
  const list = await db
    .select()
    .from(companies)
    .orderBy(desc(companies.openJobsCount), companies.name);
  const filtered = q ? list.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())) : list;
  const editing = edit
    ? (await db.select().from(companies).where(eq(companies.slug, edit)))[0]
    : undefined;
  const now = new Date();

  return (
    <div className="space-y-8">
      <section>
        <h1 className="mb-3 text-xl font-semibold tracking-tight">
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

      <section>
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-md font-semibold">All companies ({list.length})</h2>
          <form className="flex gap-2">
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
        <div className="overflow-x-auto rounded-md border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-text-subtle">
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
