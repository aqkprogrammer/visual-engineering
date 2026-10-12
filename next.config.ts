import createMDX from "@next/mdx";
import type { NextConfig } from "next";

/**
 * Static-first: every route is prerendered at build time into `out/` (see docs/adr/0001).
 * Cache Components / Partial Prefetching are intentionally not enabled — the site has no
 * request-time data, and `output: "export"` needs `force-static` route handlers, which
 * Cache Components rejects.
 */
// e.g. "/visual-engineering" for a GitHub Pages project site; empty when served from a domain root.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() ?? "";
if (basePath && !/^\/[a-z0-9][a-z0-9._-]*(?:\/[a-z0-9][a-z0-9._-]*)*$/i.test(basePath)) {
  throw new Error(`NEXT_PUBLIC_BASE_PATH must look like "/segment", got "${basePath}"`);
}

const nextConfig: NextConfig = {
  output: "export",
  ...(basePath && { basePath }),
  // Emit `route/index.html` so every static host (including GitHub Pages) resolves clean URLs.
  trailingSlash: true,
  reactStrictMode: true,
  poweredByHeader: false,
  // Static export cannot use the default image optimizer.
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

// Plugins are referenced by name so options stay serializable for Turbopack.
const withMDX = createMDX({
  options: {
    remarkPlugins: ["remark-gfm"],
    rehypePlugins: [
      "rehype-slug",
      [
        "@shikijs/rehype",
        {
          themes: { light: "github-light-high-contrast", dark: "github-dark-high-contrast" },
          defaultColor: false,
        },
      ],
    ],
  },
});

export default withMDX(nextConfig);
