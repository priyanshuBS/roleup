import type { Metadata } from 'next';
import { REMOTE_TYPE_LABELS } from '@roleup/core';
import { ChipNav } from '@/components/ChipNav';
import { ListPage, type SearchParams } from '@/components/ListPage';
import { getMeta } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Remote tech jobs',
  description:
    'Remote tech jobs, split by whether you can apply from India: India OK, global, or restricted to US/EU.',
  alternates: { canonical: '/remote-jobs' },
};

export default async function RemoteJobsPage({ searchParams }: { searchParams: SearchParams }) {
  const meta = await getMeta();
  const count = (v: string) => meta.remote.find((r) => r.value === v)?.count;
  const sp = await searchParams;
  const current =
    typeof sp.remote === 'string' ? `/remote-jobs?remote=${sp.remote}` : '/remote-jobs';
  return (
    <ListPage
      basePath="/remote-jobs"
      searchParams={searchParams}
      defaults={{ remote: 'any_remote' }}
      title="Remote tech jobs"
      intro="Every remote role is labelled by who can apply. “India OK” names India, an Indian city, or APAC; “Global” says anywhere; “Restricted” names only other regions."
      above={
        <ChipNav
          label="Remote type"
          current={current}
          items={[
            { href: '/remote-jobs', label: 'All remote' },
            {
              href: '/remote-jobs?remote=remote_india',
              label: REMOTE_TYPE_LABELS.remote_india,
              count: count('remote_india'),
            },
            {
              href: '/remote-jobs?remote=remote_global',
              label: REMOTE_TYPE_LABELS.remote_global,
              count: count('remote_global'),
            },
            {
              href: '/remote-jobs?remote=remote_restricted',
              label: REMOTE_TYPE_LABELS.remote_restricted,
              count: count('remote_restricted'),
            },
          ]}
        />
      }
    />
  );
}
