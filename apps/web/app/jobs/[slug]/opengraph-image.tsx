import { LEVEL_LABELS } from '@roleup/core';
import { getJobBySlug } from '@/lib/data';
import { locationLabel, salaryLabel } from '@/lib/format';
import { OG_SIZE, ogImage } from '@/lib/og';

export const alt = 'Job on RoleUp';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const job = await getJobBySlug((await params).slug);
  if (!job) return ogImage({ eyebrow: 'Tech jobs · India & remote', title: 'Job not found' });
  const salary = salaryLabel(job);
  return ogImage({
    eyebrow: job.company.name,
    title: job.title,
    pills: [
      ...(salary ? [salary] : []),
      locationLabel(job),
      LEVEL_LABELS[job.level],
      ...(job.company.ycBatch ? [`YC ${job.company.ycBatch}`] : []),
    ],
  });
}
