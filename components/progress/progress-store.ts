"use client";

import { useSyncExternalStore } from "react";
import {
  EMPTY_PROGRESS,
  PROGRESS_STORAGE_KEY,
  parseProgress,
  type Progress,
} from "@/lib/progress/progress";

/**
 * Progress lives in localStorage. Storage can be unavailable (private windows, blocked site data)
 * or throw, so every access is guarded and an in-memory copy keeps the current page working.
 */
const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cached: Progress = EMPTY_PROGRESS;
let memoryFallback: string | null = null;
let writeFailed = false;

function readRaw(): string | null {
  if (writeFailed) return memoryFallback;
  try {
    return window.localStorage.getItem(PROGRESS_STORAGE_KEY);
  } catch {
    return memoryFallback;
  }
}

function getSnapshot(): Progress {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    let parsed: unknown = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      parsed = null;
    }
    cached = parseProgress(parsed);
  }
  return cached;
}

function getServerSnapshot(): Progress {
  return EMPTY_PROGRESS;
}

function notify() {
  for (const listener of listeners) listener();
}

function onStorage(event: StorageEvent) {
  if (event.key === null || event.key === PROGRESS_STORAGE_KEY) notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

/** Applies a pure update to the stored progress and notifies every subscriber on the page. */
export function updateProgress(update: (progress: Progress) => Progress) {
  const current = getSnapshot();
  const next = update(current);
  if (next === current) return;
  const raw = Object.keys(next.lessons).length === 0 ? null : JSON.stringify(next);
  memoryFallback = raw;
  try {
    if (raw === null) window.localStorage.removeItem(PROGRESS_STORAGE_KEY);
    else window.localStorage.setItem(PROGRESS_STORAGE_KEY, raw);
  } catch {
    // Storage is unavailable or full; the in-memory copy still updates this page.
    writeFailed = true;
  }
  notify();
}

export function clearProgress() {
  updateProgress(() => EMPTY_PROGRESS);
}

/** The visitor's progress. Always empty during server rendering and hydration. */
export function useProgress(): Progress {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

const noopSubscribe = () => () => {};

/** False while server rendering and hydrating, true afterwards. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
