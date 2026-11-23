/**
 * Turn positioned PDF text items into reading-order text plus layout signals. Pure, so it can
 * be unit-tested without real PDFs. Coordinates are PDF user space (origin bottom-left).
 */
import { EMAIL_RE, PHONE_RE } from './text';

export interface PdfPageInput {
  width: number;
  height: number;
  items: { str: string; x: number; y: number; width: number; height: number }[];
  /** From inspectPages: fraction of the page covered by images. */
  imageCoverage?: number;
  imageCount?: number;
}

export interface PdfLayoutResult {
  text: string;
  multiColumnPages: number;
  tableCount: number;
  contactInHeaderFooter: boolean;
  imageOnlyPages: number;
  imageCount: number;
}

interface Line {
  y: number;
  items: PdfPageInput['items'];
}

function groupLines(items: PdfPageInput['items']): Line[] {
  const sorted = items.filter((i) => i.str.trim()).sort((a, b) => b.y - a.y || a.x - b.x);
  const out: Line[] = [];
  for (const it of sorted) {
    const tol = Math.max(2, (it.height || 10) * 0.5);
    const line = out.find((l) => Math.abs(l.y - it.y) <= tol);
    if (line) line.items.push(it);
    else out.push({ y: it.y, items: [it] });
  }
  for (const l of out) l.items.sort((a, b) => a.x - b.x);
  return out.sort((a, b) => b.y - a.y);
}

function lineText(l: Line): string {
  let s = '';
  let lastEnd: number | null = null;
  for (const it of l.items) {
    if (lastEnd !== null && it.x - lastEnd > 1.5) s += it.x - lastEnd > 25 ? '   ' : ' ';
    s += it.str;
    lastEnd = it.x + it.width;
  }
  return s.replace(/\s+$/, '');
}

/**
 * Two-column detection: many lines have a large horizontal gap in the same x band, and a good
 * share of text starts right of the page middle. Simple and conservative.
 */
function isMultiColumn(lines: Line[], width: number): { columns: boolean; splitX: number | null } {
  if (lines.length < 12) return { columns: false, splitX: null };
  const gapStarts: number[] = [];
  for (const l of lines) {
    for (let i = 1; i < l.items.length; i++) {
      const prev = l.items[i - 1]!;
      const cur = l.items[i]!;
      const gap = cur.x - (prev.x + prev.width);
      if (gap > width * 0.06 && cur.x > width * 0.25 && cur.x < width * 0.75) gapStarts.push(cur.x);
    }
  }
  const linesStartingRight = lines.filter((l) => l.items[0]!.x > width * 0.3).length;
  if (gapStarts.length < lines.length * 0.25 && linesStartingRight < lines.length * 0.2)
    return { columns: false, splitX: null };
  // Do the gap positions cluster? (columns share a left edge)
  const bucket = new Map<number, number>();
  for (const x of gapStarts)
    bucket.set(Math.round(x / 15), (bucket.get(Math.round(x / 15)) ?? 0) + 1);
  const [bestKey, bestCount] = [...bucket.entries()].sort((a, b) => b[1] - a[1])[0] ?? [0, 0];
  const clustered = bestCount >= Math.max(6, gapStarts.length * 0.5);
  if (clustered) return { columns: true, splitX: bestKey * 15 - 8 };
  if (linesStartingRight >= lines.length * 0.35) return { columns: true, splitX: width * 0.3 };
  return { columns: false, splitX: null };
}

/** Rows with 3+ widely spaced cells that repeat over several lines look like a table. */
function countTables(lines: Line[], width: number): number {
  let tables = 0;
  let run = 0;
  for (const l of lines) {
    let cells = 1;
    for (let i = 1; i < l.items.length; i++) {
      const prev = l.items[i - 1]!;
      if (l.items[i]!.x - (prev.x + prev.width) > width * 0.04) cells++;
    }
    if (cells >= 3) run++;
    else {
      if (run >= 3) tables++;
      run = 0;
    }
  }
  if (run >= 3) tables++;
  return tables;
}

export function analyzePdfLayout(pages: PdfPageInput[]): PdfLayoutResult {
  let multiColumnPages = 0;
  let tableCount = 0;
  let imageOnlyPages = 0;
  let imageCount = 0;
  let contactBody = false;
  let contactEdge = false;
  const pageTexts: string[] = [];

  for (const p of pages) {
    imageCount += p.imageCount ?? 0;
    const textChars = p.items.reduce((a, i) => a + i.str.trim().length, 0);
    if ((p.imageCoverage ?? 0) > 0.6 && textChars < 80) imageOnlyPages++;
    const lines = groupLines(p.items);
    const { columns, splitX } = isMultiColumn(lines, p.width);
    if (columns) multiColumnPages++;
    tableCount += countTables(lines, p.width);

    // Reading order: for two columns, read the left column fully, then the right.
    let ordered: string[];
    if (columns && splitX !== null) {
      const left = lines
        .map((l) => ({ ...l, items: l.items.filter((i) => i.x < splitX) }))
        .filter((l) => l.items.length);
      const right = lines
        .map((l) => ({ ...l, items: l.items.filter((i) => i.x >= splitX) }))
        .filter((l) => l.items.length);
      ordered = [...left.map(lineText), ...right.map(lineText)];
    } else {
      ordered = lines.map(lineText);
    }
    pageTexts.push(ordered.join('\n'));

    for (const l of lines) {
      const t = lineText(l);
      if (!EMAIL_RE.test(t) && !PHONE_RE.test(t)) continue;
      const edge = l.y > p.height * 0.95 || l.y < p.height * 0.05;
      if (edge) contactEdge = true;
      else contactBody = true;
    }
  }
  return {
    text: pageTexts.join('\n\n'),
    multiColumnPages,
    tableCount,
    contactInHeaderFooter: contactEdge && !contactBody,
    imageOnlyPages,
    imageCount,
  };
}
