import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import type { JobQuery } from '@/api';
import { JobFeed } from '@/components/JobFeed';

const KEYS = [
  'q',
  'category',
  'level',
  'city',
  'remote',
  'band',
  'tag',
  'posted',
  'company',
  'batch',
] as const;

/** Generic filtered list, opened from Explore and company pages. */
export default function ListScreen() {
  const params = useLocalSearchParams<Record<string, string>>();
  const query = useMemo<JobQuery>(() => {
    const q: JobQuery = {};
    for (const k of KEYS) if (typeof params[k] === 'string' && params[k]) q[k] = params[k];
    return q;
  }, [params]);
  return (
    <>
      <Stack.Screen options={{ title: params.title ?? 'Jobs' }} />
      <JobFeed query={query} />
    </>
  );
}
