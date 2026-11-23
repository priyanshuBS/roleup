import { describe, expect, it } from 'vitest';
import { extractFunding } from '@roleup/core';
import { parseFeed } from './rss';

const RSS = `<?xml version="1.0"?><rss version="2.0"><channel><title>Feed</title>
<item><title><![CDATA[Data Security Startup Matters.AI Nets &#8377;115 Cr From Tanglin, Others]]></title>
<link>https://inc42.com/buzz/matters-ai-funding/?utm_source=rss</link><pubDate>Mon, 23 Nov 2026 06:00:00 +0530</pubDate>
<description><![CDATA[<p>The pre-Series A round saw participation from…</p>]]></description></item>
<item><title>Congress protests against content moderation</title><link>https://inc42.com/x</link></item>
<item><title>No link item</title></item>
</channel></rss>`;

const ATOM = `<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Acme raises $12M Series A</title>
<link href="https://example.com/acme"/><updated>2026-11-20T10:00:00Z</updated></entry></feed>`;

describe('parseFeed', () => {
  it('parses RSS 2.0 with CDATA and entities, skipping items without links', () => {
    const items = parseFeed(RSS);
    expect(items).toHaveLength(2);
    expect(items[0]!.title).toBe(
      'Data Security Startup Matters.AI Nets ₹115 Cr From Tanglin, Others',
    );
    expect(items[0]!.publishedAt?.toISOString()).toBe('2026-11-23T00:30:00.000Z');
    expect(items[0]!.summary).toContain('pre-Series A');
  });

  it('parses Atom', () => {
    const [item] = parseFeed(ATOM);
    expect(item).toMatchObject({
      title: 'Acme raises $12M Series A',
      link: 'https://example.com/acme',
    });
  });

  it('feeds the extractor: round from summary, non-funding ignored', () => {
    const [funding, news] = parseFeed(RSS).map((i) => extractFunding(i.title, 84, i.summary));
    expect(funding).toMatchObject({
      company: 'Matters.AI',
      round: 'Pre-Series A',
      currency: 'INR',
      amountInr: 115e7,
    });
    expect(news).toBeNull();
  });
});
