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

export function JobDescription({ text }: { text: string }) {
  const blocks = parseDescription(text);
  return (
    <div className="space-y-3 text-[0.9375rem] leading-7 text-text">
      {blocks.map((b, i) =>
        b.type === 'h' ? (
          <h3 key={i} className="pt-2 text-base font-semibold text-text">
            {b.text}
          </h3>
        ) : b.type === 'ul' ? (
          <ul key={i} className="list-disc space-y-1.5 pl-5 marker:text-text-subtle">
            {b.items.map((it, j) => (
              <li key={j} className="pl-1">
                {it}
              </li>
            ))}
          </ul>
        ) : (
          <p key={i} className="text-text-muted">
            {b.lines.map((l, j) => (
              <span key={j}>
                {j > 0 && <br />}
                {l}
              </span>
            ))}
          </p>
        ),
      )}
    </div>
  );
}
