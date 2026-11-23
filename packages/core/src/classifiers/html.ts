/**
 * Convert job-description HTML to plain text with line breaks and "• " bullets. We never store or
 * render source HTML, which removes the XSS surface entirely. Handles entity-escaped HTML
 * (Greenhouse returns `&lt;p&gt;...`).
 */

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
  bull: '•',
  middot: '·',
  copy: '©',
  reg: '®',
  trade: '™',
  rarr: '→',
  larr: '←',
  times: '×',
  euro: '€',
  pound: '£',
  rupee: '₹',
  zwj: '',
  zwnj: '',
  shy: '',
};

export function decodeEntities(input: string): string {
  return input.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, ent: string) => {
    if (ent[0] === '#') {
      const code =
        ent[1] === 'x' || ent[1] === 'X' ? parseInt(ent.slice(2), 16) : parseInt(ent.slice(1), 10);
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return '';
      try {
        return String.fromCodePoint(code);
      } catch {
        return '';
      }
    }
    const v = NAMED_ENTITIES[ent.toLowerCase()];
    return v ?? m;
  });
}

export function htmlToText(html: string | null | undefined, maxLength = 20_000): string {
  if (!html) return '';
  let s = html;
  // Entity-escaped markup: decode once first so the tags become real tags.
  if (/&lt;\/?[a-z][^&]*&gt;/i.test(s)) s = decodeEntities(s);
  s = s
    .replace(/<(script|style|noscript|iframe|svg)[\s\S]*?<\/\1>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<\/(p|div|h[1-6]|ul|ol|section|article|header|footer|blockquote|tr|table)>/gi, '\n')
    .replace(/<(br|hr)\s*\/?>/gi, '\n')
    .replace(/<(p|div|h[1-6]|ul|ol|section|article|blockquote|tr|table)[^>]*>/gi, '\n')
    .replace(/<\/?(td|th)[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/<[a-z/][^>]*$/i, ''); // truncated trailing tag
  s = decodeEntities(s)
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200b-\u200d\ufeff]/g, '')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n• *\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return s.length > maxLength ? `${s.slice(0, maxLength).trimEnd()}…` : s;
}
