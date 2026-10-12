import type { Metadata } from "next";
import { absoluteUrl } from "./site";

/**
 * Absolute canonical URL for a path — only when a production origin is configured. Emitting a
 * relative canonical without a known origin is ambiguous, so it is omitted instead.
 */
export function alternatesFor(path: string): Metadata["alternates"] {
  const canonical = absoluteUrl(path);
  return canonical ? { canonical } : undefined;
}
