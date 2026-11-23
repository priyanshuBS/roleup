import { revalidateTag } from 'next/cache';
import { apiError, json } from '@/lib/api';
import { tokenMatches } from '@/lib/admin-auth';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/revalidate  (Authorization: Bearer <ADMIN_TOKEN>)
 * Called by the worker workflow after a crawl so pages pick up new jobs without waiting for
 * the 10-minute cache window.
 */
export async function POST(req: Request) {
  const rl = await rateLimit('admin-revalidate', 30, 3600);
  if (!rl.allowed) return apiError(429, 'Too many requests');
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!tokenMatches(token)) return apiError(401, 'Unauthorized');
  revalidateTag('jobs', 'max');
  revalidateTag('funding', 'max');
  revalidateTag('settings', 'max');
  return json({ ok: true, revalidatedAt: new Date().toISOString() }, { maxAge: 0 });
}
