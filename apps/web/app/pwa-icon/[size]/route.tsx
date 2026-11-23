import { iconImage } from '@/lib/og';

const SIZES = new Set([192, 512]);

export const dynamicParams = false;
export function generateStaticParams() {
  return [...SIZES].map((s) => ({ size: String(s) }));
}

/** PNG app icons for the web manifest (/pwa-icon/192, /pwa-icon/512). Generated at build time. */
export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const size = Number((await params).size);
  if (!SIZES.has(size)) return new Response('Not found', { status: 404 });
  return iconImage(size);
}
