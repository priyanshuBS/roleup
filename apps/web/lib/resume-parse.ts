/**
 * Server-side resume parsing. Works entirely in memory: the buffer is never written to disk,
 * and neither the file nor the extracted text is logged or stored.
 */
import mammoth from 'mammoth';
import { extractTextItems, getDocumentProxy, inspectPages } from 'unpdf';
import { analyzePdfLayout, type LayoutSignals, type PdfPageInput } from '@roleup/core/ats-checker';

export const MAX_RESUME_BYTES = 5 * 1024 * 1024;
const MAX_PAGES_ANALYZED = 10;

export class ResumeParseError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

/** Identify by content, not by the (user-controlled) name or MIME type. */
export function sniffType(buf: Uint8Array): 'pdf' | 'docx' | null {
  const head = Buffer.from(buf.subarray(0, 8)).toString('latin1');
  if (head.startsWith('%PDF-')) return 'pdf';
  if (head.startsWith('PK\u0003\u0004')) {
    // DOCX is a ZIP whose entries include word/document.xml (names are stored in plain text).
    const probe = Buffer.from(buf.subarray(0, Math.min(buf.length, 2_000_000))).toString('latin1');
    if (probe.includes('word/document.xml')) return 'docx';
  }
  return null;
}

export interface ParsedResume {
  text: string;
  layout: LayoutSignals;
}

async function parsePdf(buf: Uint8Array, fileName: string): Promise<ParsedResume> {
  let pdf;
  try {
    pdf = await getDocumentProxy(new Uint8Array(buf), {
      disableFontFace: true,
      stopAtErrors: false,
    });
  } catch {
    throw new ResumeParseError(
      "We couldn't open this PDF. It may be damaged or password-protected.",
    );
  }
  try {
    const total = pdf.numPages;
    const [{ items }, inspection] = await Promise.all([
      extractTextItems(pdf),
      inspectPages(pdf).catch(() => null),
    ]);
    const pages: PdfPageInput[] = [];
    for (let i = 1; i <= Math.min(total, MAX_PAGES_ANALYZED); i++) {
      const page = await pdf.getPage(i);
      const vp = page.getViewport({ scale: 1 });
      const insp = inspection?.pages[i - 1];
      pages.push({
        width: vp.width,
        height: vp.height,
        items: (items[i - 1] ?? []).map((it) => ({
          str: it.str,
          x: it.x,
          y: it.y,
          width: it.width,
          height: it.height,
        })),
        imageCoverage: insp?.imageCoverage ?? 0,
        imageCount: insp?.imageCount ?? 0,
      });
    }
    const a = analyzePdfLayout(pages);
    return {
      text: a.text,
      layout: {
        fileType: 'pdf',
        fileName,
        pageCount: total,
        multiColumnPages: a.multiColumnPages,
        tableCount: a.tableCount,
        contactInHeaderFooter: a.contactInHeaderFooter,
        imageOnlyPages: a.imageOnlyPages,
        imageCount: a.imageCount,
      },
    };
  } finally {
    await pdf.loadingTask.destroy().catch(() => undefined);
  }
}

async function parseDocx(buf: Uint8Array, fileName: string): Promise<ParsedResume> {
  const buffer = Buffer.from(buf);
  try {
    const [raw, html] = await Promise.all([
      mammoth.extractRawText({ buffer }),
      mammoth.convertToHtml({ buffer }),
    ]);
    const tables = (html.value.match(/<table/g) ?? []).length;
    const images = (html.value.match(/<img/g) ?? []).length;
    return {
      // Mammoth separates paragraphs with blank lines; collapse to single newlines like a PDF.
      text: raw.value.replace(/\n{2,}/g, '\n'),
      layout: {
        fileType: 'docx',
        fileName,
        pageCount: null,
        multiColumnPages: 0,
        tableCount: tables,
        contactInHeaderFooter: false,
        imageOnlyPages: 0,
        imageCount: images,
      },
    };
  } catch {
    throw new ResumeParseError(
      "We couldn't read this DOCX file. Try saving it again from Word or Google Docs.",
    );
  }
}

export async function parseResume(buf: Uint8Array, fileName: string): Promise<ParsedResume> {
  if (buf.byteLength === 0) throw new ResumeParseError('The file is empty.');
  if (buf.byteLength > MAX_RESUME_BYTES)
    throw new ResumeParseError('The file is larger than 5 MB.', 413);
  const type = sniffType(buf);
  const safeName = fileName.replace(/[^\w .()-]/g, '').slice(0, 120) || `resume.${type ?? 'pdf'}`;
  if (type === 'pdf') return parsePdf(buf, safeName);
  if (type === 'docx') return parseDocx(buf, safeName);
  throw new ResumeParseError(
    'Upload a PDF or DOCX file. Other formats (including .doc, images and .pages) are not supported.',
    415,
  );
}
