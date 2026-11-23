import type { Metadata } from 'next';
import { ChipNav } from '@/components/ChipNav';
import { ListPage, type SearchParams } from '@/components/ListPage';
import { getMeta } from '@/lib/data';
import { ycBatchHref } from '@/lib/urls';

export const metadata: Metadata = {
  title: 'Jobs at Y Combinator companies',
  description:
    'Tech jobs at YC-backed companies hiring in India or remotely, filterable by YC batch.',
  alternates: { canonical: '/yc-jobs' },
};

export default async function YcJobsPage({ searchParams }: { searchParams: SearchParams }) {
  const meta = await getMeta();
  return (
    <ListPage
      basePath="/yc-jobs"
      searchParams={searchParams}
      fixed={{ tag: 'yc' }}
      title="Jobs at Y Combinator companies"
      intro="Companies are matched to YC's public company list by website domain. Pick a batch to narrow down."
      above={
        <ChipNav
          label="YC batches"
          current="/yc-jobs"
          items={[
            { href: '/yc-jobs', label: 'All batches' },
            ...meta.ycBatches.map((b) => ({
              href: ycBatchHref(b.batch),
              label: b.batch,
              count: b.count,
            })),
          ]}
        />
      }
    />
  );
}
