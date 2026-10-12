"use client";

import { ArrowUpRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { site } from "@/lib/site";
import { NAV_ITEMS } from "./nav-items";

/** Disclosure-pattern menu for narrow screens: a button that shows and hides the site links. */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const pathname = usePathname();
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Navigating to another page closes the menu.
  if (open && openedAt !== pathname) {
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="sm:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setOpenedAt(pathname);
          setOpen((value) => !value);
        }}
        className="inline-flex size-9 items-center justify-center rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg"
      >
        {open ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
        <span className="sr-only">Menu</span>
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="absolute inset-x-0 top-14 border-b border-border bg-bg px-4 pt-2 pb-4"
      >
        <ul className="grid gap-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={pathname.startsWith(item.href) ? "page" : undefined}
                className="block rounded-md px-3 py-2.5 text-fg hover:bg-surface-2 aria-[current=page]:bg-surface"
              >
                {item.label}
              </Link>
            </li>
          ))}
          <li>
            <a
              href={site.repoUrl}
              className="flex items-center gap-1.5 rounded-md px-3 py-2.5 text-fg hover:bg-surface-2"
            >
              GitHub <ArrowUpRight aria-hidden className="size-4" />
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
