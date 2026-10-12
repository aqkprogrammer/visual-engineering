/**
 * WCAG 2.x contrast for OKLCH colors, used to verify design tokens in tests.
 * OKLCH → OKLab → linear sRGB uses the reference matrices from Björn Ottosson's OKLab definition.
 */
export type Oklch = { l: number; c: number; h: number; alpha: number };

export function parseOklch(value: string): Oklch {
  const match = value
    .trim()
    .match(/^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)(?:deg)?\s*(?:\/\s*([\d.]+)(%?))?\s*\)$/);
  if (!match) throw new Error(`Not an oklch() color: ${value}`);
  const [, l, lPct, c, h, a, aPct] = match;
  return {
    l: Number(l) / (lPct ? 100 : 1),
    c: Number(c),
    h: Number(h),
    alpha: a === undefined ? 1 : Number(a) / (aPct ? 100 : 1),
  };
}

/** Linear-light sRGB channels, clamped to the displayable gamut. */
export function oklchToLinearSrgb({ l, c, h }: Oklch): [number, number, number] {
  const hr = (h * Math.PI) / 180;
  const a = c * Math.cos(hr);
  const b = c * Math.sin(hr);

  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;

  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  return [
    clamp(4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_),
    clamp(-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_),
    clamp(-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_),
  ];
}

/** Hex sRGB for contexts that cannot use oklch(), e.g. SVG images embedded in a README. */
export function oklchToHex(color: Oklch): string {
  const encode = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
  return `#${oklchToLinearSrgb(color)
    .map((v) =>
      Math.round(encode(v) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

export function relativeLuminance(color: Oklch): number {
  const [r, g, b] = oklchToLinearSrgb(color);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(foreground: Oklch, background: Oklch): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
