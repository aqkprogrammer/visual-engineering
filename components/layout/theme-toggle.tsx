"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import {
  THEME_STORAGE_KEY,
  isThemePreference,
  nextPreference,
  resolveTheme,
  type ThemePreference,
} from "@/lib/theme";

const LABELS: Record<ThemePreference, string> = {
  system: "System theme",
  dark: "Dark theme",
  light: "Light theme",
};

const listeners = new Set<() => void>();
// Fallback when storage is unavailable (privacy modes); keeps the toggle working for the session.
let memoryPreference: ThemePreference = "system";

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemePreference(stored)) return stored;
  } catch {
    // fall through to in-memory value
  }
  return memoryPreference;
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function applyTheme(preference: ThemePreference) {
  const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
  document.documentElement.dataset.theme = resolveTheme(preference, prefersLight);
}

export function ThemeToggle() {
  const preference = useSyncExternalStore(subscribe, readPreference, () => "system" as const);

  // While following the system, track OS-level changes live.
  useEffect(() => {
    if (preference !== "system") return;
    const query = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => applyTheme("system");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [preference]);

  const next = nextPreference(preference);
  const Icon = preference === "dark" ? Moon : preference === "light" ? Sun : Monitor;

  return (
    <button
      type="button"
      onClick={() => {
        memoryPreference = next;
        try {
          localStorage.setItem(THEME_STORAGE_KEY, next);
        } catch {
          // storage blocked — in-memory preference still applies
        }
        applyTheme(next);
        listeners.forEach((listener) => listener());
      }}
      aria-label={`${LABELS[preference]}. Switch to ${LABELS[next].toLowerCase()}`}
      title={LABELS[preference]}
      className="inline-flex size-9 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
    >
      <Icon aria-hidden className="size-[18px]" strokeWidth={1.75} />
    </button>
  );
}
