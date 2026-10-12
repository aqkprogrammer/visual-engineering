import { afterEach, describe, expect, it, vi } from "vitest";
import { getSiteUrl } from "@/lib/site";
import { nextPreference, resolveTheme, themeInitScript } from "@/lib/theme";

describe("theme preferences", () => {
  it("cycles system → dark → light → system", () => {
    expect(nextPreference("system")).toBe("dark");
    expect(nextPreference("dark")).toBe("light");
    expect(nextPreference("light")).toBe("system");
  });

  it("resolves system preference from the OS setting", () => {
    expect(resolveTheme("system", true)).toBe("light");
    expect(resolveTheme("system", false)).toBe("dark");
    expect(resolveTheme("dark", true)).toBe("dark");
  });

  it("init script survives blocked storage and falls back to the OS preference", () => {
    const documentElement = { dataset: {} as Record<string, string> };
    const run = new Function("localStorage", "window", "document", themeInitScript);
    const throwingStorage = {
      getItem: () => {
        throw new Error("SecurityError");
      },
    };
    run(throwingStorage, { matchMedia: () => ({ matches: true }) }, { documentElement });
    expect(documentElement.dataset.theme).toBe("light");
  });

  it("init script honours a stored explicit choice", () => {
    const documentElement = { dataset: {} as Record<string, string> };
    const run = new Function("localStorage", "window", "document", themeInitScript);
    run({ getItem: () => "dark" }, { matchMedia: () => ({ matches: true }) }, { documentElement });
    expect(documentElement.dataset.theme).toBe("dark");
  });
});

describe("getSiteUrl", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("is undefined until a domain is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(getSiteUrl()).toBeUndefined();
  });

  it("accepts an https origin", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.org");
    expect(getSiteUrl()?.origin).toBe("https://example.org");
  });

  it.each(["http://example.org", "not a url"])("rejects %j", (value) => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", value);
    expect(getSiteUrl()).toBeUndefined();
  });
});
