export const SITE_NAME = 'RoleUp';
export const SITE_DESCRIPTION =
  'Tech jobs in India and remote-from-India, pulled straight from company career pages. Filter by city, salary band, level, YC batch and remote eligibility.';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(
  /\/$/,
  '',
);

export function absoluteUrl(path = '/'): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/** List pages are re-rendered from cached data at most this often (seconds). */
export const REVALIDATE_SECONDS = 600;
