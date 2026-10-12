/** Node-only helper: reads the design tokens defined in app/globals.css. */
import { readFileSync } from "node:fs";

const GLOBALS_CSS = new URL("../../app/globals.css", import.meta.url);

export type ThemeName = "dark" | "light";

/** `--token: value` pairs from the `[data-theme="<theme>"] { … }` block. */
export function readThemeTokens(theme: ThemeName, css = readFileSync(GLOBALS_CSS, "utf8")) {
  const block = css.match(new RegExp(`\\[data-theme="${theme}"\\]\\s*\\{([^}]*)\\}`))?.[1];
  if (!block) throw new Error(`No [data-theme="${theme}"] block in globals.css`);
  return Object.fromEntries(
    [...block.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]),
  ) as Record<string, string>;
}
