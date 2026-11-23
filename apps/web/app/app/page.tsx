import type { Metadata } from 'next';
import Link from 'next/link';
import QRCode from 'qrcode';
import { Download } from 'lucide-react';
import { LogoMark } from '@/components/Logo';
import { getSettings } from '@/lib/settings';
import { absoluteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'RoleUp for Android',
  description:
    'Get the RoleUp Android app: tech jobs in India and remote, saved jobs and alerts on your phone. Free, no sign-up.',
  alternates: { canonical: '/app' },
};

// The APK link is a runtime setting, so render per request (cached data, cheap).
export const dynamic = 'force-dynamic';

const STEPS = [
  'Tap Download APK on your Android phone (or scan the code from your computer).',
  'Open the downloaded file. If Android asks, allow your browser to install apps from this source.',
  'Tap Install, then open RoleUp. Updates are published here: download again to update.',
];

export default async function AppPage() {
  const { androidApkUrl, androidVersion, androidNotes } = await getSettings();
  const downloadUrl = absoluteUrl('/app/download');
  // Server-rendered SVG: no client JavaScript, and it scans from a desktop screen.
  const qr = androidApkUrl
    ? await QRCode.toString(downloadUrl, {
        type: 'svg',
        margin: 0,
        errorCorrectionLevel: 'M',
        color: { dark: '#161616', light: '#FFFFFF' },
      })
    : null;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="grid items-center gap-12 md:grid-cols-[1fr_auto]">
        <div>
          <LogoMark size={56} />
          <h1 className="display mt-6 text-[2.25rem] leading-[1.08] sm:text-[3rem]">
            RoleUp for Android
          </h1>
          <p className="mt-4 max-w-lg text-lg text-text-muted">
            The same jobs, straight from company career pages, in an app. Save roles on your phone,
            filter by city and salary, and apply on the employer&apos;s site.
          </p>

          {androidApkUrl ? (
            <>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a
                  href="/app/download"
                  data-track="app:download"
                  className="btn btn-accent btn-lg"
                  rel="nofollow"
                >
                  <Download size={18} aria-hidden />
                  Download APK
                </a>
                <span className="text-sm text-text-subtle">
                  {androidVersion ? `Version ${androidVersion} · ` : ''}Free · no sign-up
                </span>
              </div>
              {androidNotes && (
                <p className="mt-4 text-sm text-text-muted">
                  <span className="font-medium text-text">What&apos;s new:</span> {androidNotes}
                </p>
              )}
            </>
          ) : (
            <p className="mt-8 rounded-[var(--radius-md)] border border-dashed border-border-strong px-4 py-3 text-sm text-text-muted">
              The Android app is coming soon. Meanwhile, the website works well on your phone. Add
              it to your home screen from the browser menu.
            </p>
          )}
        </div>

        {qr && (
          <figure className="hidden rounded-[var(--radius-lg)] border border-border bg-white p-5 md:block">
            <div
              className="h-44 w-44 [&_svg]:h-full [&_svg]:w-full"
              aria-hidden
              // Generated locally from our own URL by the qrcode library.
              dangerouslySetInnerHTML={{ __html: qr }}
            />
            <figcaption className="mt-3 text-center text-xs text-[#4D4D55]">
              Scan with your phone
            </figcaption>
          </figure>
        )}
      </div>

      {androidApkUrl && (
        <section aria-labelledby="install" className="mt-16 border-t border-border pt-10">
          <h2 id="install" className="text-lg font-semibold">
            How to install
          </h2>
          <ol className="mt-5 grid gap-6 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s}>
                <span className="num text-sm font-semibold text-accent">{i + 1}</span>
                <p className="mt-1.5 text-sm text-text-muted">{s}</p>
              </li>
            ))}
          </ol>
          <p className="mt-8 text-sm text-text-subtle">
            The app is distributed directly from RoleUp, not the Play Store, so Android shows an
            &ldquo;unknown source&rdquo; prompt. It asks for no special permissions, has no accounts
            and no ads. See the{' '}
            <Link href="/privacy" className="link">
              privacy notes
            </Link>
            .
          </p>
        </section>
      )}
    </div>
  );
}
