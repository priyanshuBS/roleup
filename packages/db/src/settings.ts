/** Key/value runtime settings (see @roleup/core settings.ts for keys, types and defaults). */
import { parseSettings, SETTING_KEYS, type SettingKey, type Settings } from '@roleup/core';
import { inArray } from 'drizzle-orm';
import type { Db } from './client';
import { settings } from './schema';

export async function readSettings(db: Db): Promise<Settings> {
  const rows = await db
    .select()
    .from(settings)
    .where(inArray(settings.key, [...SETTING_KEYS]));
  const raw = Object.fromEntries(rows.map((r) => [r.key, r.value])) as Partial<
    Record<SettingKey, string>
  >;
  return parseSettings(raw, { androidApkUrl: process.env.ANDROID_APK_URL });
}

/** Upsert values; an empty string deletes the key (falls back to the default / env). */
export async function writeSettings(db: Db, values: Partial<Record<SettingKey, string>>) {
  for (const [key, value] of Object.entries(values) as [SettingKey, string][]) {
    if (!SETTING_KEYS.includes(key)) continue;
    if (value === '') {
      await db.delete(settings).where(inArray(settings.key, [key]));
    } else {
      await db
        .insert(settings)
        .values({ key, value })
        .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
    }
  }
}
