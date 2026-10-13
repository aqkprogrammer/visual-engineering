import type { MetadataRoute } from "next";
import {
  getDomains,
  getIncidents,
  getLearningPaths,
  getLessons,
  getPlaygroundDemos,
} from "@/lib/content/catalog";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-static";

/** Sitemap URLs must be absolute. Until a production origin is configured it is left empty. */
export default function sitemap(): MetadataRoute.Sitemap {
  if (!absoluteUrl("/")) return [];
  const url = (path: string) => absoluteUrl(path) ?? path;

  return [
    { url: url("/") },
    { url: url("/explore") },
    { url: url("/about") },
    { url: url("/how-it-works") },
    { url: url("/playground") },
    { url: url("/paths") },
    { url: url("/glossary") },
    { url: url("/interview") },
    { url: url("/incidents") },
    ...getIncidents().map((i) => ({ url: url(`/incidents/${i.slug}`) })),
    ...getLearningPaths().map((p) => ({ url: url(`/paths/${p.slug}`) })),
    ...getPlaygroundDemos().map((d) => ({ url: url(`/playground/${d.slug}`) })),
    ...getDomains().map((d) => ({ url: url(`/${d.id}`) })),
    ...getLessons().map((l) => ({ url: url(`/${l.id}`), lastModified: l.lastReviewed })),
  ];
}
