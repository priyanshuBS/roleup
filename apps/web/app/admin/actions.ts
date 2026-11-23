'use server';

import { updateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import {
  ATS_PROVIDERS,
  COMPANY_TAGS,
  FUNDING_ROUNDS,
  domainFromUrl,
  slugify,
  type SettingKey,
} from '@roleup/core';
import {
  and,
  companies,
  ensureCompany,
  eq,
  fundings,
  getDb,
  gte,
  readSettings,
  refreshRecentlyFundedTags,
  writeSettings,
} from '@roleup/db';
import {
  clearAdminSession,
  rateLimit,
  requireAdmin,
  setAdminSession,
  tokenMatches,
} from '@/lib/admin-auth';

export type ActionState = { ok?: string; error?: string } | null;

const refresh = () => {
  updateTag('jobs');
  updateTag('funding');
};

const str = (max: number) => z.string().trim().max(max);
const optUrl = z
  .string()
  .trim()
  .max(500)
  .transform((v) => v || null)
  .pipe(z.string().url().nullable());

/* ---------- auth ---------- */

export async function login(_prev: ActionState, form: FormData): Promise<ActionState> {
  const rl = await rateLimit('admin-login', 5, 15 * 60);
  if (!rl.allowed) return { error: 'Too many attempts. Try again in 15 minutes.' };
  const token = String(form.get('token') ?? '');
  if (!tokenMatches(token)) return { error: 'Wrong token.' };
  await setAdminSession();
  redirect('/admin');
}

export async function logout() {
  await clearAdminSession();
  redirect('/admin/login');
}

/* ---------- funding ---------- */

const fundingSchema = z.object({
  round: z.enum(FUNDING_ROUNDS),
  amount: z
    .string()
    .trim()
    .transform((v) => (v ? Number(v.replace(/,/g, '')) : null))
    .pipe(z.number().positive().nullable()),
  currency: z.enum(['USD', 'INR', 'EUR', 'GBP', '']).transform((v) => v || null),
  investors: str(500).transform((v) =>
    v
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 20),
  ),
  announcedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sourceUrl: z.string().trim().url().max(500),
  sourceName: str(120).min(1),
});

function money(amount: number | null, currency: string | null) {
  const rate = Number(process.env.USD_INR_RATE) || 84;
  if (amount == null || !currency) return { amountUsd: null, amountInr: null };
  const toUsd =
    currency === 'INR' ? 1 / rate : currency === 'EUR' ? 1.08 : currency === 'GBP' ? 1.27 : 1;
  const usd = Math.round(amount * toUsd);
  return {
    amountUsd: usd,
    amountInr: currency === 'INR' ? Math.round(amount) : Math.round(usd * rate),
  };
}

export async function setFundingStatus(id: number, status: 'approved' | 'rejected') {
  await requireAdmin();
  const db = getDb();
  // Headline was only kept for review context; drop it once reviewed (facts + URL only).
  await db
    .update(fundings)
    .set({ status, headline: null, autoApproved: false })
    .where(eq(fundings.id, id));
  await refreshRecentlyFundedTags(db);
  refresh();
}

/** Ask the next verify run to re-check this entry now (clears the last check time). */
export async function reverifyFunding(id: number) {
  await requireAdmin();
  await getDb().update(fundings).set({ verifiedAt: null }).where(eq(fundings.id, id));
}

/** Approve every pending entry whose last verification passed the auto-approve threshold. */
export async function approveVerified() {
  await requireAdmin();
  const db = getDb();
  const { fundingAutoApproveMin } = await readSettings(db);
  const rows = await db
    .select({ id: fundings.id, notes: fundings.verifyNotes })
    .from(fundings)
    .where(and(eq(fundings.status, 'pending'), gte(fundings.confidence, fundingAutoApproveMin)));
  // Never bulk-approve entries with a failed hard check (✗ lines).
  const ids = rows.filter((r) => !r.notes.some((n) => n.startsWith('✗'))).map((r) => r.id);
  for (const id of ids)
    await db
      .update(fundings)
      .set({ status: 'approved', headline: null })
      .where(eq(fundings.id, id));
  await refreshRecentlyFundedTags(db);
  refresh();
}

export async function updateFunding(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = Number(form.get('id'));
  const parsed = fundingSchema.safeParse(Object.fromEntries(form));
  if (!Number.isInteger(id) || !parsed.success)
    return { error: parsed.error?.issues[0]?.message ?? 'Invalid input' };
  const companyName = str(120).parse(form.get('companyName') ?? '');
  const db = getDb();
  const patch: Partial<typeof fundings.$inferInsert> = {
    ...parsed.data,
    ...money(parsed.data.amount, parsed.data.currency),
  };
  if (companyName) {
    const { company } = await ensureCompany(db, companyName);
    patch.companyId = company.id;
  }
  await db.update(fundings).set(patch).where(eq(fundings.id, id));
  if (form.get('approve') === '1')
    await db
      .update(fundings)
      .set({ status: 'approved', headline: null })
      .where(eq(fundings.id, id));
  await refreshRecentlyFundedTags(db);
  refresh();
  return { ok: 'Saved.' };
}

export async function addFunding(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = fundingSchema.safeParse(Object.fromEntries(form));
  const companyName = str(120)
    .min(2)
    .safeParse(form.get('companyName') ?? '');
  if (!parsed.success || !companyName.success)
    return { error: parsed.error?.issues[0]?.message ?? 'Company name is required' };
  const db = getDb();
  const { company, created } = await ensureCompany(db, companyName.data);
  await db
    .insert(fundings)
    .values({
      companyId: company.id,
      ...parsed.data,
      ...money(parsed.data.amount, parsed.data.currency),
      status: 'approved',
    })
    .onConflictDoNothing({ target: fundings.sourceUrl });
  await refreshRecentlyFundedTags(db);
  refresh();
  return {
    ok: `Added for ${company.name}${created ? ' (new company, queued for ATS detection)' : ''}.`,
  };
}

/* ---------- companies ---------- */

const companySchema = z.object({
  name: str(120).min(2),
  website: optUrl,
  careersUrl: optUrl,
  logoUrl: optUrl,
  ats: z.enum(ATS_PROVIDERS),
  atsSlug: z
    .string()
    .trim()
    .max(100)
    .regex(/^[A-Za-z0-9_.-]*$/, 'ATS slug can only contain letters, numbers, - _ .')
    .transform((v) => v || null),
  hqCountry: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^([A-Z]{2})?$/, 'HQ country must be a 2-letter code')
    .transform((v) => v || null),
});

function tagsFrom(form: FormData) {
  const managed = new Set(['yc', 'recently_funded']);
  return form
    .getAll('tags')
    .map(String)
    .filter(
      (t): t is (typeof COMPANY_TAGS)[number] =>
        (COMPANY_TAGS as readonly string[]).includes(t) && !managed.has(t),
    );
}

export async function saveCompany(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = companySchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  const db = getDb();
  const id = Number(form.get('id') || 0);
  const d = parsed.data;
  const values = { ...d, domain: domainFromUrl(d.website) };
  if (id) {
    const [current] = await db
      .select({ tags: companies.tags })
      .from(companies)
      .where(eq(companies.id, id));
    if (!current) return { error: 'Company not found' };
    const managed = current.tags.filter((t) => t === 'yc' || t === 'recently_funded');
    await db
      .update(companies)
      .set({
        ...values,
        tags: [...tagsFrom(form), ...managed],
        crawlStatus: 'pending',
        crawlError: null,
        // No board yet but a URL was given: look for the board on the next daily run.
        ...(d.ats === 'none' && (d.careersUrl || d.website)
          ? { atsDetectRequestedAt: new Date(), discoveryCheckedAt: null }
          : {}),
      })
      .where(eq(companies.id, id));
  } else {
    const slug = slugify(d.name);
    const [taken] = await db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.slug, slug));
    if (taken) return { error: `A company with slug "${slug}" already exists.` };
    await db.insert(companies).values({
      ...values,
      slug,
      tags: tagsFrom(form),
      atsDetectRequestedAt: d.ats === 'none' && (d.careersUrl || d.website) ? new Date() : null,
    });
  }
  refresh();
  return { ok: id ? 'Company updated. It will be re-crawled on the next run.' : 'Company added.' };
}

export async function requestAtsDetection(id: number) {
  await requireAdmin();
  await getDb()
    .update(companies)
    .set({ atsDetectRequestedAt: new Date(), discoveryCheckedAt: null })
    .where(eq(companies.id, id));
}

/* ---------- settings ---------- */

export async function saveSettings(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const apk = String(form.get('apkUrl') ?? '').trim();
  if (apk) {
    try {
      const u = new URL(apk);
      if (u.protocol !== 'https:') return { error: 'The APK link must start with https://' };
    } catch {
      return { error: 'The APK link is not a valid URL.' };
    }
  }
  const min = Number(form.get('autoApproveMin'));
  if (!Number.isInteger(min) || min < 40 || min > 100)
    return { error: 'Auto-approve score must be a whole number from 40 to 100.' };
  const values: Partial<Record<SettingKey, string>> = {
    'funding.autoApprove': form.get('autoApprove') === 'on' ? 'true' : 'false',
    'funding.autoApproveMin': String(min),
    'app.androidApkUrl': apk.slice(0, 1000),
    'app.androidVersion': String(form.get('apkVersion') ?? '')
      .trim()
      .slice(0, 20),
    'app.androidNotes': String(form.get('apkNotes') ?? '')
      .trim()
      .slice(0, 500),
  };
  await writeSettings(getDb(), values);
  updateTag('settings');
  return { ok: 'Settings saved. The site uses them right away.' };
}
