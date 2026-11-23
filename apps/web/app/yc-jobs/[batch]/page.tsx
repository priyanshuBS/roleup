import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ChipNav } from '@/components/ChipNav';
import { ListPage, type SearchParams } from '@/components/ListPage';
import { getMeta } from '@/lib/data';
import { ycBatchHref } from '@/lib/urls';

type Props = { params: Promise<{ batch: string }>; searchParams: SearchParams };

const toCode = (b: string) => (/^[wsxf]\d{2}$/i.test(b) ? b.toUpperCase() : null);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const code = toCode((await params).batch);
  if (!code) return { title: 'Not found' };
  return {
    title: `Jobs at YC ${code} companies`,
    description: `Open tech jobs at Y Combinator ${code} companies hiring in India or remotely.`,
    alternates: { canonical: ycBatchHref(code) },
  };
}

export default async function YcBatchPage({ params, searchParams }: Props) {
  const code = toCode((await params).batch);
  if (!code) notFound();
  const meta = await getMeta();
  return (
    <ListPage
      basePath={ycBatchHref(code)}
      searchParams={searchParams}
      fixed={{ tag: 'yc', batch: code }}
      title={`Jobs at YC ${code} companies`}
      emptyText={`No open jobs at YC ${code} companies right now.`}
      above={
        <ChipNav
          label="YC batches"
          current={ycBatchHref(code)}
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
