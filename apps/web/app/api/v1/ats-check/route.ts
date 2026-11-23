import { z } from 'zod';
import { checkResume } from '@roleup/core/ats-checker';
import { apiError, CORS_HEADERS, json } from '@/lib/api';
import { getJobBySlug } from '@/lib/data';
import { rateLimit } from '@/lib/rate-limit';
import { MAX_RESUME_BYTES, parseResume, ResumeParseError } from '@/lib/resume-parse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const LIMIT_PER_HOUR = 10;

const fields = z.object({
  jd: z.string().max(20_000).optional(),
  job: z
    .string()
    .regex(/^[a-z0-9-]{3,200}$/)
    .optional(),
});

/**
 * POST /api/v1/ats-check (multipart/form-data)
 *   file: PDF or DOCX, max 5 MB (required)
 *   jd:   job description text (optional)
 *   job:  RoleUp job slug to compare against (optional)
 * The file is processed in memory and discarded. Nothing about it is stored or logged.
 */
export async function POST(req: Request) {
  const len = Number(req.headers.get('content-length') ?? 0);
  if (len > MAX_RESUME_BYTES + 100_000) return apiError(413, 'The file is larger than 5 MB.');

  const rl = await rateLimit('ats', LIMIT_PER_HOUR, 3600);
  const rlHeaders = {
    'X-RateLimit-Limit': String(LIMIT_PER_HOUR),
    'X-RateLimit-Remaining': String(rl.remaining),
  };
  if (!rl.allowed) {
    const retry = Math.max(1, Math.round((rl.resetAt.getTime() - Date.now()) / 1000));
    return json(
      {
        error: {
          status: 429,
          message: `You've reached ${LIMIT_PER_HOUR} checks this hour. Try again in ${Math.ceil(retry / 60)} minutes.`,
        },
      },
      { status: 429, maxAge: 0, headers: { ...rlHeaders, 'Retry-After': String(retry) } },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return apiError(400, 'Send the resume as multipart/form-data with a "file" field.');
  }
  const file = form.get('file');
  if (!(file instanceof File)) return apiError(400, 'Attach a resume file (PDF or DOCX).');
  if (file.size > MAX_RESUME_BYTES) return apiError(413, 'The file is larger than 5 MB.');
  const parsedFields = fields.safeParse({
    jd:
      typeof form.get('jd') === 'string' && String(form.get('jd')).trim()
        ? String(form.get('jd'))
        : undefined,
    job:
      typeof form.get('job') === 'string' && String(form.get('job'))
        ? String(form.get('job'))
        : undefined,
  });
  if (!parsedFields.success)
    return apiError(400, 'The job description is too long (max 20,000 characters).');

  try {
    const buf = new Uint8Array(await file.arrayBuffer());
    const resume = await parseResume(buf, file.name);

    let jobDescription: Parameters<typeof checkResume>[0]['jobDescription'] = null;
    if (parsedFields.data.job) {
      const job = await getJobBySlug(parsedFields.data.job);
      if (job)
        jobDescription = {
          source: 'job',
          title: `${job.title} at ${job.company.name}`,
          text: `${job.title}\n${job.descriptionText}`,
        };
    } else if (parsedFields.data.jd) {
      jobDescription = { source: 'pasted', text: parsedFields.data.jd };
    }

    const report = checkResume({ text: resume.text, layout: resume.layout, jobDescription });
    return json(report, { maxAge: 0, headers: rlHeaders });
  } catch (err) {
    if (err instanceof ResumeParseError) return apiError(err.status, err.message);
    // Log only the error type, never file contents.
    console.error('ats-check failed:', err instanceof Error ? err.name : 'unknown');
    return apiError(
      500,
      'Something went wrong reading this file. Try exporting it again as a PDF.',
    );
  }
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
