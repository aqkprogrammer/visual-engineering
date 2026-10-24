"use client";

import { RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
  cdnModel,
  DEFAULT_CDN_CONFIG,
  EDGE_TO_ORIGIN_MS,
  ORIGIN_MS,
  PAGES,
  REGION_LABEL,
  REGIONS,
  REQUESTS_PER_REGION,
  SWR_SECONDS,
  TTL_OPTIONS,
  USER_TO_EDGE_MS,
  type CdnAction,
  type CdnConfig,
} from "@/lib/simulation/models/cdn";
import { runSimulation } from "@/lib/simulation/run";
import { ActionButton, SegmentedControl, Stat, Toggle } from "../../player/controls";
import { SimulationPlayer } from "../../player/simulation-player";
import { useActionLog } from "../../player/use-action-log";
import { usePlayback } from "../../player/use-playback";
import { CdnScene } from "./cdn-scene";

const BASE_TICKS = 180;

export const CDN_ASSUMPTIONS = [
  `Each step is one second. Users in each of three regions request ${REQUESTS_PER_REGION} pages a second across ${PAGES} pages; a few pages are far more popular than the rest. Requests are counted as fractional amounts.`,
  `Round trips are illustrative: ${USER_TO_EDGE_MS} ms from users to their nearest edge; ${EDGE_TO_ORIGIN_MS.americas}, ${EDGE_TO_ORIGIN_MS.europe} and ${EDGE_TO_ORIGIN_MS.asia} ms from the Americas, Europe and Asia to the origin, which answers in ${ORIGIN_MS} ms. The shield sits beside the origin.`,
  "Caches start warm, with pages stored at different times. An expired page is fetched again in the next second; requests for it in that second wait for the one fetch.",
  `Stale-while-revalidate serves an expired page for up to ${SWR_SECONDS} s more while it is refetched in the background. Publishing changes every page at the origin.`,
];

const ttlLabel = (ttl: number) => (ttl >= 60 ? `${ttl / 60} min` : `${ttl} s`);

export function CdnSimulation() {
  const [config, setConfig] = useState<CdnConfig>(DEFAULT_CDN_CONFIG);
  const log = useActionLog<CdnAction>();
  const ticks = Math.max(BASE_TICKS, (log.actions.at(-1)?.tick ?? 0) + 90);
  const frames = useMemo(
    () => runSimulation(cdnModel, { params: config, seed: 1, ticks, actions: log.actions }),
    [config, ticks, log.actions],
  );
  const playback = usePlayback({ frameCount: frames.length, frameMs: 200 });

  const restart = () => {
    log.reset();
    playback.pause();
    playback.seek(0);
  };
  const configure = (change: Partial<CdnConfig>) => {
    setConfig((c) => ({ ...c, ...change }));
    restart();
  };
  const act = (action: CdnAction) => {
    log.add(playback.frame + 1, action);
    if (!playback.playing) playback.seek(playback.frame + 1);
  };

  return (
    <SimulationPlayer
      kind="simulation"
      title="CDN and edge caching"
      description="Users in Europe, the Americas and Asia request pages from an origin in the Americas, either directly or through edge caches in each region, with an optional origin shield. Each region shows how long users wait and how much is served from cache."
      frames={frames}
      playback={playback}
      aspectRatio="760 / 360"
      scene={(f) => <CdnScene state={f.state} />}
      positionLabel={(f) => `${f.index} s`}
      eventTime={(at) => `${at} s`}
      assumptions={CDN_ASSUMPTIONS}
      stats={(f) => {
        const m = f.state.metrics;
        const stale = m ? REGIONS.reduce((n, r) => n + m.regions[r].stale, 0) : 0;
        const waited = m ? REGIONS.reduce((n, r) => n + m.regions[r].waited, 0) : 0;
        return (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
            {REGIONS.map((r) => (
              <Stat
                key={r}
                label={`${REGION_LABEL[r]}: average wait`}
                value={m ? `${Math.round(m.regions[r].latencyMs)} ms` : "—"}
                tone={m && m.regions[r].latencyMs > 120 ? "warn" : undefined}
              />
            ))}
            <Stat
              label="Requests reaching the origin"
              value={m ? `${Math.round(m.originRequests)}/s` : "—"}
              tone={m && m.originRequests > 100 ? "fail" : undefined}
            />
            <Stat label="Requests waiting for a fetch" value={m ? `${waited.toFixed(1)}/s` : "—"} />
            <Stat
              label="Users given an old version"
              value={m ? `${Math.round(stale)}/s` : "—"}
              tone={stale > 0.5 ? "warn" : "ok"}
            />
          </dl>
        );
      }}
      controls={
        <div className="space-y-5">
          <p className="text-xs text-fg-subtle">
            Changing a setting restarts the run. Actions happen at the current second.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-4">
            <Toggle
              label="CDN"
              description="edge caches in every region"
              checked={config.cdn}
              onChange={(cdn) => configure({ cdn })}
            />
            <SegmentedControl
              label="Cache for (TTL)"
              value={String(config.ttl)}
              options={TTL_OPTIONS.map((t) => ({ value: String(t), label: ttlLabel(t) }))}
              onChange={(v) => configure({ ttl: Number(v) })}
            />
            <Toggle
              label="Stale-while-revalidate"
              description="serve an expired page while refetching it"
              checked={config.staleWhileRevalidate}
              onChange={(staleWhileRevalidate) => configure({ staleWhileRevalidate })}
            />
            <Toggle
              label="Origin shield"
              description="one shared cache in front of the origin"
              checked={config.shield}
              onChange={(shield) => configure({ shield })}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton onClick={() => act({ type: "publish" })}>
              <RefreshCw aria-hidden className="size-3.5" /> Publish new versions
            </ActionButton>
            <ActionButton
              tone="danger"
              onClick={() => act({ type: "purge" })}
              disabled={!config.cdn}
            >
              <Trash2 aria-hidden className="size-3.5" /> Purge every cache
            </ActionButton>
            <ActionButton
              onClick={restart}
              disabled={log.actions.length === 0 && playback.frame === 0}
            >
              <RotateCcw aria-hidden className="size-3.5" /> Restart run
            </ActionButton>
          </div>
        </div>
      }
    />
  );
}
