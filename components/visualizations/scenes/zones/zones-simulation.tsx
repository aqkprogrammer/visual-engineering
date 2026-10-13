"use client";

import { Power, RotateCcw, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import {
  DEFAULT_ZONES_CONFIG,
  DEMAND,
  FAILOVER_STEPS,
  INSTANCE_CAPACITY,
  REPLACE_STEPS,
  zoneLabel,
  zonesModel,
  type Headroom,
  type Layout,
  type ZonesAction,
  type ZonesConfig,
} from "@/lib/simulation/models/zones";
import { runSimulation } from "@/lib/simulation/run";
import { ActionButton, SegmentedControl, Stat, Toggle } from "../../player/controls";
import { SimulationPlayer } from "../../player/simulation-player";
import { useActionLog } from "../../player/use-action-log";
import { usePlayback } from "../../player/use-playback";
import { ZonesScene } from "./zones-scene";

const BASE_TICKS = 40;

export const ZONES_ASSUMPTIONS = [
  `Each step is one minute. Demand is a steady ${DEMAND.toLocaleString("en-US")} requests/s; each instance serves ${INSTANCE_CAPACITY}/s.`,
  `Inside a region the load balancer stops using a failed zone within the minute. Launching a replacement takes ${REPLACE_STEPS} minutes.`,
  `Moving a failed region's users to the other region (DNS health checks plus record TTLs) takes ${FAILOVER_STEPS} minutes; until then, their requests fail.`,
  "Multi-region is active-active with a 50/50 split. Data replication between regions, and its lag, is not modelled.",
  "Failures are total: a failed zone or region serves nothing. Real outages are often partial or gradual.",
];

export function ZonesSimulation() {
  const [config, setConfig] = useState<ZonesConfig>(DEFAULT_ZONES_CONFIG);
  const log = useActionLog<ZonesAction>();
  const ticks = Math.max(BASE_TICKS, (log.actions.at(-1)?.tick ?? 0) + 25);
  const frames = useMemo(
    () => runSimulation(zonesModel, { params: config, seed: 1, ticks, actions: log.actions }),
    [config, ticks, log.actions],
  );
  const playback = usePlayback({ frameCount: frames.length, frameMs: 500 });
  const state = frames[Math.min(playback.frame, frames.length - 1)]!.state;

  const restart = () => {
    log.reset();
    playback.pause();
    playback.seek(0);
  };
  const configure = (change: Partial<ZonesConfig>) => {
    setConfig((c) => ({ ...c, ...change }));
    restart();
  };
  const act = (action: ZonesAction) => {
    log.add(playback.frame + 1, action);
    if (!playback.playing) playback.seek(playback.frame + 1);
  };

  return (
    <SimulationPlayer
      kind="simulation"
      title="Regions and Availability Zones"
      description="One or two regions, each with availability zones holding instances. Users' requests go to each region's healthy instances; failed zones and regions are marked, replacement instances appear as dashed outlines while they launch, and a countdown shows DNS failover between regions."
      frames={frames}
      playback={playback}
      aspectRatio="760 / 400"
      scene={(f) => <ZonesScene state={f.state} />}
      positionLabel={(f) => `${f.index} min`}
      eventTime={(at) => `${at} min`}
      assumptions={ZONES_ASSUMPTIONS}
      stats={(f) => {
        const m = f.state.metrics;
        const t = f.state.totals;
        return (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
            <Stat
              label="Failing now"
              value={m ? `${Math.round(m.errorRate * 100)}%` : "—"}
              tone={m && m.errorRate > 0 ? "fail" : "ok"}
            />
            <Stat
              label="Instances serving"
              value={m ? `${m.inService}${m.launching ? ` (+${m.launching} launching)` : ""}` : "—"}
            />
            <Stat
              label="Availability so far"
              value={
                t.requests ? `${(((t.requests - t.failed) / t.requests) * 100).toFixed(2)}%` : "—"
              }
            />
            <Stat label="Cost (instance-minutes)" value={t.instanceMinutes} />
          </dl>
        );
      }}
      controls={
        <div className="space-y-5">
          <p className="text-xs text-fg-subtle">
            Changing the layout restarts the run. Failures happen at the current minute.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-4">
            <SegmentedControl<Layout>
              label="Layout"
              value={config.layout}
              options={[
                { value: "single-zone", label: "One zone" },
                { value: "multi-zone", label: "Three zones" },
                { value: "multi-region", label: "Two regions" },
              ]}
              onChange={(layout) => configure({ layout })}
            />
            <SegmentedControl<Headroom>
              label="Capacity"
              value={config.headroom}
              options={[
                { value: "lean", label: "Just enough" },
                {
                  value: "survive-failure",
                  label: config.layout === "multi-region" ? "Survive a region" : "Survive a zone",
                },
              ]}
              onChange={(headroom) => configure({ headroom })}
            />
            <Toggle
              label="Auto-recovery"
              description="launch replacements in healthy zones"
              checked={config.autoRecover}
              onChange={(autoRecover) => configure({ autoRecover })}
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-fg-muted">Break something</p>
            <div className="flex flex-wrap gap-2">
              {state.regions.flatMap((r) =>
                r.zones.map((z) =>
                  z.healthy ? (
                    <ActionButton
                      key={z.id}
                      tone="danger"
                      onClick={() => act({ type: "fail-zone", zone: z.id })}
                    >
                      <Zap aria-hidden className="size-3.5" /> Fail {zoneLabel(z.id)}
                    </ActionButton>
                  ) : (
                    <ActionButton
                      key={z.id}
                      tone="positive"
                      onClick={() => act({ type: "restore-zone", zone: z.id })}
                    >
                      <Power aria-hidden className="size-3.5" /> Restore {zoneLabel(z.id)}
                    </ActionButton>
                  ),
                ),
              )}
              {state.regions.length > 1 &&
                state.regions.map((r) =>
                  r.healthy ? (
                    <ActionButton
                      key={r.id}
                      tone="danger"
                      onClick={() => act({ type: "fail-region", region: r.id })}
                    >
                      <Zap aria-hidden className="size-3.5" /> Fail Region {r.id}
                    </ActionButton>
                  ) : (
                    <ActionButton
                      key={r.id}
                      tone="positive"
                      onClick={() => act({ type: "restore-region", region: r.id })}
                    >
                      <Power aria-hidden className="size-3.5" /> Restore Region {r.id}
                    </ActionButton>
                  ),
                )}
              {state.controlPlaneHealthy ? (
                <ActionButton tone="danger" onClick={() => act({ type: "impair-control-plane" })}>
                  <Zap aria-hidden className="size-3.5" /> Impair the control plane
                </ActionButton>
              ) : (
                <ActionButton
                  tone="positive"
                  onClick={() => act({ type: "restore-control-plane" })}
                >
                  <Power aria-hidden className="size-3.5" /> Restore the control plane
                </ActionButton>
              )}
              <ActionButton
                onClick={restart}
                disabled={log.actions.length === 0 && playback.frame === 0}
              >
                <RotateCcw aria-hidden className="size-3.5" /> Restart run
              </ActionButton>
            </div>
          </div>
        </div>
      }
    />
  );
}
