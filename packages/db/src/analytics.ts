/** First-party analytics: recording events and the admin dashboard summary. */
import { and, count, desc, eq, gte, inArray, lt, sql, type SQL } from 'drizzle-orm';
import type { Db } from './client';
import { analyticsEvents, companies, jobs } from './schema';

export interface NewAnalyticsEvent {
  type: 'view' | 'click';
  path: string;
  target?: string | null;
  label?: string | null;
  referrer?: string | null;
  device: 'mobile' | 'tablet' | 'desktop';
  country?: string | null;
  visitor: string;
  query?: string | null;
  entry?: boolean;
}

/** Keep about 13 months; pruned opportunistically on write. */
const RETENTION_DAYS = 400;

export async function recordEvent(db: Db, e: NewAnalyticsEvent): Promise<void> {
  await db.insert(analyticsEvents).values(e);
  if (Math.random() < 0.001) {
    await db
      .delete(analyticsEvents)
      .where(sql`${analyticsEvents.createdAt} < now() - make_interval(days => ${RETENTION_DAYS})`);
  }
}

/** Day bucket in Indian Standard Time. */
const day = sql<string>`to_char(${analyticsEvents.createdAt} at time zone 'Asia/Kolkata', 'YYYY-MM-DD')`;
/** A visitor counted once per day (the hash already rotates daily). */
const visits = sql<number>`count(distinct ${analyticsEvents.visitor})::int`;
/** Job detail pages: /jobs/<slug>, excluding /jobs/in/* and /jobs/salary/*. */
const isJobPage = sql`${analyticsEvents.path} ~ '^/jobs/[^/]+$'`;

export interface AnalyticsSummary {
  range: { days: number; from: string; to: string };
  totals: Totals;
  previous: Totals;
  daily: { day: string; views: number; visitors: number; clicks: number }[];
  topPages: { path: string; views: number; visitors: number }[];
  topClicks: { target: string; label: string | null; clicks: number }[];
  topApplies: {
    slug: string;
    title: string | null;
    company: string | null;
    clicks: number;
    views: number;
  }[];
  referrers: { host: string; views: number }[];
  devices: { device: string; views: number }[];
  countries: { country: string; views: number }[];
  activeNow: number;
}

interface Totals {
  views: number;
  visitors: number;
  clicks: number;
  applyClicks: number;
  jobViews: number;
}

async function totals(db: Db, from: Date, to: Date): Promise<Totals> {
  const inRange = and(gte(analyticsEvents.createdAt, from), lt(analyticsEvents.createdAt, to));
  const [row] = await db
    .select({
      views: sql<number>`count(*) filter (where ${analyticsEvents.type} = 'view')::int`,
      clicks: sql<number>`count(*) filter (where ${analyticsEvents.type} = 'click')::int`,
      applyClicks: sql<number>`count(*) filter (where ${analyticsEvents.type} = 'click' and ${analyticsEvents.target} like 'apply:%')::int`,
      jobViews: sql<number>`count(*) filter (where ${analyticsEvents.type} = 'view' and ${isJobPage})::int`,
    })
    .from(analyticsEvents)
    .where(inRange);
  // Visitors = sum of daily unique visitors (the hash can't link days).
  const [v] = await db.select({ n: sql<number>`coalesce(sum(d.n), 0)::int` }).from(
    db
      .select({ n: visits.as('n') })
      .from(analyticsEvents)
      .where(and(inRange, eq(analyticsEvents.type, 'view')))
      .groupBy(day)
      .as('d'),
  );
  return {
    views: row?.views ?? 0,
    clicks: row?.clicks ?? 0,
    applyClicks: row?.applyClicks ?? 0,
    jobViews: row?.jobViews ?? 0,
    visitors: v?.n ?? 0,
  };
}

function istMidnight(daysAgo: number, now: Date): Date {
  // Start of the IST day `daysAgo` days before today (IST = UTC+5:30).
  const ist = new Date(now.getTime() + 330 * 60_000);
  ist.setUTCHours(0, 0, 0, 0);
  return new Date(ist.getTime() - daysAgo * 86_400_000 - 330 * 60_000);
}

export async function analyticsSummary(
  db: Db,
  days: number,
  now: Date = new Date(),
): Promise<AnalyticsSummary> {
  const from = istMidnight(days - 1, now);
  const to = now;
  const prevFrom = new Date(from.getTime() - days * 86_400_000);
  const inRange: SQL = and(
    gte(analyticsEvents.createdAt, from),
    lt(analyticsEvents.createdAt, to),
  ) as SQL;
  const views = and(inRange, eq(analyticsEvents.type, 'view'));
  const clicks = and(inRange, eq(analyticsEvents.type, 'click'));

  const [
    cur,
    prev,
    dailyRows,
    topPages,
    topClicks,
    applyRows,
    referrers,
    devices,
    countries,
    [active],
  ] = await Promise.all([
    totals(db, from, to),
    totals(db, prevFrom, from),
    db
      .select({
        day,
        views: sql<number>`count(*) filter (where ${analyticsEvents.type} = 'view')::int`,
        visitors: sql<number>`count(distinct ${analyticsEvents.visitor}) filter (where ${analyticsEvents.type} = 'view')::int`,
        clicks: sql<number>`count(*) filter (where ${analyticsEvents.type} = 'click')::int`,
      })
      .from(analyticsEvents)
      .where(inRange)
      .groupBy(day),
    db
      .select({ path: analyticsEvents.path, views: count(), visitors: visits })
      .from(analyticsEvents)
      .where(views)
      .groupBy(analyticsEvents.path)
      .orderBy(desc(count()))
      .limit(15),
    db
      .select({
        target: sql<string>`${analyticsEvents.target}`,
        label: sql<string | null>`max(${analyticsEvents.label})`,
        clicks: count(),
      })
      .from(analyticsEvents)
      .where(
        and(
          clicks,
          sql`${analyticsEvents.target} is not null and ${analyticsEvents.target} not like 'apply:%'`,
        ),
      )
      .groupBy(analyticsEvents.target)
      .orderBy(desc(count()))
      .limit(15),
    db
      .select({ slug: sql<string>`substring(${analyticsEvents.target} from 7)`, clicks: count() })
      .from(analyticsEvents)
      .where(and(clicks, sql`${analyticsEvents.target} like 'apply:%'`))
      .groupBy(sql`1`)
      .orderBy(desc(count()))
      .limit(10),
    db
      .select({ host: sql<string>`${analyticsEvents.referrer}`, views: count() })
      .from(analyticsEvents)
      .where(and(views, sql`${analyticsEvents.referrer} is not null`))
      .groupBy(analyticsEvents.referrer)
      .orderBy(desc(count()))
      .limit(10),
    db
      .select({ device: analyticsEvents.device, views: count() })
      .from(analyticsEvents)
      .where(views)
      .groupBy(analyticsEvents.device)
      .orderBy(desc(count())),
    db
      .select({ country: sql<string>`coalesce(${analyticsEvents.country}, '??')`, views: count() })
      .from(analyticsEvents)
      .where(views)
      .groupBy(sql`1`)
      .orderBy(desc(count()))
      .limit(10),
    db
      .select({ n: visits })
      .from(analyticsEvents)
      .where(gte(analyticsEvents.createdAt, new Date(now.getTime() - 30 * 60_000))),
  ]);

  // Fill every day in range so the chart has no gaps.
  const byDay = new Map(dailyRows.map((r) => [r.day, r]));
  const daily: AnalyticsSummary['daily'] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(istMidnight(i, now).getTime() + 330 * 60_000).toISOString().slice(0, 10);
    const r = byDay.get(d);
    daily.push({
      day: d,
      views: r?.views ?? 0,
      visitors: r?.visitors ?? 0,
      clicks: r?.clicks ?? 0,
    });
  }

  // Resolve job slugs for apply clicks, and count each job's page views for a click-through rate.
  const slugs = applyRows.map((r) => r.slug);
  const jobInfo = slugs.length
    ? await db
        .select({ slug: jobs.slug, title: jobs.title, company: companies.name })
        .from(jobs)
        .innerJoin(companies, eq(companies.id, jobs.companyId))
        .where(inArray(jobs.slug, slugs))
    : [];
  const jobViewRows = slugs.length
    ? await db
        .select({ path: analyticsEvents.path, n: count() })
        .from(analyticsEvents)
        .where(
          and(
            views,
            inArray(
              analyticsEvents.path,
              slugs.map((s) => `/jobs/${s}`),
            ),
          ),
        )
        .groupBy(analyticsEvents.path)
    : [];
  const info = new Map(jobInfo.map((j) => [j.slug, j]));
  const jv = new Map(jobViewRows.map((r) => [r.path, r.n]));

  return {
    range: { days, from: from.toISOString(), to: to.toISOString() },
    totals: cur,
    previous: prev,
    daily,
    topPages,
    topClicks,
    topApplies: applyRows.map((r) => ({
      slug: r.slug,
      title: info.get(r.slug)?.title ?? null,
      company: info.get(r.slug)?.company ?? null,
      clicks: r.clicks,
      views: jv.get(`/jobs/${r.slug}`) ?? 0,
    })),
    referrers,
    devices,
    countries,
    activeNow: active?.n ?? 0,
  };
}

export interface AnalyticsInsights {
  /** Visitor-days: each visitor counted once per IST day (the hash rotates daily). */
  funnel: { visited: number; viewedJob: number; applied: number };
  searches: { query: string; searches: number; visitors: number }[];
  landing: { path: string; visits: number }[];
  /** Views per IST hour of day, 0-23. */
  hours: number[];
  sections: { section: string; views: number }[];
  companies: { slug: string; name: string; views: number }[];
  appDownloads: number;
}

const SECTION = sql<string>`case
  when ${analyticsEvents.path} = '/' then 'Home'
  when ${analyticsEvents.path} ~ '^/jobs/in/' then 'City pages'
  when ${analyticsEvents.path} ~ '^/jobs/salary/' then 'Salary pages'
  when ${analyticsEvents.path} ~ '^/jobs/[^/]+$' then 'Job pages'
  when ${analyticsEvents.path} ~ '^/remote-jobs' then 'Remote'
  when ${analyticsEvents.path} ~ '^/companies' then 'Companies'
  when ${analyticsEvents.path} ~ '^/yc-jobs' then 'YC'
  when ${analyticsEvents.path} ~ '^/funded' then 'Funded startups'
  when ${analyticsEvents.path} ~ '^/ats-checker' then 'Resume checker'
  when ${analyticsEvents.path} ~ '^/saved' then 'Saved'
  when ${analyticsEvents.path} ~ '^/app' then 'App page'
  else 'Other' end`;

export async function analyticsInsights(
  db: Db,
  days: number,
  now: Date = new Date(),
): Promise<AnalyticsInsights> {
  const from = istMidnight(days - 1, now);
  const inRange = and(gte(analyticsEvents.createdAt, from), lt(analyticsEvents.createdAt, now));
  const views = and(inRange, eq(analyticsEvents.type, 'view'));

  const [[funnel], searches, landing, hourRows, sections, jobCompanyRows, companyPageRows, [app]] =
    await Promise.all([
      db
        .select({
          visited: sql<number>`count(*)::int`,
          viewedJob: sql<number>`count(*) filter (where d.job)::int`,
          applied: sql<number>`count(*) filter (where d.apply)::int`,
        })
        .from(
          db
            .select({
              job: sql<boolean>`bool_or(${analyticsEvents.type} = 'view' and ${isJobPage})`.as(
                'job',
              ),
              apply:
                sql<boolean>`bool_or(${analyticsEvents.type} = 'click' and ${analyticsEvents.target} like 'apply:%')`.as(
                  'apply',
                ),
            })
            .from(analyticsEvents)
            .where(inRange)
            .groupBy(day, analyticsEvents.visitor)
            .as('d'),
        ),
      db
        .select({
          query: sql<string>`${analyticsEvents.query}`,
          searches: count(),
          visitors: visits,
        })
        .from(analyticsEvents)
        .where(and(views, sql`${analyticsEvents.query} is not null`))
        .groupBy(analyticsEvents.query)
        .orderBy(desc(count()))
        .limit(20),
      db
        .select({ path: analyticsEvents.path, visits: count() })
        .from(analyticsEvents)
        .where(and(views, eq(analyticsEvents.entry, true)))
        .groupBy(analyticsEvents.path)
        .orderBy(desc(count()))
        .limit(10),
      db
        .select({
          hour: sql<number>`extract(hour from ${analyticsEvents.createdAt} at time zone 'Asia/Kolkata')::int`,
          views: count(),
        })
        .from(analyticsEvents)
        .where(views)
        .groupBy(sql`1`),
      db
        .select({ section: SECTION, views: count() })
        .from(analyticsEvents)
        .where(views)
        .groupBy(sql`1`)
        .orderBy(desc(count())),
      db
        .select({ slug: companies.slug, name: companies.name, views: count() })
        .from(analyticsEvents)
        .innerJoin(jobs, sql`${analyticsEvents.path} = '/jobs/' || ${jobs.slug}`)
        .innerJoin(companies, eq(companies.id, jobs.companyId))
        .where(views)
        .groupBy(companies.slug, companies.name),
      db
        .select({ slug: companies.slug, name: companies.name, views: count() })
        .from(analyticsEvents)
        .innerJoin(companies, sql`${analyticsEvents.path} = '/companies/' || ${companies.slug}`)
        .where(views)
        .groupBy(companies.slug, companies.name),
      db
        .select({ n: count() })
        .from(analyticsEvents)
        .where(
          and(
            inRange,
            eq(analyticsEvents.type, 'click'),
            eq(analyticsEvents.target, 'app:download'),
          ),
        ),
    ]);

  const hours = Array.from({ length: 24 }, () => 0);
  for (const r of hourRows) hours[r.hour] = r.views;
  const byCompany = new Map<string, { slug: string; name: string; views: number }>();
  for (const r of [...jobCompanyRows, ...companyPageRows]) {
    const cur = byCompany.get(r.slug);
    if (cur) cur.views += r.views;
    else byCompany.set(r.slug, { ...r });
  }

  return {
    funnel: {
      visited: funnel?.visited ?? 0,
      viewedJob: funnel?.viewedJob ?? 0,
      applied: funnel?.applied ?? 0,
    },
    searches,
    landing,
    hours,
    sections,
    companies: [...byCompany.values()].sort((a, b) => b.views - a.views).slice(0, 10),
    appDownloads: app?.n ?? 0,
  };
}

/** Daily rows for CSV export. */
export async function analyticsDailyCsv(db: Db, days: number, now: Date = new Date()) {
  const s = await analyticsSummary(db, days, now);
  const lines = [
    'date,views,visitors,clicks',
    ...s.daily.map((d) => `${d.day},${d.views},${d.visitors},${d.clicks}`),
  ];
  return lines.join('\n') + '\n';
}
