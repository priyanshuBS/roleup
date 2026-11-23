/**
 * Public RSS feeds read by track-funding. We use only each item's headline, link and date to
 * extract facts (company, round, amount); article text is never stored. Each feed's robots.txt
 * allows these paths (checked 2026-11-23). Add or remove feeds here.
 */
export interface FundingSource {
  name: string;
  url: string;
  /** Feeds that mix funding with other news; extraction filters them. */
  mixed: boolean;
}

export const FUNDING_SOURCES: FundingSource[] = [
  {
    name: 'Economic Times Tech: Funding',
    url: 'https://economictimes.indiatimes.com/tech/funding/rssfeeds/78570540.cms',
    mixed: true,
  },
  { name: 'Inc42', url: 'https://inc42.com/feed/', mixed: true },
  { name: 'TechCrunch: Funding', url: 'https://techcrunch.com/tag/funding/feed/', mixed: true },
];
