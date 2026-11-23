/** Fetch an HTML page politely (robots.txt respected) and read its title / site name. */
import { robotsAllows } from './detect';
import { HttpError, politeFetch } from './http';

const robotsCache = new Map<string, string>();

export async function allowedByRobots(url: URL): Promise<boolean> {
  let txt = robotsCache.get(url.origin);
  if (txt === undefined) {
    try {
      const res = await politeFetch(`${url.origin}/robots.txt`, {
        accept: 'text/plain',
        retries: 1,
        timeoutMs: 10_000,
      });
      txt = await res.text();
    } catch (err) {
      // No robots.txt (4xx) means allowed. Other failures: be conservative.
      txt =
        err instanceof HttpError && err.status >= 400 && err.status < 500
          ? ''
          : 'User-agent: *\nDisallow: /';
    }
    robotsCache.set(url.origin, txt);
  }
  return robotsAllows(txt, url.pathname + url.search);
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  rsquo: '’',
  lsquo: '‘',
  ldquo: '“',
  rdquo: '”',
  ndash: '–',
  mdash: '—',
};

export function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n: string) => ENTITIES[n.toLowerCase()] ?? m)
    .replace(/\s+/g, ' ')
    .trim();
}

function meta(html: string, prop: string): string | null {
  // <meta property="og:title" content="…"> in either attribute order.
  const a = new RegExp(
    `<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']`,
    'i',
  ).exec(html);
  const b = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop}["']`,
    'i',
  ).exec(html);
  const v = a?.[1] ?? b?.[1];
  return v ? decodeEntities(v) : null;
}

/** Pure: title (og:title, else <title>) and og:site_name from the page head. */
export function parseHead(html: string): { title: string | null; siteName: string | null } {
  const head = html.slice(0, 300_000);
  const t = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(head)?.[1];
  return {
    title: meta(head, 'og:title') ?? (t ? decodeEntities(t) : null),
    siteName: meta(head, 'og:site_name'),
  };
}

export interface PageResult {
  ok: boolean;
  status?: number;
  url?: string;
  title?: string | null;
  siteName?: string | null;
  html?: string;
}

/** null = not checked (blocked by robots.txt or a network failure), so "unknown", not "gone". */
export async function fetchPage(
  href: string,
  opts: { timeoutMs?: number } = {},
): Promise<PageResult | null> {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return { ok: false };
  }
  if (!(await allowedByRobots(url))) return null;
  try {
    const res = await politeFetch(url.href, {
      accept: 'text/html,application/xhtml+xml',
      retries: 1,
      timeoutMs: opts.timeoutMs ?? 15_000,
    });
    const html = (await res.text()).slice(0, 2_000_000);
    return { ok: true, status: res.status, url: res.url, html, ...parseHead(html) };
  } catch (err) {
    if (err instanceof HttpError) return { ok: false, status: err.status };
    return null;
  }
}
