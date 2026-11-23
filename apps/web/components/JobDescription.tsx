/**
 * Render stored plain-text descriptions. We never store or render source HTML:
 * lines starting with "• " become list items, blank lines separate paragraphs, and a short
 * standalone line that introduces a list ("What you'll do", "Requirements:") becomes a heading.
 */
type Block =
  { type: 'p'; lines: string[] } | { type: 'ul'; items: string[] } | { type: 'h'; text: string };

const BULLET = /^[•\-*·]\s+(.*)$/;

function looksLikeHeading(line: string): boolean {
  const words = line.split(/\s+/).length;
  return line.length <= 70 && words <= 9 && !/[.,;!?]$/.test(line) && /^[A-Z0-9]/.test(line);
}

export function parseDescription(text: string): Block[] {
  const raw: Block[] = [];
  for (const r of text.split('\n')) {
    const line = r.trim();
    const last = raw[raw.length - 1];
    if (!line) {
      raw.push({ type: 'p', lines: [] });
      continue;
    }
    const bullet = BULLET.exec(line);
    if (bullet) {
      if (last?.type === 'ul') last.items.push(bullet[1]!);
      else raw.push({ type: 'ul', items: [bullet[1]!] });
    } else if (last?.type === 'p') last.lines.push(line);
    else raw.push({ type: 'p', lines: [line] });
  }
  const blocks = raw.filter((b) => b.type !== 'p' || b.lines.length > 0);
  // Promote headings: a one-line paragraph that ends with ":" or is directly followed by a list.
  return blocks.flatMap((b, i): Block[] => {
    if (b.type !== 'p') return [b];
    const first = b.lines[0]!;
    // "Requirements:" directly followed by text in the same paragraph.
    if (b.lines.length > 1 && /:$/.test(first) && looksLikeHeading(first.replace(/:$/, ''))) {
      return [
        { type: 'h', text: first.replace(/:$/, '') },
        { type: 'p', lines: b.lines.slice(1) },
      ];
    }
    if (b.lines.length !== 1) return [b];
    const next = blocks[i + 1];
    if (/:$/.test(first) && first.length <= 80)
      return [{ type: 'h', text: first.replace(/:$/, '') }];
    if (looksLikeHeading(first) && next?.type === 'ul') return [{ type: 'h', text: first }];
    return [b];
  });
}

const URL_RE = /(https?:\/\/[^\s<>"')\]]+)/g;

/** Plain text with http(s) URLs turned into links. React escapes everything else. */
function Linkified({ text }: { text: string }) {
  const parts = text.split(URL_RE);
  if (parts.length === 1) return <>{text}</>;
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 0) return part;
        // Keep trailing sentence punctuation out of the link.
        const url = part.replace(/[.,;:!?]+$/, '');
        const rest = part.slice(url.length);
        return (
          <span key={i}>
            <a href={url} target="_blank" rel="noopener noreferrer nofollow ugc" className="link">
              {url.replace(/^https?:\/\/(www\.)?/, '')}
            </a>
            {rest}
          </span>
        );
      })}
    </>
  );
}

export function JobDescription({ text }: { text: string }) {
  const blocks = parseDescription(text);
  return (
    <div className="max-w-[70ch] space-y-4 text-[0.96875rem] leading-[1.7] text-text [overflow-wrap:anywhere]">
      {blocks.map((b, i) =>
        b.type === 'h' ? (
          <h3 key={i} className="pt-3 text-[0.96875rem] font-semibold text-text first:pt-0">
            {b.text}
          </h3>
        ) : b.type === 'ul' ? (
          <ul key={i} className="space-y-1.5">
            {b.items.map((it, j) => (
              <li key={j} className="relative pl-5 text-text-muted">
                <span
                  aria-hidden
                  className="absolute left-1 top-[0.7em] h-[5px] w-[5px] rounded-full bg-text-subtle"
                />
                <Linkified text={it} />
              </li>
            ))}
          </ul>
        ) : (
          <p key={i} className="text-text-muted">
            {b.lines.map((l, j) => (
              <span key={j}>
                {j > 0 && <br />}
                <Linkified text={l} />
              </span>
            ))}
          </p>
        ),
      )}
    </div>
  );
}
