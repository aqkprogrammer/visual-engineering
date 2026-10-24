import { defineInterview } from "@/lib/content/schema";

export default defineInterview([
  {
    id: "cdn-caching-strategy",
    question: "How would you set up CDN caching for a web app's HTML, assets and API?",
    level: "mid",
    kind: "design",
    answer:
      "Give build assets fingerprinted file names and cache them for a long time with immutable, since a new version is a new URL. Cache public HTML at the edge for a short time with s-maxage, and add stale-while-revalidate so users never wait for a refresh; keep browsers revalidating. Cache API responses only when they are the same for everyone, with a carefully chosen cache key. Mark anything personalised private or no-store. Purge changed paths on deploy rather than everything, and consider an origin shield if users are spread across regions.",
    rubric: {
      core: [
        "Long TTLs with versioned URLs for assets",
        "Short edge TTLs plus stale-while-revalidate for HTML",
        "Never caches personalised responses in shared caches",
        "Selective purges rather than purging everything",
      ],
      strong: ["Discusses the cache key", "Mentions an origin shield for multi-region users"],
      redFlags: ["Caches pages that depend on the logged-in user at the edge"],
    },
  },
  {
    id: "stale-after-deploy",
    question:
      "After a release, some users still see the old version for several minutes. Why, and what would you change?",
    level: "junior",
    kind: "debugging",
    answer:
      "Cached copies are still fresh by their TTL in the CDN or the browser, because the URLs didn't change. Fix it by versioning asset URLs so new releases use new URLs, shortening the TTL on HTML and adding revalidation, and purging the changed paths on deploy. Browser caches can't be purged, which is why versioned URLs matter.",
    rubric: {
      core: [
        "Old copies are still fresh by their TTL",
        "Versioned URLs for assets",
        "Short TTL or revalidation for HTML, or purge changed paths",
      ],
      strong: ["Notes that browser caches can't be purged"],
      redFlags: ["Proposes turning caching off entirely"],
    },
  },
  {
    id: "low-hit-ratio",
    question: "Your CDN hit ratio is 30% even though TTLs are long. What would you investigate?",
    level: "senior",
    kind: "debugging",
    answer:
      "The cache key: something that varies per request is making each response unique — query strings such as tracking parameters, cookies, or headers like Accept-Language or User-Agent being included or used in Vary. Check cache-status headers and logs for repeated misses on the same path. Normalise or strip the varying parts from the key, keep Vary minimal, and make sure responses aren't marked uncacheable by Set-Cookie or Cache-Control from the origin. Also check whether traffic is spread across too many locations for the catalogue size, where a shield helps.",
    rubric: {
      core: [
        "Suspects the cache key or Vary",
        "Looks at query strings, cookies and headers",
        "Checks origin headers that disable caching",
      ],
      strong: [
        "Uses cache-status headers or logs to confirm",
        "Mentions a shield for a long tail across many locations",
      ],
      redFlags: ["Only raises TTLs further"],
    },
  },
  {
    id: "cdn-why",
    question: "What does a CDN do for latency and for the origin?",
    level: "junior",
    kind: "concept",
    answer:
      "It serves cached copies from edges near users, so most requests avoid the long round trip to the origin and are answered in tens of milliseconds instead of hundreds. Because most requests are served from cache, the origin handles only misses and refreshes — often a tiny fraction of traffic — which also protects it from spikes.",
    rubric: {
      core: [
        "Serves from edges close to users, cutting round-trip time",
        "Most requests never reach the origin",
      ],
      strong: ["Mentions request collapsing or shields reducing origin load further"],
      redFlags: ["Thinks a CDN speeds up personalised, uncacheable responses by caching them"],
    },
  },
]);
