import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { createDb, type Db } from '@roleup/db';
import { repoPath } from './paths';

/** Load the repo-root .env (GitHub Actions passes real env vars instead). */
export function loadEnv(): void {
  const p = repoPath('.env');
  if (existsSync(p)) config({ path: p, quiet: true });
}

export function usdInrRate(): number {
  const r = Number(process.env.USD_INR_RATE);
  return Number.isFinite(r) && r > 10 ? r : 84;
}

/** Open a DB connection for a worker run; always close it in `finally`. */
export function openDb(): { db: Db; close: () => Promise<void> } {
  loadEnv();
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set. Copy .env.example to .env (or run `pnpm db:local`).');
    process.exit(1);
  }
  return createDb(url, { max: 5 });
}

export function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

export function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}
