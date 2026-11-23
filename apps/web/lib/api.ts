import { NextResponse } from 'next/server';

/** Public read API: open CORS (no cookies/credentials are ever used). */
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export function json(
  data: unknown,
  init: { status?: number; maxAge?: number; headers?: Record<string, string> } = {},
) {
  const { status = 200, maxAge = 300, headers = {} } = init;
  return NextResponse.json(data, {
    status,
    headers: {
      ...CORS_HEADERS,
      'Cache-Control':
        maxAge > 0
          ? `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}`
          : 'no-store',
      ...headers,
    },
  });
}

export function apiError(status: number, message: string, extra: Record<string, unknown> = {}) {
  return json({ error: { status, message, ...extra } }, { status, maxAge: 0 });
}

export function preflight() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
