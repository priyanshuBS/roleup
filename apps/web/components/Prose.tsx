export function Prose({
  title,
  updated,
  children,
}: {
  title: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <article className="max-w-2xl">
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      {updated && <p className="mt-1 text-sm text-text-subtle">Last updated {updated}</p>}
      <div className="mt-5 space-y-4 text-base leading-relaxed text-text [&_h2]:mt-8 [&_h2]:text-md [&_h2]:font-semibold [&_a]:text-accent [&_a:hover]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_li]:text-text">
        {children}
      </div>
    </article>
  );
}
