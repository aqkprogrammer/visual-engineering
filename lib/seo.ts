import type { Metadata } from "next";
import { getSiteUrl } from "./site";

/**
 * Canonical URL for a path — only when a production domain is configured. Emitting a relative
 * canonical without a known origin is ambiguous, so it is omitted instead.
 */
export function alternatesFor(path: string): Metadata["alternates"] {
  return getSiteUrl() ? { canonical: path } : undefined;
}
