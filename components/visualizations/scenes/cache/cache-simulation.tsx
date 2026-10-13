"use client";

import { Eraser, PencilLine, RotateCcw } from "lucide-react";
import { useMemo } from "react";
import {
  averageLatency,
  cacheModel,
  DEFAULT_CACHE_CONFIG,
  HIT_MS,
  hitRatio,
  KEYS,
  MISS_MS,
  type CacheAction,
  type CacheConfig,
  type Pattern,
  type Policy,
} from "@/lib/simulation/models/cache";
import { runSimulation } from "@/lib/simulation/run";
import { ActionButton, SegmentedControl, Stat, Toggle } from "../../player/controls";
import { SimulationPlayer } from "../../player/simulation-player";
import { useActionLog } from "../../player/use-action-log";
import { usePlayback } from "../../player/use-playback";
import { CacheScene } from "./cache-scene";

const SEED = 4242;
const BASE_TICKS = 300;

export const CACHE_ASSUMPTIONS = [
  "One request per step for one of eight keys (A–H). Every value is the same size.",
  `Cache hits cost ${HIT_MS} ms and misses ${MISS_MS} ms — illustrative numbers, not benchmarks.`,
  "Cache-aside: the app reads the cache, loads misses from the database, and writes go straight to the database.",
  "LRU and LFU are exact here; production caches such as Redis approximate them by sampling.",
  "LFU counts every use since an entry was cached and never decays.",
];

export function CacheSimulation() {
  const log = useActionLog<CacheAction>();
  const ticks = Math.max(BASE_TICKS, (log.actions.at(-1)?.tick ?? 0) + 150);
  const frames = useMemo(
    () =>
      runSimulation(cacheModel, {
        params: DEFAULT_CACHE_CONFIG,
        seed: SEED,
        ticks,
        actions: log.actions,
      }),
    [log.actions, ticks],
  );
  const playback = usePlayback({ frameCount: frames.length, frameMs: 450 });
  const state = frames[Math.min(playback.frame, frames.length - 1)]!.state;
  const act = (action: CacheAction) => {
    log.add(playback.frame + 1, action);
    if (!playback.playing) playback.seek(playback.frame + 1);
  };
  const configure = (config: Partial<CacheConfig>) => act({ type: "configure", config });

  return (
    <SimulationPlayer
      kind="simulation"
      title="Cache simulation"
      description="An app reads keys through a cache in front of a database. You can change the eviction policy, capacity, access pattern and expiry, write new values to the database, and watch hits, misses, evictions and stale reads."
      frames={frames}
      playback={playback}
      aspectRatio="760 / 380"
      scene={(f) => <CacheScene state={f.state} />}
      positionLabel={(f) => `Request ${f.index}`}
      eventTime={(at) => `#${at}`}
      assumptions={CACHE_ASSUMPTIONS}
      stats={(f) => {
        const ratio = hitRatio(f.state);
        const latency = averageLatency(f.state);
        return (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
            <Stat
              label="Hit ratio (last 40)"
              value={ratio === undefined ? "—" : `${Math.round(ratio * 100)}%`}
            />
            <Stat
              label="Avg latency (illustrative)"
              value={latency === undefined ? "—" : `${latency.toFixed(1)} ms`}
            />
            <Stat label="Misses" value={f.state.totals.misses} />
            <Stat
              label="Stale reads"
              value={f.state.totals.stale}
              tone={f.state.totals.stale > 0 ? "fail" : "ok"}
            />
          </dl>
        );
      }}
      controls={
        <div className="space-y-5">
          <div className="flex flex-wrap gap-x-6 gap-y-4">
            <SegmentedControl<Policy>
              label="Eviction policy"
              value={state.config.policy}
              options={[
                { value: "lru", label: "LRU" },
                { value: "lfu", label: "LFU" },
                { value: "fifo", label: "FIFO" },
              ]}
              onChange={(policy) => configure({ policy })}
            />
            <SegmentedControl
              label="Capacity"
              value={String(state.config.capacity)}
              options={[2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: String(n) }))}
              onChange={(capacity) => configure({ capacity: Number(capacity) })}
            />
            <SegmentedControl<Pattern>
              label="Access pattern"
              value={state.config.pattern}
              options={[
                { value: "hot-keys", label: "Hot keys" },
                { value: "uniform", label: "Uniform" },
                { value: "scan", label: "Sequential scan" },
              ]}
              onChange={(pattern) => configure({ pattern })}
            />
            <SegmentedControl
              label="Expiry (TTL)"
              value={String(state.config.ttl)}
              options={[
                { value: "0", label: "None" },
                { value: "10", label: "10 requests" },
                { value: "30", label: "30 requests" },
              ]}
              onChange={(ttl) => configure({ ttl: Number(ttl) })}
            />
            <Toggle
              label="Invalidate on write"
              description="delete the cached copy when the database changes"
              checked={state.config.invalidateOnWrite}
              onChange={(invalidateOnWrite) => configure({ invalidateOnWrite })}
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-fg-muted">
              Write a new value to the database
            </p>
            <ul className="flex flex-wrap gap-2">
              {KEYS.map((key) => (
                <li key={key}>
                  <ActionButton
                    label={`Write a new version of ${key}`}
                    onClick={() => act({ type: "write", key })}
                  >
                    <PencilLine aria-hidden className="size-3.5" /> {key}
                  </ActionButton>
                </li>
              ))}
              <li>
                <ActionButton tone="danger" onClick={() => act({ type: "flush" })}>
                  <Eraser aria-hidden className="size-3.5" /> Flush cache
                </ActionButton>
              </li>
              <li className="ml-auto">
                <ActionButton
                  onClick={() => {
                    log.reset();
                    playback.pause();
                    playback.seek(0);
                  }}
                  disabled={log.actions.length === 0 && playback.frame === 0}
                >
                  <RotateCcw aria-hidden className="size-3.5" /> Reset scenario
                </ActionButton>
              </li>
            </ul>
          </div>
        </div>
      }
    />
  );
}
