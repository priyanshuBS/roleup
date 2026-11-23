import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SALARY_BAND_META, SALARY_BANDS, salaryBandFromSlug } from '@roleup/core';
import { IndianRupee } from 'lucide-react';
import { ChipNav } from '@/components/ChipNav';
import { ListPage, type SearchParams } from '@/components/ListPage';
import { getMeta } from '@/lib/data';
import { bandHref } from '@/lib/urls';

type Props = { params: Promise<{ band: string }>; searchParams: SearchParams };

function titleFor(band: (typeof SALARY_BANDS)[number]) {
  return band === 'undisclosed'
    ? 'Tech jobs without a disclosed salary'
    : `Tech jobs paying ${SALARY_BAND_META[band].label} per year`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const band = salaryBandFromSlug((await params).band);
  if (!band) return { title: 'Not found' };
  return {
    title: titleFor(band),
    description: `${titleFor(band)} in India and remote. Only employer-provided salaries, converted to INR per year.`,
    alternates: { canonical: bandHref(SALARY_BAND_META[band].slug) },
  };
}

export default async function SalaryBandPage({ params, searchParams }: Props) {
  const band = salaryBandFromSlug((await params).band);
  if (!band) notFound();
  const meta = await getMeta();
  return (
    <ListPage
      basePath={bandHref(SALARY_BAND_META[band].slug)}
      searchParams={searchParams}
      fixed={{ band }}
      title={titleFor(band)}
      icon={IndianRupee}
      eyebrow="Salary band"
      intro={
        <>
          Bands use the employer&apos;s posted range (top of range, converted to INR per year). We
          never estimate: jobs without a posted salary are listed under &quot;Salary not
          disclosed&quot;.
        </>
      }
      above={
        <ChipNav
          label="Salary bands"
          current={bandHref(SALARY_BAND_META[band].slug)}
          items={meta.bands.map((b) => ({
            href: bandHref(b.slug),
            label: b.label,
            count: b.count,
          }))}
        />
      }
    />
  );
}
