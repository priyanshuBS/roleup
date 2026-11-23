import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiError, json, preflight } from '@/lib/api';
import { getFunding } from '@/lib/data';

const query = z.object({ limit: z.coerce.number().int().min(1).max(200).catch(50) });

/** GET /api/v1/funding. Approved funding rounds, newest first, with each company's open job count. */
export async function GET(req: NextRequest) {
  const { limit } = query.parse({ limit: req.nextUrl.searchParams.get('limit') ?? undefined });
  try {
    return json({ items: await getFunding(limit) }, { maxAge: 600 });
  } catch (err) {
    console.error('GET /api/v1/funding failed', err instanceof Error ? err.message : err);
    return apiError(500, 'Could not load funding');
  }
}

export const OPTIONS = preflight;
