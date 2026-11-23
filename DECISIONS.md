# Decisions

Choices made where the brief was ambiguous or where a constraint forced a call. Newest at the bottom of each section.

## Foundation

- **TypeScript 6.0, not 7.** TS 7 (the native Go port) is out, but `typescript-eslint` supports `<6.1`. Pinned 6.0.3.
- **Internal packages ship TypeScript source.** `@roleup/core`, `@roleup/db` and `@roleup/ui-tokens` export `src/*.ts` directly (no build step). Next.js compiles them via `transpilePackages`, workers via `tsx`, Expo via Metro. Each package type-checks on its own with `tsc --noEmit`.
- **Exact version pins** in every `package.json` (no `^`) so CI, Vercel and EAS resolve identically.
- **Local database = PGlite over the Postgres wire protocol.** Docker isn't always available, and Neon needs a secret. `pnpm db:local` runs PGlite (WASM Postgres) persisted to `.pglite/`, exposed on `127.0.0.1:5433` via `@electric-sql/pglite-socket`. The db client uses the Neon serverless driver (WebSocket `Pool`, supports transactions) when the host ends in `.neon.tech`, otherwise `node-postgres`. So the same code runs against local PGlite, a Docker Postgres or a CI service container. Production is Neon.
- **Migrations** run with the drizzle migrator (`pnpm db:migrate`) against `DATABASE_URL_UNPOOLED`, falling back to `DATABASE_URL`. DDL should not go through PgBouncer.
- **Full-text search** uses a `tsvector` column on `jobs`, maintained by a trigger (custom migration `0001_fts_trigger`) so company name can be included. Uses the `simple` config so tech tokens (`golang`, `k8s`, `node.js`) aren't stemmed.
- **Salary bands** are assigned by the _top_ of the employer range converted to INR/year (a 18–25L role sits in 20–40L). Slugs: `under-10-lpa`, `10-20-lpa`, `20-40-lpa`, `40-70-lpa`, `70-lpa-plus`, `not-disclosed`.
- **Cities**: `packages/core/src/data/cities.ts` is the source of truth. `data/cities.json` is generated from it and a test keeps them in sync. Gurugram, Noida, Ghaziabad and Faridabad fold into **Delhi NCR**.
- **Rate limiting** is stored in Postgres (`rate_limits`, fixed window, keyed by a salted hash of the IP). In-memory limits don't work across Vercel instances, and Redis would be another paid/managed dependency.
- **Filters in the URL** are parsed leniently: unknown values are dropped, not rejected, so old shared links never error.
