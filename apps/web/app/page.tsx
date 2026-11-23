import type { Metadata } from 'next';
import { ListPage, type SearchParams } from '@/components/ListPage';
import { QuickLinks } from '@/components/QuickLinks';
import { getMeta } from '@/lib/data';

export const metadata: Metadata = {
  title: { absolute: 'RoleUp: latest tech jobs in India and remote' },
  alternates: { canonical: '/' },
};

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const meta = await getMeta();
  return (
    <ListPage
      basePath="/"
      searchParams={searchParams}
      title="Latest tech jobs in India and remote"
      above={<QuickLinks meta={meta} />}
    />
  );
}
