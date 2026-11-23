import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CITY_BY_SLUG } from '@roleup/core';
import { Globe, MapPin } from 'lucide-react';
import { ChipNav } from '@/components/ChipNav';
import { ListPage, type SearchParams } from '@/components/ListPage';
import { getMeta } from '@/lib/data';
import { cityHref } from '@/lib/urls';

type Props = { params: Promise<{ city: string }>; searchParams: SearchParams };

function cityName(slug: string): string | null {
  if (slug === 'remote') return 'Remote';
  return CITY_BY_SLUG.get(slug)?.name ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city } = await params;
  const name = cityName(city);
  if (!name) return { title: 'Not found' };
  const title = city === 'remote' ? 'Remote tech jobs open to India' : `Tech jobs in ${name}`;
  return {
    title,
    description: `${title}: software, data, ML, DevOps, product and design roles, straight from company career pages.`,
    alternates: { canonical: cityHref(city) },
  };
}

export default async function CityPage({ params, searchParams }: Props) {
  const { city } = await params;
  const name = cityName(city);
  if (!name) notFound();
  const meta = await getMeta();
  return (
    <ListPage
      basePath={cityHref(city)}
      searchParams={searchParams}
      fixed={{ city }}
      title={city === 'remote' ? 'Remote tech jobs open to India' : `Tech jobs in ${name}`}
      icon={city === 'remote' ? Globe : MapPin}
      eyebrow={city === 'remote' ? 'Remote' : `City · ${name}`}
      above={
        <ChipNav
          label="Cities"
          current={cityHref(city)}
          items={[
            ...meta.cities
              .slice(0, 10)
              .map((c) => ({ href: cityHref(c.slug), label: c.name, count: c.count })),
            { href: cityHref('remote'), label: 'Remote' },
          ]}
        />
      }
    />
  );
}
