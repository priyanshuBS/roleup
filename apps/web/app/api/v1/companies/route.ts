import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { COMPANY_TAGS } from '@roleup/core';
import { apiError, json, preflight } from '@/lib/api';
import { getCompanies } from '@/lib/data';

const query = z.object({
  tag: z.enum(COMPANY_TAGS).optional().catch(undefined),
  city: z
    .string()
    .regex(/^[a-z0-9-]{2,40}$/)
    .optional()
    .catch(undefined),
  hasJobs: z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .catch(undefined)
    .transform((v) => (v === undefined ? true : v === 'true' || v === '1')),
  q: z.string().max(60).optional().catch(undefined),
});

/** GET /api/v1/companies?tag=&city=&hasJobs= */
export async function GET(req: NextRequest) {
  const f = query.parse(Object.fromEntries(req.nextUrl.searchParams));
  try {
    const items = await getCompanies({ tag: f.tag, city: f.city, hasJobs: f.hasJobs, q: f.q });
    return json({ items }, { maxAge: 600 });
  } catch (err) {
    console.error('GET /api/v1/companies failed', err instanceof Error ? err.message : err);
    return apiError(500, 'Could not load companies');
  }
}

export const OPTIONS = preflight;
