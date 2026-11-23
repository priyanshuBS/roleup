export type CheckStatus = 'pass' | 'warn' | 'fail';

export type CheckCategory =
  | 'parseability'
  | 'contact'
  | 'sections'
  | 'layout'
  | 'length'
  | 'dates'
  | 'bullets'
  | 'wording'
  | 'file';

export interface CheckResult {
  id: string;
  category: CheckCategory;
  title: string;
  status: CheckStatus;
  points: number;
  maxPoints: number;
  /** What we found, in plain words. */
  detail: string;
  /** What to do about it (empty when passing). */
  fix: string;
}

/** Signals from the file parser that can't be recovered from plain text. */
export interface LayoutSignals {
  fileType: 'pdf' | 'docx';
  fileName: string;
  pageCount: number | null;
  /** Pages where text sits in two or more distinct columns. */
  multiColumnPages: number;
  /** Tables found (DOCX tables, or grid-like PDF text). */
  tableCount: number;
  /** Email/phone found only in the top/bottom margin (often a header/footer). */
  contactInHeaderFooter: boolean;
  /** Pages that are mostly an image with almost no text (scanned). */
  imageOnlyPages: number;
  imageCount: number;
}

export interface KeywordReport {
  source: 'job' | 'pasted';
  jobTitle?: string;
  matched: string[];
  missing: string[];
  matchPercent: number;
}

export interface CategoryScore {
  category: CheckCategory;
  label: string;
  points: number;
  maxPoints: number;
}

export interface AtsReport {
  score: number;
  verdict: string;
  categories: CategoryScore[];
  checks: CheckResult[];
  /** Highest-impact problems first. */
  fixFirst: CheckResult[];
  keywords: KeywordReport | null;
  stats: {
    words: number;
    estimatedPages: number;
    bullets: number;
    yearsOfExperience: number | null;
    skillsFound: string[];
  };
  disclaimer: string;
}
