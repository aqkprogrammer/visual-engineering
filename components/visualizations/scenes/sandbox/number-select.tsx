"use client";

import { useId } from "react";

export const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

export function NumberSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: number;
  options: number[];
  onChange(value: number): void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-fg-muted">
        {label}
      </label>
      <select
        id={id}
        data-native-keys
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="rounded-md border border-border-strong bg-bg px-2.5 py-1 text-sm"
      >
        {options.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </div>
  );
}
