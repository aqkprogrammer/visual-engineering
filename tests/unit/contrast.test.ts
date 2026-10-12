import { describe, expect, it } from "vitest";
import { contrastRatio, oklchToHex, parseOklch, relativeLuminance } from "@/lib/design/contrast";
import { readThemeTokens } from "@/lib/design/tokens";

const THEMES = { dark: readThemeTokens("dark"), light: readThemeTokens("light") };

// WCAG 2.2: 4.5:1 for body text, 3:1 for large text and essential non-text UI (icons, focus rings).
const TEXT_PAIRS = [
  ["fg", "bg"],
  ["fg", "surface"],
  ["fg-muted", "bg"],
  ["fg-muted", "surface"],
  ["fg-subtle", "bg"],
  ["fg-subtle", "surface"],
  ["accent", "bg"],
  ["accent", "surface"],
  ["accent-fg", "accent"],
  ["ok", "surface-2"],
  ["fail", "surface"],
] as const;

const UI_PAIRS = [
  ["accent", "surface-2"],
  ["warn", "surface"],
  ["data", "surface"],
] as const;

describe("contrast math", () => {
  it("matches known reference values", () => {
    expect(relativeLuminance(parseOklch("oklch(1 0 0)"))).toBeCloseTo(1, 3);
    expect(relativeLuminance(parseOklch("oklch(0 0 0)"))).toBeCloseTo(0, 5);
    expect(contrastRatio(parseOklch("oklch(1 0 0)"), parseOklch("oklch(0 0 0)"))).toBeCloseTo(
      21,
      1,
    );
  });

  it("converts to hex sRGB", () => {
    expect(oklchToHex(parseOklch("oklch(1 0 0)"))).toBe("#ffffff");
    expect(oklchToHex(parseOklch("oklch(0 0 0)"))).toBe("#000000");
    // Reference: CSS Color 4 — oklch(0.628 0.2577 29.23) is sRGB red.
    expect(oklchToHex(parseOklch("oklch(0.628 0.2577 29.23)"))).toBe("#ff0000");
  });

  it("parses alpha and percentages", () => {
    expect(parseOklch("oklch(76% 0.12 245 / 0.14)")).toEqual({
      l: 0.76,
      c: 0.12,
      h: 245,
      alpha: 0.14,
    });
  });
});

describe.each(Object.entries(THEMES))("%s theme tokens", (_name, theme) => {
  it.each(TEXT_PAIRS)("%s on %s meets 4.5:1", (fg, bg) => {
    const ratio = contrastRatio(parseOklch(theme[fg]!), parseOklch(theme[bg]!));
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it.each(UI_PAIRS)("%s on %s meets 3:1", (fg, bg) => {
    const ratio = contrastRatio(parseOklch(theme[fg]!), parseOklch(theme[bg]!));
    expect(ratio).toBeGreaterThanOrEqual(3);
  });
});
