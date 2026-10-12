export const THEME_STORAGE_KEY = "ve:theme";
export const THEME_PREFERENCES = ["system", "dark", "light"] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];
export type ResolvedTheme = "dark" | "light";

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === "string" && (THEME_PREFERENCES as readonly string[]).includes(value);
}

export function resolveTheme(
  preference: ThemePreference,
  systemPrefersLight: boolean,
): ResolvedTheme {
  if (preference === "system") return systemPrefersLight ? "light" : "dark";
  return preference;
}

export function nextPreference(current: ThemePreference): ThemePreference {
  const index = THEME_PREFERENCES.indexOf(current);
  return THEME_PREFERENCES[(index + 1) % THEME_PREFERENCES.length] ?? "system";
}

/**
 * Runs inline in <head> before first paint to avoid a flash of the wrong theme.
 * Kept tiny and dependency-free; storage access is guarded because it can throw
 * (privacy modes, blocked storage).
 */
export const themeInitScript = `(function(){try{var p=localStorage.getItem("${THEME_STORAGE_KEY}");}catch(e){}if(p!=="dark"&&p!=="light"){p=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";}document.documentElement.dataset.theme=p;})();`;
