export const site = {
  name: "Visual Engineering",
  title: "Visual Engineering — Understand How Technology Works",
  tagline: "Complex engineering concepts. Made visual. Made simple.",
  description:
    "Open-source, interactive lessons that show how software systems, AI, infrastructure and networks actually work — with animations you can play, change and break.",
  repoUrl: "https://github.com/aqkprogrammer/visual-engineering",
  /** Public deployment (GitHub Pages). Used for links from outside the app, such as the README. */
  liveUrl: "https://aqkprogrammer.github.io/visual-engineering",
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
    if (url.protocol !== "https:" && url.hostname !== "localhost") return undefined;
    return new URL(url.origin);
  } catch {
    return undefined;
  }
}

/**
 * Path prefix when the site is served from a sub-path, e.g. "/visual-engineering" on GitHub
 * Pages project sites. Empty when served from the domain root. Mirrors `basePath` in next.config.
 */
export function getBasePath(): string {
  const raw = process.env.NEXT_PUBLIC_BASE_PATH?.trim() ?? "";
  return /^\/[a-z0-9][a-z0-9._-]*(?:\/[a-z0-9][a-z0-9._-]*)*$/i.test(raw) ? raw : "";
}

/**
 * Absolute URL for an app path ("/explore" → "https://host/base/explore/"), or undefined when no
 * production origin is configured. Page paths get the trailing slash the static export uses;
 * file paths such as "/sitemap.xml" do not.
 */
export function absoluteUrl(path: string): string | undefined {
  const origin = getSiteUrl();
  if (!origin) return undefined;
  const isFile = /\.[a-z0-9]+$/i.test(path);
  const normalised = isFile || path.endsWith("/") ? path : `${path}/`;
  return new URL(`${getBasePath()}${normalised}`, origin).toString();
}
