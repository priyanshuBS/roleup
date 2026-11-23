import { XMLParser } from 'fast-xml-parser';
import { decodeEntities } from '@roleup/core';
import { z } from 'zod';

export interface FeedItem {
  title: string;
  link: string;
  publishedAt: Date | null;
  /** Short summary used only transiently for extraction; never stored. */
  summary: string;
}

const text = z
  .union([
    z.string(),
    z.number(),
    z.object({ '#text': z.union([z.string(), z.number()]) }).passthrough(),
  ])
  .transform((v) => (typeof v === 'object' ? String(v['#text']) : String(v)));

const rssItem = z
  .object({
    title: text.optional(),
    link: z.union([text, z.object({ '@_href': z.string() }).passthrough()]).optional(),
    pubDate: text.optional(),
    published: text.optional(),
    updated: text.optional(),
    description: text.optional(),
    summary: text.optional(),
  })
  .passthrough();

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  cdataPropName: false,
  processEntities: true,
});

/** Parse RSS 2.0 or Atom into plain items. Invalid items are skipped. */
export function parseFeed(xml: string): FeedItem[] {
  const doc = parser.parse(xml) as Record<string, unknown>;
  const rss = (doc.rss as { channel?: { item?: unknown } } | undefined)?.channel?.item;
  const atom = (doc.feed as { entry?: unknown } | undefined)?.entry;
  const raw = rss ?? atom ?? [];
  const list = Array.isArray(raw) ? raw : [raw];
  const out: FeedItem[] = [];
  for (const r of list) {
    const p = rssItem.safeParse(r);
    if (!p.success || !p.data.title) continue;
    const linkVal = p.data.link;
    const link =
      typeof linkVal === 'string'
        ? linkVal
        : linkVal && '@_href' in linkVal
          ? linkVal['@_href']
          : '';
    if (!/^https?:\/\//.test(link)) continue;
    const date = p.data.pubDate ?? p.data.published ?? p.data.updated;
    const d = date ? new Date(date) : null;
    out.push({
      title: decodeEntities(p.data.title).replace(/\s+/g, ' ').trim(),
      link: link.trim(),
      publishedAt: d && !Number.isNaN(d.getTime()) ? d : null,
      summary: decodeEntities((p.data.description ?? p.data.summary ?? '').replace(/<[^>]+>/g, ' '))
        .replace(/\s+/g, ' ')
        .slice(0, 500),
    });
  }
  return out;
}
