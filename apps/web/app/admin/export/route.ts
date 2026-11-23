import { analyticsDailyCsv, getDb } from '@roleup/db';
import { isAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/** GET /admin/export?range=30: daily views/visitors/clicks as CSV. Admin session required. */
export async function GET(req: Request) {
  if (!(await isAdmin())) return new Response('Not found', { status: 404 });
  const range = Number(new URL(req.url).searchParams.get('range'));
  const days = [7, 30, 90].includes(range) ? range : 30;
  const csv = await analyticsDailyCsv(getDb(), days);
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="roleup-analytics-${days}d.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
