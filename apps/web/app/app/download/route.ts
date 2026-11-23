import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/settings';
import { absoluteUrl } from '@/lib/site';

export const dynamic = 'force-dynamic';

/**
 * GET /app/download: a stable link to the latest Android APK. It redirects to whatever URL is
 * saved in /admin/settings (or ANDROID_APK_URL), so a new build never needs a redeploy and
 * links already shared keep working. Without a URL it goes to the app page.
 */
export async function GET() {
  const { androidApkUrl } = await getSettings();
  const res = NextResponse.redirect(androidApkUrl ?? absoluteUrl('/app'), 302);
  res.headers.set('Cache-Control', 'no-store');
  return res;
}
