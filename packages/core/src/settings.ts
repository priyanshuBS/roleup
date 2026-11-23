/**
 * Runtime settings stored in the `settings` table and edited at /admin/settings, so they change
 * without a redeploy. Every value is stored as text; `parseSettings` applies types and defaults.
 */
export const SETTING_KEYS = [
  'funding.autoApprove',
  'funding.autoApproveMin',
  'app.androidApkUrl',
  'app.androidVersion',
  'app.androidNotes',
] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];

export interface Settings {
  /** Approve funding automatically when its verification score reaches `autoApproveMin`. */
  fundingAutoApprove: boolean;
  fundingAutoApproveMin: number;
  /** Public download link for the Android APK (any https URL: GitHub release, R2, Drive…). */
  androidApkUrl: string | null;
  androidVersion: string | null;
  androidNotes: string | null;
}

export const DEFAULT_AUTO_APPROVE_MIN = 70;

function httpsUrl(v: string | undefined): string | null {
  if (!v) return null;
  try {
    const u = new URL(v.trim());
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Typed settings from raw key/value rows. `env` supplies fallbacks (e.g. ANDROID_APK_URL). */
export function parseSettings(
  raw: Partial<Record<SettingKey, string>>,
  env: { androidApkUrl?: string } = {},
): Settings {
  const min = Number(raw['funding.autoApproveMin']);
  return {
    fundingAutoApprove: raw['funding.autoApprove'] !== 'false',
    fundingAutoApproveMin:
      Number.isFinite(min) && min >= 40 && min <= 100 ? Math.round(min) : DEFAULT_AUTO_APPROVE_MIN,
    androidApkUrl: httpsUrl(raw['app.androidApkUrl']) ?? httpsUrl(env.androidApkUrl),
    androidVersion: raw['app.androidVersion']?.trim().slice(0, 20) || null,
    androidNotes: raw['app.androidNotes']?.trim().slice(0, 500) || null,
  };
}
