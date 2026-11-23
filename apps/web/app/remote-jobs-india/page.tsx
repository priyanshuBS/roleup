import type { Metadata } from 'next';
import { ListPage, type SearchParams } from '@/components/ListPage';

export const metadata: Metadata = {
  title: 'Remote tech jobs you can do from India',
  description:
    'Remote software, data, ML and DevOps jobs that explicitly accept candidates in India or APAC.',
  alternates: { canonical: '/remote-jobs-india' },
};

export default function RemoteIndiaPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <ListPage
      basePath="/remote-jobs-india"
      searchParams={searchParams}
      fixed={{ remote: 'remote_india' }}
      title="Remote tech jobs open to India"
      intro="Remote roles whose posting names India, an Indian city, or APAC/Asia as eligible. For roles open anywhere, see Remote (Global)."
    />
  );
}
