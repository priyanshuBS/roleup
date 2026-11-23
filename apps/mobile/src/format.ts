import { formatInrRange, REMOTE_TYPE_SHORT, type JobListItem } from '@roleup/core/lite';

export function locationLabel(
  job: Pick<JobListItem, 'city' | 'remoteType' | 'locationRaw'>,
): string {
  if (job.remoteType.startsWith('remote_')) return REMOTE_TYPE_SHORT[job.remoteType];
  const place = job.city?.name ?? (job.locationRaw.split(/[;|]/)[0]?.trim() || 'India');
  return job.remoteType === 'hybrid' ? `${place} · Hybrid` : place;
}

export function salaryLabel(job: Pick<JobListItem, 'salary'>): string | null {
  return job.salary ? formatInrRange(job.salary.minInr, job.salary.maxInr) : null;
}
