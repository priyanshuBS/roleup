import { apiError, json, preflight } from '@/lib/api';
import { getCompanyBySlug, getJobs } from '@/lib/data';
import { normalizeFilters } from '@/components/ListPage';

/** GET /api/v1/companies/:slug. Company plus its first page of open jobs. */
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const slug = (await ctx.params).slug.toLowerCase();
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return apiError(400, 'Invalid company slug');
  try {
    const company = await getCompanyBySlug(slug);
    if (!company) return apiError(404, 'Company not found');
    const jobs = await getJobs(normalizeFilters({ company: slug, limit: 50 }));
    return json({ company, jobs }, { maxAge: 600 });
  } catch (err) {
    console.error('GET /api/v1/companies/:slug failed', err instanceof Error ? err.message : err);
    return apiError(500, 'Could not load company');
  }
}

export const OPTIONS = preflight;
