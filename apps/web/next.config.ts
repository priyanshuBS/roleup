import { config as loadEnv } from 'dotenv';
import type { NextConfig } from 'next';

// One .env at the repo root for every app. On Vercel, env vars come from the dashboard.
loadEnv({ path: '../../.env', quiet: true });

const isDev = process.env.NODE_ENV !== 'production';

const csp = [
  "default-src 'self'",
  // Inline scripts: JSON-LD and the pre-paint theme snippet. Dev needs eval for HMR.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  // Company logos come from employer sites / a favicon service.
  "img-src 'self' data: https:",
  "font-src 'self'",
  `connect-src 'self'${isDev ? ' ws:' : ''}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const nextConfig: NextConfig = {
  transpilePackages: ['@roleup/core', '@roleup/db', '@roleup/ui-tokens'],
  serverExternalPackages: ['pg', '@neondatabase/serverless', 'unpdf', 'mammoth'],
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
