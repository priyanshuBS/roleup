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

## Job pipeline

- **Which jobs are stored.** Tech jobs that someone in India can act on: onsite/hybrid in an Indian city, `remote_india`, `remote_global`, plus `remote_restricted` (US/EU/UK-only). Restricted roles are kept so the "Remote (Restricted)" filter is honest, but **default feeds exclude them**; they show only when that filter is chosen. Onsite/hybrid roles outside India are dropped at crawl time.
- **Bare "Remote"** (no region named) is resolved from the description (India / "must be in the US" / "anywhere in the world"), then company context (Indian HQ → India OK; `remote_first` tag → global), else treated as restricted. We'd rather under-promise India eligibility.
- **APAC/Asia remote counts as India OK**, per the brief. Specific non-India APAC countries (Singapore, Japan, …) are restricted.
- **Tech filter** runs hard exclusions first (recruiter, sales engineer, account executive, product marketing, non-software engineering disciplines), then strong tech signals (which override soft words, so "Marketing Data Engineer" is tech), then soft exclusions, then the department.
- **Role category**: title rules, in order (security, QA, design, product, ML/AI, data, mobile, DevOps, full stack, frontend, backend, customer-facing technical roles → Other tech), then department, then a keyword vote over the description for generic "Software Engineer" titles.
- **Level**: title rules (intern/junior/I/II/III/SDE-1..4/senior/lead/staff/principal/manager), then minimum years from the title or description: ≤1 Entry, ≤4 Mid, ≤9 Senior, 10+ Staff+. Product/Program/Project "Manager" is an IC title, not a people manager; "Group PM" and Director+ are Manager.
- **Salary**: employer data only. Greenhouse pay ranges have no explicit interval, so it's inferred from the label ("Hourly Rate", "Annual base salary"), then magnitude. Non-USD/INR currencies use rough static USD rates (EUR, GBP, CAD, AUD, SGD, AED, CHF, NZD, JPY); unknown currencies get no band. Values outside 1L–50Cr per year are discarded as bad data.
- **Cross-source duplicates** are skipped by fingerprint (company + normalized title + city/remote type). Duplicates _within_ one board (same title, different requisitions) are kept; they're usually distinct openings.
- **Job slugs** are `title-at-company-<hash(source:id)>`, stable across crawls and unique without a DB round trip. The slug is never changed on update, so links don't break.
- **Closing jobs**: on a successful fetch, any job from that board whose `last_seen_at` is older than this run's timestamp is closed. A failed fetch closes nothing.
- **Seed CSV** has one extra column beyond the brief, `hq_country`, which the remote classifier uses for bare "Remote". `pnpm --filter @roleup/workers verify-seed --write` re-verifies every slug against the live API and drops companies with zero India-eligible tech jobs. 48 of 64 candidates passed on 2026-11-23.
- **YC matching** uses the registrable domain (`about.gitlab.com` → `gitlab.com`), then normalized name, and refuses a name match when the websites disagree. Batches are stored as codes: W15, S16, X25 (Spring), F24 (Fall).
- **ATS detection** reads the careers URL itself first (it may already be a board), then fetches the page if robots.txt allows. A detected board is saved only if it actually responds. Pages that render jobs client-side won't be detected; set the ATS manually in admin.
- **Local PGlite needs `DB_POOL_MAX=1`**: the socket server runs a single engine, and concurrent connections interleave protocol messages. Neon has no such limit.

## Web

- **Caching.** List pages read filters from the query string, so they render per request, but every DB read goes through `unstable_cache` (10 min, keyed by filters). Job detail pages are ISR (`revalidate = 600`, generated on first visit). API responses send `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`. A production build needs `DATABASE_URL`, since `/about` and `/sitemap.xml` prerender from the DB.
- **Ordering** is always newest first (`posted_at desc, id desc`) with keyset cursors, including for text search. Relevance ranking would break stable cursors; search narrows rather than ranks.
- **Pagination on the web** is plain links ("Older jobs" / "Back to newest") with `?cursor=`. This works without JavaScript and is crawlable. Mobile uses infinite scroll on the same cursor.
- **Filters UI** uses native `<select>`s (accessible, tiny). The only Radix primitive is Dialog, for the mobile bottom sheet.
- **Logos.** `companies.logo_url` wins. Otherwise the company's favicon via DuckDuckGo's icon service (`no-referrer`), with initials as a fallback. Fixed 28px box, so no layout shift.
- **JSON-LD** is emitted only for open, India-eligible jobs. `baseSalary` only when the salary is employer-provided; `TELECOMMUTE` only for remote types; remote roles list India in `applicantLocationRequirements`. US/EU-only roles get no JobPosting markup and stay out of the sitemap.
- **`/remote-jobs`** defaults to "any remote" (including restricted, clearly labelled), and sub-chips switch type. `/remote-jobs-india` is fixed to India OK.
- **Company directory counts** show India-eligible open jobs next to the total, matching what the default feed shows.
- **CSP** allows inline scripts (JSON-LD and the pre-paint theme snippet) and `https:` images (logos). No third-party scripts are loaded at all.
- **ESLint 9.39.** `eslint-config-next` pulls in `eslint-plugin-react`, which doesn't support ESLint 10 yet.
