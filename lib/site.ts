export const site = {
  name: "Visual Engineering",
  title: "Visual Engineering — Understand How Technology Works",
  tagline: "Complex engineering concepts. Made visual. Made simple.",
  description:
    "Open-source, interactive lessons that show how software systems, AI, infrastructure and networks actually work — with animations you can play, change and break.",
  repoUrl: "https://github.com/aqkprogrammer/visual-engineering",
} as const;

/**
 * Absolute production origin, e.g. "https://example.org". Unset until a domain exists — callers
 * must then omit canonical URLs and sitemap entries rather than invent one.
 */
export function getSiteUrl(): URL | undefined {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.hostname === "localhost" ? url : undefined;
  } catch {
    return undefined;
  }
}
