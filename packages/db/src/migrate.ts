import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { migrate as migrateNeon } from 'drizzle-orm/neon-serverless/migrator';
import { migrate as migratePg } from 'drizzle-orm/node-postgres/migrator';
import type { NeonDatabase } from 'drizzle-orm/neon-serverless';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { createDb, isNeonUrl } from './client';

config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true });

// Migrations use the direct (unpooled) connection: PgBouncer in transaction mode breaks DDL.
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || '';
const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url));

const { db, close } = createDb(url, { max: 1 });
try {
  if (isNeonUrl(url)) await migrateNeon(db as unknown as NeonDatabase, { migrationsFolder });
  else await migratePg(db as unknown as NodePgDatabase, { migrationsFolder });
  console.log('migrations applied');
} finally {
  await close();
}
