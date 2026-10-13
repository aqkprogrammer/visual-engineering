"use client";

import { useMemo, useState } from "react";
import {
  ALARM_THRESHOLD,
  BAKE_STEPS,
  BASELINE_ERROR,
  BOOT_STEPS,
  BUGGY_ERROR,
  CANARY_MARGIN,
  CANARY_STAGES,
  DEFAULT_DEPLOY_CONFIG,
  DEMAND,
  deploymentModel,
  FLEET,
  MANUAL_DETECTION_STEPS,
  type DeployConfig,
  type Strategy,
} from "@/lib/simulation/models/deployments";
import { runSimulation } from "@/lib/simulation/run";
import { SegmentedControl, Stat, Toggle } from "../../player/controls";
import { SimulationPlayer } from "../../player/simulation-player";
import { usePlayback } from "../../player/use-playback";
import { DeploymentsScene } from "./deployments-scene";

const TICKS = 40;
const pct = (n: number) => `${(n * 100).toFixed(n < 0.1 ? 1 : 0)}%`;

export const DEPLOYMENT_ASSUMPTIONS = [
  `Each step is one minute. ${FLEET} instances serve ${DEMAND.toLocaleString("en-US")} requests/s with a ${pct(BASELINE_ERROR)} baseline error rate; the buggy v2 fails ${pct(BUGGY_ERROR)} of the requests it handles.`,
  `New instances take ${BOOT_STEPS} minutes to start. Rolling batches and canary stages (${CANARY_STAGES.map((s) => `${s * 100}%`).join(" → ")}) each run for ${BAKE_STEPS} minutes.`,
  `Automated rollback: an alarm on the overall error rate above ${pct(ALARM_THRESHOLD)} for two minutes; canary analysis compares canary and control, triggering at ${pct(CANARY_MARGIN)} worse for two minutes. Without automation, someone notices ${MANUAL_DETECTION_STEPS} minutes after errors start.`,
  "All-at-once replaces every instance simultaneously, so nothing serves while they restart (like Kubernetes' Recreate strategy).",
  "The bug is in the code, not the data: rolling back fixes it completely. Database changes can make real rollbacks much harder.",
];

export function DeploymentsSimulation() {
  const [config, setConfig] = useState<DeployConfig>(DEFAULT_DEPLOY_CONFIG);
  const frames = useMemo(
    () => runSimulation(deploymentModel, { params: config, seed: 1, ticks: TICKS, actions: [] }),
    [config],
  );
  const playback = usePlayback({ frameCount: frames.length, frameMs: 500 });

  const configure = (change: Partial<DeployConfig>) => {
    setConfig((c) => ({ ...c, ...change }));
    playback.pause();
    playback.seek(0);
  };

  return (
    <SimulationPlayer
      kind="simulation"
      title="Deployment strategies"
      description="A traffic bar showing how much traffic goes to the old version (v1) and the new version (v2), the instances running each version, and a timeline of the error rate against a dashed alarm threshold, as a release is rolled out and possibly rolled back."
      frames={frames}
      playback={playback}
      aspectRatio="760 / 400"
      scene={(f) => <DeploymentsScene state={f.state} />}
      positionLabel={(f) => `${f.index} min`}
      eventTime={(at) => `${at} min`}
      assumptions={DEPLOYMENT_ASSUMPTIONS}
      stats={(f) => {
        const t = f.state.totals;
        return (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
            <Stat
              label="Error rate now"
              value={f.state.metrics ? pct(f.state.metrics.errorRate) : "—"}
              tone={
                f.state.metrics && f.state.metrics.errorRate > ALARM_THRESHOLD ? "fail" : undefined
              }
            />
            <Stat
              label="Failed requests so far"
              value={Math.round(t.failed).toLocaleString("en-US")}
            />
            <Stat
              label="Peak error rate"
              value={pct(t.peakErrorRate)}
              tone={t.peakErrorRate > ALARM_THRESHOLD ? "fail" : undefined}
            />
            <Stat label="Cost (instance-minutes)" value={t.instanceMinutes} />
          </dl>
        );
      }}
      controls={
        <div className="space-y-4">
          <p className="text-xs text-fg-subtle">Every setting restarts the run from minute 0.</p>
          <div className="flex flex-wrap gap-x-6 gap-y-4">
            <SegmentedControl<Strategy>
              label="Strategy"
              value={config.strategy}
              options={[
                { value: "all-at-once", label: "All at once" },
                { value: "rolling", label: "Rolling" },
                { value: "blue-green", label: "Blue-green" },
                { value: "canary", label: "Canary" },
              ]}
              onChange={(strategy) => configure({ strategy })}
            />
            <Toggle
              label="v2 has a bug"
              description={`fails ${pct(BUGGY_ERROR)} of its requests`}
              checked={config.buggy}
              onChange={(buggy) => configure({ buggy })}
            />
            <Toggle
              label="Automated rollback"
              description="alarms and canary analysis"
              checked={config.autoRollback}
              onChange={(autoRollback) => configure({ autoRollback })}
            />
          </div>
        </div>
      }
    />
  );
}
