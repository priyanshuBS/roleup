import { unstable_cache } from 'next/cache';
import { parseSettings, type Settings } from '@roleup/core';
import { getDb, readSettings } from '@roleup/db';

const cached = unstable_cache(() => readSettings(getDb()), ['settings-v1'], {
  revalidate: 300,
  tags: ['settings'],
});

/**
 * Runtime settings (edited in /admin/settings). Saving there refreshes this cache at once.
 * Never throws: without a database (e.g. at build time) the env/default values are used.
 */
export async function getSettings(): Promise<Settings> {
  try {
    return await cached();
  } catch {
    return parseSettings({}, { androidApkUrl: process.env.ANDROID_APK_URL });
  }
}
