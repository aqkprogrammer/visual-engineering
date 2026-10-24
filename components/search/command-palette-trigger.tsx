"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const load = () => import("./command-palette");
// Not part of any page's initial JavaScript: fetched once the page is idle, or on first use.
const CommandPalette = dynamic(load, { ssr: false });

/** Opens quick search with ⌘K (macOS) or Ctrl+K, on every page. */
export function CommandPaletteTrigger() {
  const [open, setOpen] = useState(false);
  // Characters typed after ⌘K but before the palette is ready, so none are lost.
  const early = useRef<string | null>(null);

  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 2000));
    const cancelIdle = window.cancelIdleCallback ?? window.clearTimeout;
    const handle = idle(() => void load());

    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((o) => {
          early.current = o ? null : "";
          return !o;
        });
        return;
      }
      if (early.current !== null && event.key.length === 1 && !event.metaKey && !event.ctrlKey) {
        // Held for the palette; stop the browser typing it into whatever gets focus next.
        event.preventDefault();
        early.current += event.key;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    // Lets tests (and anyone curious) know the shortcut is live.
    document.documentElement.dataset.quickSearch = "ready";
    return () => {
      cancelIdle(handle);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  if (!open) return null;
  return (
    <CommandPalette
      takeEarlyInput={() => {
        const typed = early.current ?? "";
        early.current = null;
        return typed;
      }}
      onClose={() => {
        early.current = null;
        setOpen(false);
      }}
    />
  );
}
