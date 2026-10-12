import type { MetadataRoute } from "next";
import { getDomains, getLessons } from "@/lib/content/catalog";
import { getSiteUrl } from "@/lib/site";

export const dynamic = "force-static";

/** Sitemap URLs must be absolute. Until a production domain is configured it is left empty. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  if (!base) return [];
  const url = (path: string) => new URL(path, base).toString();

  return [
    { url: url("/") },
    { url: url("/explore") },
    { url: url("/about") },
    ...getDomains().map((d) => ({ url: url(`/${d.id}`) })),
    ...getLessons().map((l) => ({ url: url(`/${l.id}`), lastModified: l.lastReviewed })),
  ];
}
