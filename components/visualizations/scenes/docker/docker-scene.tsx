import type { DockerState, StepStatus } from "@/lib/simulation/models/docker";
import { cn } from "@/lib/utils/cn";

const W = 760;
const H = 400;
const LINE_H = 34;

const STATUS: Record<StepStatus, { label: string; text: string; stroke: string }> = {
  pending: { label: "…", text: "fill-fg-subtle", stroke: "stroke-border" },
  cached: { label: "✓ CACHED", text: "fill-ok", stroke: "stroke-ok" },
  built: { label: "⚙ BUILT", text: "fill-warn", stroke: "stroke-warn" },
};

export function DockerScene({ state }: { state: DockerState }) {
  const layers = state.steps.filter((s) => !s.metadataOnly);
  const layerH = 34;
  const stackX = 470;
  const stackBottom = 330;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full font-mono" aria-hidden>
      {/* Dockerfile */}
      <text x={20} y={24} className="fill-fg-subtle text-[11px]">
        Dockerfile · build #{state.buildNumber}
      </text>
      <rect
        x={16}
        y={34}
        width={420}
        height={state.steps.length * LINE_H + 16}
        rx={10}
        className="fill-surface stroke-border-strong"
      />
      {state.steps.map((s, i) => {
        const y = 50 + i * LINE_H;
        const active = state.current === i;
        const st = STATUS[s.status];
        return (
          <g key={s.id}>
            {active && (
              <rect
                x={22}
                y={y - 6}
                width={408}
                height={LINE_H - 4}
                rx={6}
                className="fill-accent-soft stroke-accent"
              />
            )}
            <text
              x={34}
              y={y + 14}
              className={cn("text-[12px]", s.status === "pending" ? "fill-fg-muted" : "fill-fg")}
            >
              {s.text}
            </text>
            <text x={420} y={y + 14} textAnchor="end" className={cn("text-[10px]", st.text)}>
              {st.label}
            </text>
          </g>
        );
      })}

      {/* Image layers, bottom-up */}
      <text x={stackX} y={24} className="fill-fg-subtle text-[11px]">
        {state.phase === "run"
          ? "container = image layers + writable layer"
          : "image layers (read-only)"}
      </text>
      {layers.map((s, i) => {
        const y = stackBottom - (i + 1) * (layerH + 4);
        const st = STATUS[s.status];
        return (
          <g key={s.id}>
            <rect
              x={stackX}
              y={y}
              width={270}
              height={layerH}
              rx={6}
              strokeDasharray={s.status === "pending" ? "4 4" : undefined}
              className={cn("fill-surface-2", st.stroke)}
            />
            <text x={stackX + 10} y={y + 15} className="fill-fg text-[11px]">
              {s.id === "from"
                ? "node:24-slim base layers"
                : s.text.length > 30
                  ? `${s.text.slice(0, 29)}…`
                  : s.text}
            </text>
            <text x={stackX + 10} y={y + 28} className="fill-fg-subtle text-[10px]">
              {s.status === "pending" ? "not built yet" : `${s.size} · layer ${s.layer}`}
            </text>
          </g>
        );
      })}
      {state.phase === "run" && (
        <g>
          <rect
            x={stackX}
            y={stackBottom - (layers.length + 1) * (layerH + 4)}
            width={270}
            height={layerH}
            rx={6}
            strokeDasharray="5 3"
            className="fill-accent-soft stroke-accent"
          />
          <text
            x={stackX + 10}
            y={stackBottom - (layers.length + 1) * (layerH + 4) + 21}
            className="fill-accent text-[11px]"
          >
            writable container layer (temporary)
          </text>
        </g>
      )}

      {/* Registry */}
      {state.pushed && (
        <g>
          <rect
            x={16}
            y={300}
            width={420}
            height={60}
            rx={10}
            className="fill-surface-2 stroke-data"
          />
          <text x={30} y={324} className="fill-fg text-[12px] font-medium">
            registry
          </text>
          <text x={30} y={344} className="fill-fg-muted text-[11px]">
            {state.pushed.uploaded.length} layer{state.pushed.uploaded.length === 1 ? "" : "s"}{" "}
            uploaded · {state.pushed.skipped.length} already present
          </text>
        </g>
      )}
      <text x={W - 20} y={H - 14} textAnchor="end" className="fill-fg-subtle text-[11px]">
        build time so far: {state.seconds.toFixed(1)} s (illustrative)
      </text>
    </svg>
  );
}
