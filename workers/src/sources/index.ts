import type { AtsProvider, RawSourceJob } from '@roleup/core';
import { fetchAshby } from './ashby';
import { fetchGreenhouse } from './greenhouse';
import { fetchLever } from './lever';

export { parseAshby } from './ashby';
export { parseGreenhouse } from './greenhouse';
export { parseLever } from './lever';

export const FETCHERS: Record<
  Exclude<AtsProvider, 'none'>,
  (slug: string) => Promise<RawSourceJob[]>
> = {
  greenhouse: fetchGreenhouse,
  lever: fetchLever,
  ashby: fetchAshby,
};

export function boardUrl(ats: AtsProvider, slug: string): string | null {
  switch (ats) {
    case 'greenhouse':
      return `https://job-boards.greenhouse.io/${slug}`;
    case 'lever':
      return `https://jobs.lever.co/${slug}`;
    case 'ashby':
      return `https://jobs.ashbyhq.com/${slug}`;
    default:
      return null;
  }
}
