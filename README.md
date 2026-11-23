# RoleUp

**Tech jobs in India and remote, straight from company career pages.**

RoleUp reads public job boards (Greenhouse, Lever, Ashby) every 6 hours, keeps only tech roles, and labels each one by city, level, salary band and whether a remote role is open to India. Every Apply button goes to the employer's own site.

No accounts. No ads. Saved jobs stay on your device, and resumes are never stored.

---

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Commands](#commands)
- [Admin panel](#admin-panel)
- [Public API](#public-api)
- [Deployment](#deployment)
- [Data sources and privacy](#data-sources-and-privacy)

---

## Features

|                        |                                                                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Latest jobs**        | Newest-first feed with "posted" and "last checked" times                                                                            |
| **Filters**            | Search, role, level, city, work mode, salary band, company type, posted within. All filters live in the URL, so links are shareable |
| **Remote, done right** | Split into _India OK_, _Global_ and _US/EU only_. US/EU-only roles are hidden unless you ask for them                               |
| **Salary bands**       | `<10L`, `10–20L`, `20–40L`, `40–70L`, `70L+`. Employer-posted salaries only; never estimated                                        |
| **Companies & YC**     | Company pages, and YC startups filterable by batch (W15, S20…)                                                                      |
| **Recently funded**    | Funding rounds from public news, approved by a person before they appear                                                            |
| **ATS resume checker** | Upload a PDF/DOCX and get a 0–100 score, the fixes that matter most, and keyword match against any job                              |
| **Saved jobs**         | Stored in the browser (or on your phone); no login                                                                                  |
| **Mobile app**         | Expo app with Latest, Explore, Saved, ATS Check and About tabs                                                                      |
| **Admin**              | Funding review, company management, crawl health, and visitor analytics                                                             |

## Tech stack

- **Monorepo**: pnpm workspaces + Turborepo, TypeScript (strict)
- **Web**: Next.js 16 (App Router), Tailwind CSS v4, Radix Dialog
- **Mobile**: Expo SDK 58, expo-router, React Query
- **Database**: Neon Postgres, Drizzle ORM, Postgres full-text search
- **Workers**: TypeScript scripts run by GitHub Actions on a schedule
- **Tests**: Vitest, with recorded real API responses as fixtures

## Project structure

```
roleup/
├── apps/
│   ├── web/            Website, public API (/api/v1) and admin panel
│   └── mobile/         Expo app (uses the public API)
├── packages/
│   ├── core/           Shared types, constants, classifiers, ATS checker, skills list
│   ├── db/             Database schema, migrations and queries
│   └── ui-tokens/      Colours, spacing and type shared by web and mobile
├── workers/            Job crawler, YC sync, funding tracker, ATS detection
├── data/               Seed companies (CSV) and cities
├── .github/workflows/  CI and scheduled workers
└── DECISIONS.md        Why things are built the way they are
```

---

## Quick start

**You need:** Node.js 24+, pnpm 10, and a free [Neon](https://neon.tech) database.

### 1. Install and configure

```bash
pnpm install
cp .env.example .env
```

Open `.env` and fill in the [environment variables](#environment-variables). At minimum you need `DATABASE_URL`, `DATABASE_URL_UNPOOLED` and `ADMIN_TOKEN`.

### 2. Set up the database and load jobs

```bash
pnpm db:migrate      # create tables
pnpm db:seed         # add cities and 48 starter companies
pnpm crawl           # fetch jobs (~20 seconds)
pnpm sync-yc         # tag Y Combinator companies
pnpm track-funding   # queue funding news for review (optional)
```

### 3. Start the website

```bash
pnpm --filter @roleup/web dev
```

Open **http://localhost:3000**. The admin panel is at **http://localhost:3000/admin**.

### 4. Run the mobile app (optional)

Keep the website running. Find your computer's Wi-Fi IP (`ipconfig` on Windows), then:

```bash
cd apps/mobile
EXPO_PUBLIC_API_URL=http://<your-ip>:3000 npx expo start
```

Scan the QR code with **Expo Go** (phone on the same Wi-Fi). On the Android emulator, use `http://10.0.2.2:3000`.

On Windows PowerShell, set the variable first: `$env:EXPO_PUBLIC_API_URL="http://<your-ip>:3000"; npx expo start`

<details>
<summary><strong>No Neon account? Use the built-in local database</strong></summary>

RoleUp ships with a local Postgres (PGlite) that needs no Docker. In a separate terminal:

```bash
pnpm db:local
```

Then in `.env`:

```
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5433/postgres
DB_POOL_MAX=1
```

`DB_POOL_MAX=1` is required for the local database only. Remove it when you switch to Neon.

</details>

---

## Environment variables

All apps read the single `.env` file at the repo root.

| Variable                | Required | What it's for                                                                              | Production      |
| ----------------------- | :------: | ------------------------------------------------------------------------------------------ | --------------- |
| `DATABASE_URL`          |    ✅    | Neon **pooled** connection (host contains `-pooler`). Used by the website, API and workers | Vercel + GitHub |
| `DATABASE_URL_UNPOOLED` |    ✅    | Neon **direct** connection. Used only for migrations                                       | GitHub          |
| `ADMIN_TOKEN`           |    ✅    | Password for `/admin`. **Must be 16+ characters**, or admin stays disabled                 | Vercel + GitHub |
| `NEXT_PUBLIC_SITE_URL`  |    ✅    | Your site's address, e.g. `https://roleup.in`                                              | Vercel + GitHub |
| `USD_INR_RATE`          |    —     | Dollar-to-rupee rate for salaries and funding (default `84`)                               | Vercel + GitHub |
| `CRAWLER_CONTACT_EMAIL` |    —     | Contact shown in the crawler's User-Agent so job boards can reach you                      | GitHub          |
| `EXPO_PUBLIC_API_URL`   |    —     | Website address the mobile app talks to                                                    | `eas.json`      |
| `DB_POOL_MAX`           |    —     | Local PGlite database only (`1`). Leave unset with Neon                                    | Never           |

Generate a strong admin token with:

```bash
openssl rand -hex 24
```

---

## Commands

Run from the repo root.

| Command                                     | What it does                                                              |
| ------------------------------------------- | ------------------------------------------------------------------------- |
| `pnpm --filter @roleup/web dev`             | Start the website on port 3000                                            |
| `pnpm check`                                | Typecheck, lint and run all tests                                         |
| `pnpm db:migrate`                           | Apply database migrations                                                 |
| `pnpm db:seed`                              | Add or update cities and seed companies (safe to re-run)                  |
| `pnpm db:generate`                          | Create a migration after editing `packages/db/src/schema.ts`              |
| `pnpm crawl`                                | Crawl every company's job board, add new jobs, close removed ones         |
| `pnpm crawl -- --company stripe`            | Crawl one company                                                         |
| `pnpm sync-yc`                              | Tag companies that went through Y Combinator                              |
| `pnpm track-funding`                        | Read funding news and queue rounds for review (`-- --dry-run` to preview) |
| `pnpm detect-ats`                           | Find job boards for companies queued in admin                             |
| `pnpm detect-ats -- --url <careers-url>`    | Test detection on any careers page                                        |
| `pnpm --filter @roleup/workers verify-seed` | Re-check every seed company against the live APIs                         |

---

## Admin panel

Sign in at `/admin` with your `ADMIN_TOKEN`.

| Page              | Use it to                                                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Overview**      | See the latest worker runs, errors, and companies failing to crawl                                                                                                 |
| **Analytics**     | Track page views, visitors, clicks, Apply clicks and apply rate, with a daily chart, top pages, most-applied jobs, referrers, devices and countries (7/30/90 days) |
| **Funding queue** | Check each extracted round against its source, fix details, then approve or reject. Only approved rounds are public                                                |
| **Companies**     | Add or edit companies, set tags, or queue ATS detection for a careers page                                                                                         |

**About analytics:** it is built in, with no cookies and no third-party scripts. It never stores IP addresses. Visitors are counted once per day with a hash that changes daily. Bots, admin pages and visitors with Do Not Track or Global Privacy Control are excluded.

---

## Public API

Read-only JSON API used by the mobile app. CORS is open; responses are cached for a few minutes.

| Endpoint                      | Returns                                                                                                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /api/v1/jobs`            | Jobs, newest first. Accepts every filter (`q`, `category`, `level`, `city`, `remote`, `band`, `tag`, `posted`, `company`, `batch`) plus `cursor` and `limit` |
| `GET /api/v1/jobs/:id`        | One job by id or slug                                                                                                                                        |
| `GET /api/v1/companies`       | Companies (`tag`, `city`, `hasJobs`, `q`)                                                                                                                    |
| `GET /api/v1/companies/:slug` | One company and its open jobs                                                                                                                                |
| `GET /api/v1/funding`         | Approved funding rounds with each company's open job count                                                                                                   |
| `GET /api/v1/meta/filters`    | Cities, categories, levels, salary bands, tags and YC batches with counts                                                                                    |
| `POST /api/v1/ats-check`      | Resume check (multipart: `file`, optional `jd` or `job`). 10 checks/hour                                                                                     |

Example:

```bash
curl "http://localhost:3000/api/v1/jobs?city=bengaluru&category=backend&limit=5"
```

---

## Deployment

### 1. Database (Neon)

1. Create a Neon project in **Singapore** (`aws-ap-southeast-1`), the closest region to India.
2. Copy the **pooled** and **direct** connection strings into `.env`.
3. Load the data: `pnpm db:migrate && pnpm db:seed && pnpm crawl && pnpm sync-yc`

### 2. Website (Vercel)

1. Import the GitHub repo and set **Root Directory** to `apps/web`.
2. Add environment variables: `DATABASE_URL`, `ADMIN_TOKEN`, `NEXT_PUBLIC_SITE_URL`, `USD_INR_RATE`.
3. Deploy. The database must be set up first, since some pages are built from it.
4. Add your domain and submit `https://<your-domain>/sitemap.xml` in Google Search Console.

### 3. Scheduled workers (GitHub Actions)

The **Workers** workflow crawls jobs every 6 hours and runs the YC sync, funding tracker and ATS detection daily. Each run applies migrations first and refreshes the site's cache afterwards.

In **Settings → Secrets and variables → Actions**, add:

| Name                    | Type     | Value                         |
| ----------------------- | -------- | ----------------------------- |
| `DATABASE_URL`          | Secret   | Neon pooled URL               |
| `DATABASE_URL_UNPOOLED` | Secret   | Neon direct URL               |
| `ADMIN_TOKEN`           | Secret   | Same as Vercel                |
| `CRAWLER_CONTACT_EMAIL` | Secret   | Contact email for the crawler |
| `SITE_URL`              | Variable | e.g. `https://roleup.in`      |
| `USD_INR_RATE`          | Variable | e.g. `84`                     |

Then run it once: **Actions → Workers → Run workflow → all**. The **CI** workflow checks every push automatically.

### 4. Mobile app (EAS)

```bash
npm install -g eas-cli
cd apps/mobile
eas login
eas init
```

Set your real website address in `apps/mobile/eas.json` (`EXPO_PUBLIC_API_URL`), then:

```bash
eas build --platform android --profile preview   # installable APK for testing
eas build --platform all --profile production    # store builds
eas submit --platform android                    # publish (and --platform ios)
```

The app id is `app.roleup.jobs`. Change it in `app.json` before your first store build if you want a different one.

---

## Data sources and privacy

- **Jobs** come only from public ATS job-board APIs. RoleUp never scrapes LinkedIn, Naukri, Indeed, Glassdoor or any page behind a login.
- **YC tags** come from the public community YC company list. Only the batch and domain are stored.
- **Funding** comes from public news feeds (Economic Times, Inc42, TechCrunch). Only facts and the source link are kept, and every entry is reviewed before it is shown.
- **Resumes** are read in memory, scored and discarded. They are never saved or logged.
- **Analytics** are first-party and cookieless, with no IPs stored (see [Admin panel](#admin-panel)).

For the reasoning behind these choices, see [DECISIONS.md](DECISIONS.md).
