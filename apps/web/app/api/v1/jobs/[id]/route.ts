import { z } from 'zod';
import { apiError, json, preflight } from '@/lib/api';
import { getJobById, getJobBySlug } from '@/lib/data';

const param = z.union([z.coerce.number().int().positive(), z.string().regex(/^[a-z0-9-]{3,200}$/)]);

/** GET /api/v1/jobs/:id. Accepts a numeric id or a job slug. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const raw = (await ctx.params).id;
  const parsed = param.safeParse(/^\d+$/.test(raw) ? raw : raw.toLowerCase());
  if (!parsed.success) return apiError(400, 'Invalid job id');
  try {
    const job =
      typeof parsed.data === 'number'
        ? await getJobById(parsed.data)
        : await getJobBySlug(parsed.data);
    if (!job) return apiError(404, 'Job not found');
    return json(job, { maxAge: 300 });
  } catch (err) {
    console.error('GET /api/v1/jobs/:id failed', err instanceof Error ? err.message : err);
    return apiError(500, 'Could not load job');
  }
}

export const OPTIONS = preflight;
