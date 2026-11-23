import { apiError, json, preflight } from '@/lib/api';
import { getMeta } from '@/lib/data';

/** GET /api/v1/meta/filters. Cities, categories, levels, bands, tags and YC batches with counts. */
export async function GET() {
  try {
    return json(await getMeta(), { maxAge: 600 });
  } catch (err) {
    console.error('GET /api/v1/meta/filters failed', err instanceof Error ? err.message : err);
    return apiError(500, 'Could not load filters');
  }
}

export const OPTIONS = preflight;
