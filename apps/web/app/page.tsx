import type { Metadata } from 'next';
import { HomeHero } from '@/components/HomeHero';
import { ListPage, type SearchParams } from '@/components/ListPage';
import { getCompanies, getMeta } from '@/lib/data';

export const metadata: Metadata = {
  title: { absolute: 'RoleUp: latest tech jobs in India and remote' },
  alternates: { canonical: '/' },
};

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const filtered = Object.keys(sp).some((k) => k !== 'cursor' && sp[k]);
  const [meta, companies] = await Promise.all([getMeta(), getCompanies({ hasJobs: true })]);
  return (
    <ListPage
      basePath="/"
      searchParams={searchParams}
      title="Latest tech jobs in India and remote"
      // The full header on the landing view; a compact title once someone is filtering or paging.
      hero={
        filtered || sp.cursor ? undefined : <HomeHero meta={meta} companyCount={companies.length} />
      }
    />
  );
}
