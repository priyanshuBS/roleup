/**
 * Render stored plain-text descriptions. We never store or render source HTML; lines starting
 * with "• " become list items, blank lines separate paragraphs.
 */
export function JobDescription({ text }: { text: string }) {
  const blocks: ({ type: 'p'; lines: string[] } | { type: 'ul'; items: string[] })[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    const last = blocks[blocks.length - 1];
    if (!line) {
      blocks.push({ type: 'p', lines: [] });
      continue;
    }
    const bullet = /^[•\-*·]\s+(.*)$/.exec(line);
    if (bullet) {
      if (last?.type === 'ul') last.items.push(bullet[1]!);
      else blocks.push({ type: 'ul', items: [bullet[1]!] });
    } else if (last?.type === 'p') last.lines.push(line);
    else blocks.push({ type: 'p', lines: [line] });
  }
  return (
    <div className="space-y-3 text-base leading-relaxed text-text">
      {blocks.map((b, i) =>
        b.type === 'ul' ? (
          <ul key={i} className="list-disc space-y-1 pl-5 marker:text-text-subtle">
            {b.items.map((it, j) => (
              <li key={j}>{it}</li>
            ))}
          </ul>
        ) : b.lines.length ? (
          <p key={i}>
            {b.lines.map((l, j) => (
              <span key={j}>
                {j > 0 && <br />}
                {l}
              </span>
            ))}
          </p>
        ) : null,
      )}
    </div>
  );
}
