import { getDb, readSettings, settings as settingsTable } from '@roleup/db';
import { ActionForm, Field } from '../../ActionForm';
import { saveSettings } from '../../actions';
import { requireAdmin } from '@/lib/admin-auth';

export default async function AdminSettingsPage() {
  await requireAdmin();
  const db = getDb();
  const [s, rows] = await Promise.all([readSettings(db), db.select().from(settingsTable)]);
  const stored = new Map(rows.map((r) => [r.key, r.value]));
  const apkFromEnv = !stored.get('app.androidApkUrl') && !!process.env.ANDROID_APK_URL;

  return (
    <div className="max-w-3xl space-y-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-text-muted">
          Saved in the database and used by the site immediately. No redeploy needed.
        </p>
      </header>

      <ActionForm action={saveSettings} submitLabel="Save settings" className="space-y-10">
        <section className="space-y-4">
          <div>
            <h2 className="font-semibold">Funding automation</h2>
            <p className="mt-1 text-sm text-text-muted">
              Every funding item from the news feeds is checked automatically. The source article is
              re-opened and must name the company, and the score adds points for a stated amount, a
              named round, other outlets reporting the same raise, and a company we already track.
              Items that score at or above the threshold go live without review; the rest wait in
              the funding queue with the reasons shown. Approved items are re-checked weekly and
              return to the queue if the article disappears.
            </p>
          </div>
          <label className="flex items-start gap-3 rounded-[var(--radius-md)] border border-border p-4">
            <input
              type="checkbox"
              name="autoApprove"
              defaultChecked={s.fundingAutoApprove}
              className="mt-0.5 h-4 w-4"
            />
            <span>
              <span className="block text-sm font-medium">
                Approve verified funding automatically
              </span>
              <span className="block text-sm text-text-muted">
                Off: everything waits for you in the queue (scores are still shown).
              </span>
            </span>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Minimum score to auto-approve (40–100)"
              name="autoApproveMin"
              type="number"
              defaultValue={s.fundingAutoApproveMin}
              required
            />
            <div className="text-xs leading-relaxed text-text-muted sm:pt-6">
              Live source naming the company 40 · amount 20 · round 10 · second source 20 · known
              company 10 · common-word name −30.
              <br />
              70 = live source + amount + round. 60 also accepts rounds without a stated stage.
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="font-semibold">Android app</h2>
            <p className="mt-1 text-sm text-text-muted">
              Paste the public download link of the latest APK, for example a GitHub release asset,
              a Cloudflare R2 / S3 file or an EAS build URL. The site&apos;s &ldquo;Get the
              app&rdquo; page and the stable link <code className="kbd">/app/download</code> always
              point here, so publishing a new build only means updating this field. Leave it empty
              to hide the app links.
            </p>
            {apkFromEnv && (
              <p className="mt-2 text-sm text-text-muted">
                Currently using <code className="kbd">ANDROID_APK_URL</code> from the server
                environment. A value saved here takes priority.
              </p>
            )}
          </div>
          <Field
            label="APK download URL (https)"
            name="apkUrl"
            defaultValue={stored.get('app.androidApkUrl') ?? ''}
            placeholder="https://github.com/you/roleup/releases/download/v1.0.0/roleup.apk"
          />
          <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
            <Field
              label="Version (optional)"
              name="apkVersion"
              defaultValue={s.androidVersion}
              placeholder="1.0.0"
            />
            <Field
              label="What's new (optional, one line)"
              name="apkNotes"
              defaultValue={s.androidNotes}
              placeholder="Saved jobs sync, faster search"
            />
          </div>
        </section>
      </ActionForm>
    </div>
  );
}
