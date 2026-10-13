import { useId } from "react";
import type { IncidentChart } from "@/lib/incidents/evidence";

const WIDTH = 640;
const HEIGHT = 220;
const PAD = { top: 26, right: 16, bottom: 30, left: 44 };
const PLOT_W = WIDTH - PAD.left - PAD.right;
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;

/** Line styles differ in both colour and dash pattern, so series never rely on colour alone. */
const SERIES_STYLE = [
  { stroke: "var(--accent)", dash: undefined },
  { stroke: "var(--warn)", dash: "6 4" },
  { stroke: "var(--fg-muted)", dash: "2 3" },
] as const;

/** Rounds up to 1, 2, 2.5 or 5 × 10ⁿ so axis labels are readable. */
export function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((m) => m * magnitude >= value) ?? 10;
  return step * magnitude;
}

const format = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** A one-sentence text description of each series, for screen readers and the data table. */
export function describeChart(chart: IncidentChart): string {
  return chart.series
    .map((s) => {
      const first = s.values[0] ?? 0;
      const last = s.values.at(-1) ?? 0;
      const max = Math.max(...s.values);
      const min = Math.min(...s.values);
      return `${s.label}: starts at ${format(first)}, ends at ${format(last)} (range ${format(min)}–${format(max)} ${chart.unit})`;
    })
    .join(". ");
}

/**
 * A small static SVG line chart. Rendered on the server; no client JavaScript. The underlying
 * numbers are available in a table for anyone who can't or doesn't want to read the chart.
 */
export function EvidenceChart({ chart, title }: { chart: IncidentChart; title: string }) {
  const id = useId();
  const length = Math.max(...chart.series.map((s) => s.values.length));
  const yMax = chart.yMax ?? niceMax(Math.max(...chart.series.flatMap((s) => s.values)));
  const x = (i: number) => PAD.left + (length <= 1 ? 0 : (i / (length - 1)) * PLOT_W);
  const y = (v: number) => PAD.top + PLOT_H - (Math.min(v, yMax) / yMax) * PLOT_H;
  const xAt = (i: number) => (chart.xStart ?? 0) + i * chart.xStep;
  const xLabel = (i: number) => `${format(xAt(i))} ${chart.xUnit}`;
  const rowEvery = Math.max(1, Math.ceil(length / 16));
  const rows = Array.from({ length }, (_, i) => i).filter(
    (i) => i % rowEvery === 0 || i === length - 1,
  );

  return (
    <figure className="space-y-3">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-labelledby={`${id}-title ${id}-desc`}
        className="h-auto w-full"
      >
        <title id={`${id}-title`}>{title}</title>
        <desc id={`${id}-desc`}>{describeChart(chart)}</desc>

        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={y(yMax * f)}
              y2={y(yMax * f)}
              className="stroke-border"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={y(yMax * f) + 4}
              textAnchor="end"
              className="fill-fg-subtle font-mono text-[11px]"
            >
              {format(yMax * f)}
            </text>
          </g>
        ))}
        {[0, Math.floor((length - 1) / 2), length - 1].map((i, n) => (
          <text
            key={`${i}-${n}`}
            x={x(i)}
            y={HEIGHT - 8}
            textAnchor={n === 0 ? "start" : n === 2 ? "end" : "middle"}
            className="fill-fg-subtle font-mono text-[11px]"
          >
            {xLabel(i)}
          </text>
        ))}

        {chart.markers.map((m) => (
          <g key={m.label}>
            <line
              x1={x(m.at)}
              x2={x(m.at)}
              y1={PAD.top - 6}
              y2={PAD.top + PLOT_H}
              className="stroke-fg-subtle"
              strokeDasharray="3 3"
            />
            <text
              x={x(m.at) + (x(m.at) > WIDTH / 2 ? -6 : 6)}
              y={PAD.top - 10}
              textAnchor={x(m.at) > WIDTH / 2 ? "end" : "start"}
              className="fill-fg-muted text-[12px]"
            >
              {m.label}
            </text>
          </g>
        ))}

        {chart.series.map((s, index) => {
          const style = SERIES_STYLE[index % SERIES_STYLE.length]!;
          return (
            <polyline
              key={s.label}
              fill="none"
              stroke={style.stroke}
              strokeDasharray={style.dash}
              strokeWidth={2}
              strokeLinejoin="round"
              points={s.values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")}
            />
          );
        })}
      </svg>

      <figcaption className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-fg-muted">
        {chart.series.map((s, index) => {
          const style = SERIES_STYLE[index % SERIES_STYLE.length]!;
          return (
            <span key={s.label} className="inline-flex items-center gap-1.5">
              <svg aria-hidden width="22" height="8">
                <line
                  x1="1"
                  x2="21"
                  y1="4"
                  y2="4"
                  stroke={style.stroke}
                  strokeDasharray={style.dash}
                  strokeWidth={2}
                />
              </svg>
              {s.label}
            </span>
          );
        })}
        <span className="text-fg-subtle">Unit: {chart.unit}</span>
      </figcaption>

      <details className="text-sm">
        <summary className="cursor-pointer text-fg-muted hover:text-fg">Show the data</summary>
        <div
          className="relative mt-2 max-h-72 overflow-auto rounded-md border border-border"
          tabIndex={0}
          role="region"
          aria-label={`${title}: data table`}
        >
          <table className="w-full text-left font-mono text-xs">
            <thead className="sticky top-0 bg-surface">
              <tr>
                <th scope="col" className="px-3 py-1.5 font-medium">
                  {chart.xUnit}
                </th>
                {chart.series.map((s) => (
                  <th key={s.label} scope="col" className="px-3 py-1.5 font-medium">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-3 py-1">{format(xAt(i))}</td>
                  {chart.series.map((s) => (
                    <td key={s.label} className="px-3 py-1">
                      {format(s.values[i] ?? 0)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
