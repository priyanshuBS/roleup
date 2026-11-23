import { Pool as NeonPool } from '@neondatabase/serverless';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';

export type Schema = typeof schema;
export type Db = PgDatabase<PgQueryResultHKT, Schema>;

/**
 * Neon URLs (host ends in neon.tech) use the Neon serverless driver over WebSockets, which works
 * on Vercel functions and supports transactions. Anything else (local PGlite socket server,
 * Docker Postgres, CI service container) uses node-postgres.
 */
export function isNeonUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith('.neon.tech');
  } catch {
    return false;
  }
}

export function createDb(
  url: string,
  opts: { max?: number } = {},
): { db: Db; close: () => Promise<void> } {
  if (!url) throw new Error('DATABASE_URL is not set. See .env.example.');
  // DB_POOL_MAX=1 is required with the local PGlite socket server (one engine, one connection).
  const envMax = Number(process.env.DB_POOL_MAX);
  if (Number.isInteger(envMax) && envMax > 0) opts = { ...opts, max: envMax };
  if (isNeonUrl(url)) {
    const pool = new NeonPool({ connectionString: url, max: opts.max ?? 5 });
    return { db: drizzleNeon(pool, { schema }) as unknown as Db, close: () => pool.end() };
  }
  const pool = new pg.Pool({ connectionString: url, max: opts.max ?? 5 });
  return { db: drizzlePg(pool, { schema }) as unknown as Db, close: () => pool.end() };
}

const globalForDb = globalThis as unknown as {
  __roleupDb?: { db: Db; close: () => Promise<void> };
};

/** Process-wide singleton (survives Next.js dev hot reloads). */
export function getDb(): Db {
  if (!globalForDb.__roleupDb) {
    globalForDb.__roleupDb = createDb(process.env.DATABASE_URL ?? '');
  }
  return globalForDb.__roleupDb.db;
}

export async function closeDb(): Promise<void> {
  if (globalForDb.__roleupDb) {
    await globalForDb.__roleupDb.close();
    globalForDb.__roleupDb = undefined;
  }
}
