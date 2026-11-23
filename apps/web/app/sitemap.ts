import type { MetadataRoute } from 'next';
import { getSitemapData } from '@/lib/data';
import { absoluteUrl } from '@/lib/site';
import { bandHref, cityHref, companyHref, ycBatchHref } from '@/lib/urls';

export const revalidate = 3600;

/** Only pages that currently have open jobs. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { jobs, companies, meta } = await getSitemapData();
  const now = new Date();
  const lastmod = meta.lastCrawledAt ? new Date(meta.lastCrawledAt) : now;
  const page = (path: string, priority = 0.6) => ({
    url: absoluteUrl(path),
    lastModified: lastmod,
    changeFrequency: 'hourly' as const,
    priority,
  });

  const remoteIndia = meta.remote.find((r) => r.value === 'remote_india')?.count ?? 0;
  const anyRemote = meta.remote
    .filter((r) => r.value.startsWith('remote_'))
    .reduce((a, r) => a + r.count, 0);
  const yc = meta.tags.find((t) => t.value === 'yc')?.count ?? 0;

  return [
    page('/', 1),
    page('/companies', 0.8),
    ...(yc ? [page('/yc-jobs', 0.8)] : []),
    ...(anyRemote ? [page('/remote-jobs', 0.8)] : []),
    ...(remoteIndia ? [page('/remote-jobs-india', 0.8)] : []),
    page('/ats-checker', 0.5),
    ...meta.cities.filter((c) => c.count > 0).map((c) => page(cityHref(c.slug), 0.7)),
    ...meta.bands.filter((b) => b.count > 0).map((b) => page(bandHref(b.slug), 0.6)),
    ...meta.ycBatches.filter((b) => b.count > 0).map((b) => page(ycBatchHref(b.batch), 0.5)),
    ...companies.map((c) => ({
      url: absoluteUrl(companyHref(c.slug)),
      lastModified: c.updatedAt ?? lastmod,
      changeFrequency: 'daily' as const,
      priority: 0.6,
    })),
    ...jobs.map((j) => ({
      url: absoluteUrl(`/jobs/${j.slug}`),
      lastModified: j.lastSeenAt,
      changeFrequency: 'daily' as const,
      priority: 0.5,
    })),
  ];
}
