import type {
  AtsReport,
  CompanyListItem,
  FilterMeta,
  FundingItem,
  JobDetail,
  JobListItem,
  Paginated,
} from '@roleup/core/lite';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000').replace(
  /\/$/,
  '',
);

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { signal, headers: { Accept: 'application/json' } });
  } catch {
    throw new ApiError("Can't reach RoleUp. Check your connection.", 0);
  }
  const body = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    const msg =
      (body as { error?: { message?: string } } | null)?.error?.message ??
      `Request failed (${res.status})`;
    throw new ApiError(msg, res.status);
  }
  return body as T;
}

export type JobQuery = Partial<
  Record<
    | 'q'
    | 'category'
    | 'level'
    | 'city'
    | 'remote'
    | 'band'
    | 'tag'
    | 'posted'
    | 'company'
    | 'batch',
    string
  >
>;

export function queryString(params: Record<string, string | undefined>): string {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v as string)}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

export const api = {
  jobs: (q: JobQuery, cursor?: string, signal?: AbortSignal) =>
    get<Paginated<JobListItem>>(
      `/api/v1/jobs${queryString({ ...q, cursor, limit: '30' })}`,
      signal,
    ),
  job: (idOrSlug: string | number, signal?: AbortSignal) =>
    get<JobDetail>(`/api/v1/jobs/${encodeURIComponent(String(idOrSlug))}`, signal),
  companies: (signal?: AbortSignal) =>
    get<{ items: CompanyListItem[] }>('/api/v1/companies', signal),
  funding: (signal?: AbortSignal) =>
    get<{ items: FundingItem[] }>('/api/v1/funding?limit=100', signal),
  meta: (signal?: AbortSignal) => get<FilterMeta>('/api/v1/meta/filters', signal),

  /** Upload a resume picked with expo-document-picker. React Native FormData accepts {uri,name,type}. */
  atsCheck: async (
    file: { uri: string; name: string; mimeType?: string | null },
    job?: string,
    jd?: string,
  ): Promise<AtsReport> => {
    const fd = new FormData();
    fd.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.mimeType ?? 'application/pdf',
    } as unknown as Blob);
    if (job) fd.append('job', job);
    else if (jd) fd.append('jd', jd);
    let res: Response;
    try {
      res = await fetch(`${API_URL}/api/v1/ats-check`, { method: 'POST', body: fd });
    } catch {
      throw new ApiError("Can't reach RoleUp. Check your connection.", 0);
    }
    const body = (await res.json().catch(() => null)) as
      AtsReport | { error?: { message?: string } } | null;
    if (!res.ok || !body || 'error' in body) {
      throw new ApiError(
        (body as { error?: { message?: string } } | null)?.error?.message ?? 'Check failed',
        res.status,
      );
    }
    return body as AtsReport;
  },
};
