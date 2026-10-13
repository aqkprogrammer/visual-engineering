/** Renders text with `code` spans. Content is trusted repository data; nothing is parsed as HTML. */
export function InlineText({ text }: { text: string }) {
  return text.split(/(`[^`]+`)/).map((part, index) =>
    part.startsWith("`") && part.endsWith("`") && part.length > 1 ? (
      <code
        key={index}
        className="rounded border border-border bg-surface-2 px-1 py-px font-mono text-[0.88em] text-fg"
      >
        {part.slice(1, -1)}
      </code>
    ) : (
      part
    ),
  );
}
