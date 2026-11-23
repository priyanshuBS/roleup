/** Normalize a title for duplicate detection: lowercase, no punctuation or bracketed location. */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(
      /\((?:[^)]*\b(remote|india|bengaluru|bangalore|hyderabad|pune|mumbai|delhi|gurgaon|gurugram|noida|chennai|hybrid)\b[^)]*)\)/g,
      ' ',
    )
    .replace(/\bsr\.?\b/g, 'senior')
    .replace(/\bjr\.?\b/g, 'junior')
    .replace(/[^a-z0-9+#]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** company + normalized title + city (or remote type). Used to skip cross-source duplicates. */
export function jobFingerprint(
  companyId: number | string,
  title: string,
  cityOrRemote: string | null,
): string {
  return `${companyId}|${normalizeTitle(title)}|${cityOrRemote ?? '-'}`;
}

/** Small, stable, non-cryptographic hash (FNV-1a 32-bit) → base36. Used for job slugs. */
export function shortHash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36).padStart(7, '0');
}
