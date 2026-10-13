"use client";

import {
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  FlaskConical,
  Info,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { SPEEDS, type Speed } from "@/lib/simulation/playback";
import type { Frame, SimEvent } from "@/lib/simulation/types";
import { cn } from "@/lib/utils/cn";
import type { Playback } from "./use-playback";

const MAX_LOG_ENTRIES = 8;

const TONE_ICON = {
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  error: CircleAlert,
} as const;

const TONE_CLASS = {
  info: "text-fg-subtle",
  success: "text-ok",
  warning: "text-warn",
  error: "text-fail",
} as const;

export type SimulationPlayerProps<State> = {
  title: string;
  /** What the visual shows, for people who can't see it. */
  description: string;
  kind: "simulation" | "walkthrough";
  frames: Frame<State>[];
  playback: Playback;
  scene: (frame: Frame<State>) => ReactNode;
  /** CSS aspect ratio of the scene, e.g. "760 / 380". */
  aspectRatio: string;
  /** Short position label, e.g. "Step 3 of 11" or "1.25 s". */
  positionLabel: (frame: Frame<State>) => string;
  /** How to label an event's time in the log. */
  eventTime: (at: number) => string;
  assumptions: string[];
  /** Parameter and action controls rendered under the playback bar. */
  controls?: ReactNode;
  /** Key numbers for the current frame. */
  stats?: (frame: Frame<State>) => ReactNode;
  /** Walkthroughs list every step so readers can jump straight to one. */
  stepTitles?: string[];
};

/** Events up to and including the current frame, newest first. */
export function recentEvents<State>(
  frames: Frame<State>[],
  index: number,
  limit = MAX_LOG_ENTRIES,
) {
  const out: SimEvent[] = [];
  for (let i = index; i >= 0 && out.length < limit; i--) {
    const events = frames[i]?.events ?? [];
    for (let j = events.length - 1; j >= 0 && out.length < limit; j--) out.push(events[j]!);
  }
  return out;
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.closest('input, select, textarea, [contenteditable="true"], [data-native-keys]') !== null
  );
}

export function SimulationPlayer<State>({
  title,
  description,
  kind,
  frames,
  playback,
  scene,
  aspectRatio,
  positionLabel,
  eventTime,
  assumptions,
  controls,
  stats,
  stepTitles,
}: SimulationPlayerProps<State>) {
  const id = useId();
  const rootRef = useRef<HTMLElement>(null);
  // On narrow screens a scene's text is tiny when fitted to the width; enlarging renders it at a
  // readable size inside a horizontally scrollable area.
  const [enlarged, setEnlarged] = useState(false);
  const frame = frames[Math.min(playback.frame, frames.length - 1)]!;
  const atEnd = playback.frame >= frames.length - 1;
  const { pause, playing } = playback;

  // Pause when scrolled out of view.
  useEffect(() => {
    const element = rootRef.current;
    if (!element || !playing || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry && !entry.isIntersecting) pause();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [playing, pause]);

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey || isEditable(event.target)) return;
    const onRoot = event.target === event.currentTarget;
    if (event.key === "k" || (event.key === " " && onRoot)) playback.toggle();
    else if (event.key === "ArrowRight") playback.next();
    else if (event.key === "ArrowLeft") playback.previous();
    else if (event.key === "Home") playback.seek(0);
    else return;
    event.preventDefault();
  };

  const log = recentEvents(frames, playback.frame);
  const sceneStyle = {
    aspectRatio,
    // Scenes use this to tween between frames; reduced motion switches tweening off.
    "--frame-ms": playback.reducedMotion
      ? "0ms"
      : `${Math.round(playback.frameMs / playback.speed)}ms`,
  } as CSSProperties;

  return (
    <section
      ref={rootRef}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-desc`}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="not-prose relative my-10 overflow-hidden rounded-xl border border-border bg-bg outline-none"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h3 id={`${id}-title`} className="text-sm font-semibold">
          {title}
        </h3>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-data/60 px-2.5 py-0.5 font-mono text-[11px] text-fg-muted">
          <FlaskConical aria-hidden className="size-3.5" />
          Teaching model
        </span>
      </header>

      <p id={`${id}-desc`} className="sr-only">
        {description}
      </p>

      <div className="flex justify-end border-b border-border px-3 py-1.5 sm:hidden">
        <button
          type="button"
          aria-pressed={enlarged}
          onClick={() => setEnlarged((e) => !e)}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-fg-muted hover:bg-surface-2 hover:text-fg aria-pressed:text-fg"
        >
          <Maximize2 aria-hidden className="size-3.5" />
          Enlarge diagram
        </button>
      </div>
      {enlarged ? (
        <div
          className="relative overflow-x-auto"
          tabIndex={0}
          role="region"
          aria-label={`${title}: enlarged diagram, scroll sideways`}
        >
          <div className="relative min-w-[720px] bg-blueprint" style={sceneStyle}>
            {scene(frame)}
          </div>
        </div>
      ) : (
        <div className="relative bg-blueprint" style={sceneStyle}>
          {scene(frame)}
        </div>
      )}

      <div className="border-t border-border px-4 py-3">
        <p
          aria-live={playing ? "off" : "polite"}
          aria-atomic="true"
          className="min-h-[2.75rem] text-sm leading-relaxed text-fg"
        >
          {frame.caption}
        </p>
        {stats && <div className="mt-3">{stats(frame)}</div>}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border bg-surface px-3 py-2.5">
        <div className="flex items-center gap-1" role="group" aria-label="Playback">
          <ControlButton
            label="Restart"
            onClick={() => playback.seek(0)}
            disabled={playback.frame === 0}
          >
            <RotateCcw className="size-4" />
          </ControlButton>
          <ControlButton
            label="Previous step"
            onClick={playback.previous}
            disabled={playback.frame === 0}
          >
            <ChevronLeft className="size-4" />
          </ControlButton>
          <button
            type="button"
            onClick={playback.toggle}
            aria-label={playing ? "Pause" : atEnd ? "Replay" : "Play"}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-accent px-3.5 text-sm font-medium text-accent-fg hover:opacity-90"
          >
            {playing ? (
              <Pause aria-hidden className="size-4" />
            ) : (
              <Play aria-hidden className="size-4" />
            )}
            <span aria-hidden>{playing ? "Pause" : atEnd ? "Replay" : "Play"}</span>
          </button>
          <ControlButton label="Next step" onClick={playback.next} disabled={atEnd}>
            <ChevronRight className="size-4" />
          </ControlButton>
        </div>

        <label className="flex min-w-[10rem] flex-1 items-center gap-3">
          <span className="sr-only">Timeline</span>
          <input
            type="range"
            min={0}
            max={frames.length - 1}
            step={1}
            value={playback.frame}
            onChange={(e) => playback.seek(Number(e.target.value))}
            aria-valuetext={`${positionLabel(frame)}: ${frame.caption}`}
            className="h-1.5 w-full cursor-pointer accent-[var(--accent)]"
          />
        </label>

        <span className="font-mono text-xs whitespace-nowrap text-fg-muted tabular-nums">
          {positionLabel(frame)}
        </span>

        <label className="flex items-center gap-1.5 text-xs text-fg-muted">
          Speed
          <select
            aria-label="Playback speed"
            value={playback.speed}
            onChange={(e) => playback.setSpeed(Number(e.target.value) as Speed)}
            className="rounded-md border border-border bg-bg px-1.5 py-1 font-mono text-xs text-fg"
          >
            {SPEEDS.map((speed) => (
              <option key={speed} value={speed}>
                {speed}×
              </option>
            ))}
          </select>
        </label>
      </div>

      {controls && (
        <div data-native-keys className="border-t border-border px-4 py-4">
          {controls}
        </div>
      )}

      <div className="grid border-t border-border md:grid-cols-[1fr_minmax(0,16rem)]">
        <div className="px-4 py-3">
          <h4 className="font-mono text-[11px] tracking-wide text-fg-subtle uppercase">
            Event log
          </h4>
          {log.length === 0 ? (
            <p className="mt-2 text-sm text-fg-subtle">
              {kind === "walkthrough"
                ? "Step forward to begin."
                : "Press play to start the simulation."}
            </p>
          ) : (
            <ol className="mt-2 space-y-1.5 text-sm">
              {log.map((event, i) => {
                const tone = event.tone ?? "info";
                const Icon = TONE_ICON[tone];
                return (
                  <li key={`${event.at}-${i}`} className="flex gap-2">
                    <span className="w-14 shrink-0 font-mono text-xs leading-5 text-fg-subtle tabular-nums">
                      {eventTime(event.at)}
                    </span>
                    <Icon aria-hidden className={cn("mt-0.5 size-4 shrink-0", TONE_CLASS[tone])} />
                    <span>
                      <span className="sr-only">{tone}: </span>
                      {event.message}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
        <details className="border-t border-border px-4 py-3 text-sm md:border-t-0 md:border-l">
          <summary className="cursor-pointer font-mono text-[11px] tracking-wide text-fg-subtle uppercase">
            Assumptions
          </summary>
          <ul className="mt-2 list-disc space-y-1.5 pl-4 text-fg-muted">
            {assumptions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </details>
      </div>

      {stepTitles && (
        <details className="border-t border-border px-4 py-3 text-sm">
          <summary className="cursor-pointer font-mono text-[11px] tracking-wide text-fg-subtle uppercase">
            All steps
          </summary>
          <ol className="mt-2 grid gap-1 sm:grid-cols-2">
            {stepTitles.map((stepTitle, index) => (
              <li key={stepTitle}>
                <button
                  type="button"
                  onClick={() => playback.seek(index)}
                  aria-current={index === playback.frame ? "step" : undefined}
                  className={cn(
                    "w-full rounded-md px-2 py-1 text-left hover:bg-surface",
                    index === playback.frame && "bg-accent-soft font-medium",
                  )}
                >
                  <span className="mr-2 font-mono text-xs text-fg-subtle">{index + 1}.</span>
                  {stepTitle}
                </button>
              </li>
            ))}
          </ol>
        </details>
      )}

      <p className="border-t border-border px-4 py-2 text-xs text-fg-subtle">
        Keyboard: <kbd className="font-mono">K</kbd> play/pause · <kbd className="font-mono">←</kbd>{" "}
        <kbd className="font-mono">→</kbd> step · <kbd className="font-mono">Home</kbd> restart
      </p>
    </section>
  );
}

/**
 * Uses aria-disabled rather than disabled: a natively disabled button drops keyboard focus,
 * which would strand keyboard users when, say, "Next" reaches the last step.
 */
function ControlButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : onClick}
      className="inline-flex size-9 items-center justify-center rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:bg-transparent [&_svg]:pointer-events-none"
    >
      <span aria-hidden>{children}</span>
    </button>
  );
}
