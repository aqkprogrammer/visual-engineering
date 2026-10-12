"use client";

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/** A labelled group of mutually exclusive options, rendered as native radio buttons. */
export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const name = useId();
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 text-xs font-medium text-fg-muted">{label}</legend>
      <div className="inline-flex flex-wrap rounded-md border border-border bg-surface p-0.5">
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              "cursor-pointer rounded-[5px] px-2.5 py-1 text-sm text-fg-muted has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent",
              option.value === value &&
                "bg-bg font-medium text-fg shadow-[0_0_0_1px_var(--border-strong)]",
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-sm">
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={cn(
          "relative mt-0.5 inline-flex h-5 w-9 shrink-0 rounded-full border transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent",
          checked ? "border-accent bg-accent" : "border-border-strong bg-surface-2",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-3.5 rounded-full transition-transform",
            checked ? "translate-x-[18px] bg-accent-fg" : "translate-x-0.5 bg-fg-subtle",
          )}
        />
      </span>
      <span>
        <span className="font-medium">{label}</span>
        <span className="block text-xs text-fg-subtle">
          {checked ? "On" : "Off"}
          {description ? ` — ${description}` : ""}
        </span>
      </span>
    </label>
  );
}

export function ActionButton({
  children,
  onClick,
  tone = "neutral",
  disabled,
  label,
}: {
  children: ReactNode;
  onClick: () => void;
  tone?: "neutral" | "danger" | "positive";
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-40",
        tone === "danger" && "border-fail/60 text-fail hover:bg-fail/10",
        tone === "positive" && "border-ok/60 text-ok hover:bg-ok/10",
        tone === "neutral" && "border-border-strong text-fg hover:bg-surface-2",
      )}
    >
      {children}
    </button>
  );
}

/** Small labelled number for the stats strip. */
export function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: ReactNode;
  tone?: "ok" | "warn" | "fail";
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-fg-subtle">{label}</dt>
      <dd
        className={cn(
          "font-mono text-sm tabular-nums",
          tone === "ok" && "text-ok",
          tone === "warn" && "text-warn",
          tone === "fail" && "text-fail",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
