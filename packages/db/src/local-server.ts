/**
 * Local development database: PGlite (Postgres compiled to WASM) persisted to ./.pglite at the
 * repo root, exposed over the Postgres wire protocol so every app connects with a normal URL:
 *   DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5433/postgres
 * Not for production. Use Neon there.
 */
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { fileURLToPath } from 'node:url';

const dataDir = fileURLToPath(new URL('../../../.pglite', import.meta.url));
const port = Number(process.env.PGLITE_PORT ?? 5433);

const db = await PGlite.create(dataDir);
const server = new PGLiteSocketServer({ db, port, host: '127.0.0.1', maxConnections: 20 });
await server.start();
console.log(
  `PGlite listening on postgres://postgres:postgres@127.0.0.1:${port}/postgres (data: ${dataDir})`,
);

const shutdown = async () => {
  await server.stop();
  await db.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
