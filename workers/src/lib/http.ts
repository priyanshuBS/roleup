/** Polite HTTP for crawlers: descriptive UA, 20s timeout, retries with backoff, small delays. */

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly url: string,
  ) {
    super(`HTTP ${status} for ${url}`);
    this.name = 'HttpError';
  }
  /** 404/410: the board/slug doesn't exist. Not worth retrying every run. */
  get isGone(): boolean {
    return this.status === 404 || this.status === 410;
  }
}

export function userAgent(): string {
  const contact = process.env.CRAWLER_CONTACT_EMAIL?.trim();
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://github.com/priyanshuBS/roleup';
  return `RoleUpBot/1.0 (+${site}${contact ? `; ${contact}` : ''})`;
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface FetchOptions {
  timeoutMs?: number;
  retries?: number;
  accept?: string;
}

/** Fetch with timeout and retries on network errors, 429 and 5xx. Throws HttpError otherwise. */
export async function politeFetch(url: string, opts: FetchOptions = {}): Promise<Response> {
  const { timeoutMs = 20_000, retries = 3, accept = 'application/json' } = opts;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': userAgent(), Accept: accept },
        signal: AbortSignal.timeout(timeoutMs),
        redirect: 'follow',
      });
      if (res.ok) return res;
      if (res.status === 429 || res.status >= 500) {
        lastErr = new HttpError(res.status, url);
        const retryAfter = Number(res.headers.get('retry-after'));
        await sleep(
          Number.isFinite(retryAfter) && retryAfter > 0
            ? Math.min(retryAfter, 30) * 1000
            : backoff(attempt),
        );
        continue;
      }
      throw new HttpError(res.status, url);
    } catch (err) {
      if (err instanceof HttpError && !(err.status === 429 || err.status >= 500)) throw err;
      lastErr = err;
      if (attempt < retries) await sleep(backoff(attempt));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

export async function fetchJson(url: string, opts?: FetchOptions): Promise<unknown> {
  const res = await politeFetch(url, opts);
  return res.json();
}

function backoff(attempt: number): number {
  return Math.min(500 * 2 ** attempt, 8_000) + Math.floor(Math.random() * 250);
}

/** Run tasks with at most `concurrency` in flight and a small delay between task starts. */
export async function mapLimit<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
  delayMs = 200,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i] as T, i);
      if (delayMs) await sleep(delayMs);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}
