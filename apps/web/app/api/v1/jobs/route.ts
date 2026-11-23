import type { NextRequest } from 'next/server';
import { parseJobFilters } from '@roleup/core';
import { normalizeFilters } from '@/components/ListPage';
import { apiError, json, preflight } from '@/lib/api';
import { getJobs } from '@/lib/data';

/**
 * GET /api/v1/jobs?q=&category=&level=&city=&remote=&band=&tag=&posted=&company=&batch=&cursor=&limit=
 * Newest first, cursor-paginated. Invalid filter values are ignored, not rejected.
 */
export async function GET(req: NextRequest) {
  try {
    const filters = parseJobFilters(req.nextUrl.searchParams);
    const page = await getJobs(normalizeFilters(filters));
    return json(page, { maxAge: 300 });
  } catch (err) {
    console.error('GET /api/v1/jobs failed', err instanceof Error ? err.message : err);
    return apiError(500, 'Could not load jobs');
  }
}

export const OPTIONS = preflight;
