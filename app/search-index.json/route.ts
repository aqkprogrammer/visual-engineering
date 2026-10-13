import { buildSearchIndex } from "@/lib/search/build";

export const dynamic = "force-static";

/**
 * The search index as a static file. The search page fetches it after it has rendered, so the
 * index's size never delays the page's first paint.
 */
export function GET() {
  return Response.json(buildSearchIndex());
}
