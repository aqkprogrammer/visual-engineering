import { afterEach, describe, expect, it, vi } from "vitest";
import { absoluteUrl, getBasePath, getSiteUrl } from "@/lib/site";
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

describe("absoluteUrl", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("is undefined without a production origin", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(absoluteUrl("/explore")).toBeUndefined();
  });

  it("joins origin, base path and a trailing-slash page path", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://aqkprogrammer.github.io");
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "/visual-engineering");
    expect(absoluteUrl("/")).toBe("https://aqkprogrammer.github.io/visual-engineering/");
    expect(absoluteUrl("/system-design/load-balancing")).toBe(
      "https://aqkprogrammer.github.io/visual-engineering/system-design/load-balancing/",
    );
    expect(absoluteUrl("/sitemap.xml")).toBe(
      "https://aqkprogrammer.github.io/visual-engineering/sitemap.xml",
    );
  });

  it("works at a domain root and ignores any path in the origin variable", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.org/ignored/path");
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "");
    expect(absoluteUrl("/about")).toBe("https://example.org/about/");
  });

  it.each(["visual-engineering", "/bad path", "/../etc"])("rejects base path %j", (value) => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", value);
    expect(getBasePath()).toBe("");
  });
});
