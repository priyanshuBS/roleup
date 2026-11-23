# RoleUp

Tech jobs in India and remote-from-India, read straight from company job boards (Greenhouse, Lever, Ashby). It has a website, a lightweight mobile app, and a free ATS resume checker. There are no accounts; saved jobs stay on the device.

```
apps/web        Next.js 16 site, public API (/api/v1/*), admin panel
apps/mobile     Expo (React Native) app using the public API
packages/db     Drizzle schema, migrations, queries, Neon/pg client
packages/core   Shared types, constants, classifiers, ATS checker engine, skills dictionary
packages/ui-tokens  Colours, spacing and type shared by web (Tailwind) and mobile
workers         crawl-jobs, sync-yc, track-funding, detect-ats (run by GitHub Actions)
data            companies.seed.csv, cities.json
```

Design and product decisions, with the reasons behind them, are in [DECISIONS.md](DECISIONS.md).

## Run locally

Requirements: Node 24+, pnpm 10.

```bash
pnpm install
cp .env.example .env            # then edit; see below
```

**Database.** Either use a Neon branch (put its URLs in `.env`), or run the bundled local Postgres (PGlite, no Docker needed) in a separate terminal:

```bash
pnpm db:local                   # Postgres on 127.0.0.1:5433, data in ./.pglite
# .env:
#   DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5433/postgres
#   DB_POOL_MAX=1               # required for PGlite (single connection)
```

Then:

```bash
pnpm db:migrate                 # create tables, indexes, FTS trigger
pnpm db:seed                    # cities + 48 seed companies
pnpm crawl                      # fetch jobs (~20s)
pnpm sync-yc                    # tag YC companies
pnpm track-funding              # queue funding news for review
pnpm --filter @roleup/web dev   # http://localhost:3000
```

Admin is at `/admin` and needs `ADMIN_TOKEN` (16+ characters) in `.env`.

**Mobile.** Point it at your machine's LAN IP, not `localhost`, when using a phone:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.20:3000 pnpm --filter @roleup/mobile start
```

**Checks:**

```bash
pnpm check                      # typecheck + lint + tests across the monorepo
pnpm --filter @roleup/workers verify-seed   # re-verify every seed board against the live APIs
```

### Useful worker commands

| Command                                                | What it does                                                   |
| ------------------------------------------------------ | -------------------------------------------------------------- |
| `pnpm crawl [-- --company stripe]`                     | Crawl all boards (or one), upsert jobs, close removed ones     |
| `pnpm sync-yc`                                         | Match companies to YC's public list, set `yc` tag + batch      |
| `pnpm track-funding [-- --dry-run]`                    | Read funding RSS, queue extracted rounds as `pending`          |
| `pnpm detect-ats [-- --url https://acme.com/careers]`  | Find a company's Greenhouse/Lever/Ashby board                  |
| `pnpm --filter @roleup/workers verify-seed -- --write` | Drop seed companies with no India-eligible tech jobs           |
| `pnpm db:generate`                                     | Generate a migration after editing `packages/db/src/schema.ts` |

## Deploy

### 1. Neon (database)

1. Create a Neon project, region `aws-ap-southeast-1` (Singapore) or the closest to Mumbai.
2. Copy two connection strings from the dashboard:
   - **Pooled** (host contains `-pooler`) → `DATABASE_URL`
   - **Direct** → `DATABASE_URL_UNPOOLED` (migrations only)
3. From your machine, with those in `.env`: `pnpm db:migrate && pnpm db:seed && pnpm crawl && pnpm sync-yc`.

### 2. Vercel (website + API)

1. Import the GitHub repo in Vercel. Set **Root Directory** to `apps/web`. Vercel detects Next.js and pnpm and installs from the repo root.
2. Environment variables (Production and Preview):
   - `DATABASE_URL`: Neon pooled URL
   - `ADMIN_TOKEN`: long random string (`openssl rand -hex 32`)
   - `NEXT_PUBLIC_SITE_URL`: e.g. `https://roleup.in`
   - `USD_INR_RATE`: e.g. `84`
3. Deploy. The build reads the database (`/about` and the sitemap are prerendered), so the DB must be migrated and seeded first.
4. Add your domain, then check `https://<domain>/sitemap.xml` and submit it in Google Search Console.

### 3. GitHub Actions (workers)

`.github/workflows/crawl.yml` runs `crawl-jobs` every 6 hours, and `sync-yc`, `track-funding` and `detect-ats` daily at 08:11 IST. Each run applies migrations and seeds first (both idempotent), then pings the site to refresh caches.

In **Settings → Secrets and variables → Actions**:

| Name                    | Kind     | Value                                        |
| ----------------------- | -------- | -------------------------------------------- |
| `DATABASE_URL`          | secret   | Neon pooled URL                              |
| `DATABASE_URL_UNPOOLED` | secret   | Neon direct URL                              |
| `ADMIN_TOKEN`           | secret   | same as Vercel                               |
| `CRAWLER_CONTACT_EMAIL` | secret   | a contact address for the crawler User-Agent |
| `SITE_URL`              | variable | e.g. `https://roleup.in`                     |
| `USD_INR_RATE`          | variable | e.g. `84`                                    |

Run it once by hand: **Actions → Workers → Run workflow → all**. CI (`ci.yml`) runs typecheck, lint and tests on every push.

### 4. EAS (mobile)

```bash
npm i -g eas-cli
cd apps/mobile
eas login
eas init                         # links the project, writes the EAS project id
# set your real domain in eas.json → build.*.env.EXPO_PUBLIC_API_URL
eas build --platform android --profile preview      # installable APK for testing
eas build --platform all --profile production
eas submit --platform android    # / ios, once store listings exist
```

Bundle identifiers are `app.roleup.jobs` (iOS and Android). Change them in `app.json` before the first store build if you want a different one.

## Daily operations

- **Funding queue**: `/admin/funding`. Check each entry against its source, fix the company/round/amount, then approve or reject. Only approved rounds are public.
- **Add a company**: `/admin/companies`. Enter the careers URL and either set the ATS + board slug, or leave ATS as `none` and click "Queue ATS detection". The board is crawled on the next run.
- **Crawl health**: `/admin` lists the last worker runs and any companies failing to crawl (`invalid_slug` means the board no longer exists).

## Data sources and rules

- Jobs come only from public ATS board APIs. We never scrape LinkedIn, Naukri, Indeed, Glassdoor or any logged-in page, and every Apply button goes to the employer's own page.
- YC tags come from the community YC company list (`yc-oss.github.io`); only the batch and domain are stored.
- Funding: public RSS feeds (ET Tech, Inc42, TechCrunch). Only facts and the source link are stored, and a person reviews every entry.
- Resumes are processed in memory and never stored or logged.
