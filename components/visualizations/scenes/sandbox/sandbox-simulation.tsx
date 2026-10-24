"use client";

import { CircleCheck, CircleX, Link2, Power, RotateCcw, Snail, Trash2, Zap } from "lucide-react";
import { useId, useMemo, useState, useSyncExternalStore } from "react";
import { CHALLENGES, FREE_PLAY_ID, evaluate, getChallenge } from "@/lib/sandbox/challenges";
import {
  decodeDesign,
  encodeDesign,
  READ_SHARES,
  TRAFFIC_BASES,
  type SharedDesign,
} from "@/lib/sandbox/share";
import {
  CAPACITY,
  costUnits,
  HIT_RATIOS,
  LIMITS,
  sandboxModel,
  SERVICE_MS,
  TIER_LABEL,
  WARMUP_TICKS,
  type Architecture,
  type Metrics,
  type SandboxAction,
  type Tier,
  type TrafficProfile,
} from "@/lib/simulation/models/sandbox";
import { runSimulation } from "@/lib/simulation/run";
import { cn } from "@/lib/utils/cn";
import { ActionButton, SegmentedControl, Stat, Toggle } from "../../player/controls";
import { SimulationPlayer } from "../../player/simulation-player";
import { useActionLog } from "../../player/use-action-log";
import { usePlayback } from "../../player/use-playback";
import { CompareDesigns } from "./compare-designs";
import { NumberSelect, range } from "./number-select";
import { SandboxScene } from "./sandbox-scene";

const SEED = 1;

export const SANDBOX_ASSUMPTIONS = [
  `Each step is one second. Capacities are illustrative: ${CAPACITY.appServer} requests/s per app server, ${CAPACITY.primary} operations/s for the database primary and for each read replica, ${CAPACITY.worker} writes/s per queue worker.`,
  `Latency is a queueing approximation: each component's idle time (app ${SERVICE_MS.app} ms, database ${SERVICE_MS.database} ms, cache ${SERVICE_MS.cache} ms) multiplied by 1 / (1 − utilisation), capped at 20×.`,
  "Requests beyond a component's capacity fail rather than wait; there are no retries, timeouts or autoscaling.",
  `A flushed cache warms up linearly over ${WARMUP_TICKS} seconds. Reads go to replicas when there are any; writes always go to the primary.`,
  "Cost is in illustrative units (one per server, replica or cache, half per queue and worker), not prices.",
];

const per = (n: number) => `${Math.round(n).toLocaleString("en-US")}/s`;
const pctText = (n: number) => `${(n * 100).toFixed(n > 0 && n < 0.1 ? 1 : 0)}%`;

function utilisationText(u: number | undefined) {
  if (u === undefined) return "—";
  return Number.isFinite(u) ? `${Math.round(u * 100)}%` : "no capacity";
}

/** The same numbers as the diagram, as a table: the accessible view of the scene. */
function ComponentTable({ m, a }: { m: Metrics; a: Architecture }) {
  const rows: { tier: Tier; load: string; capacity: string }[] = [
    { tier: "app", load: per(m.offered), capacity: per(m.appCapacity) },
  ];
  if (a.readReplicas > 0) {
    rows.push({ tier: "replicas", load: per(m.replicaLoad), capacity: per(m.replicaCapacity) });
  }
  rows.push({ tier: "primary", load: per(m.primaryLoad), capacity: per(m.primaryCapacity) });
  if (a.asyncWrites) {
    rows.push({
      tier: "workers",
      load: `${per(m.writes)} + ${Math.round(m.backlog)} queued`,
      capacity: per(a.workers * CAPACITY.worker),
    });
  }
  return (
    <div
      className="relative mt-4 overflow-x-auto"
      tabIndex={0}
      role="region"
      aria-label="Load on each component"
    >
      <table className="w-full min-w-[28rem] text-left text-xs">
        <thead className="text-fg-subtle">
          <tr>
            <th scope="col" className="py-1 pr-3 font-medium">
              Component
            </th>
            <th scope="col" className="py-1 pr-3 font-medium">
              Load
            </th>
            <th scope="col" className="py-1 pr-3 font-medium">
              Capacity
            </th>
            <th scope="col" className="py-1 font-medium">
              Utilisation
            </th>
          </tr>
        </thead>
        <tbody className="font-mono">
          {rows.map((row) => {
            const u = m.utilisation[row.tier];
            return (
              <tr key={row.tier} className="border-t border-border">
                <th scope="row" className="py-1 pr-3 font-sans font-normal">
                  {TIER_LABEL[row.tier]}
                  {m.bottleneck === row.tier && <span className="text-warn"> (bottleneck)</span>}
                </th>
                <td className="py-1 pr-3">{row.load}</td>
                <td className="py-1 pr-3">{row.capacity}</td>
                <td
                  className={cn(
                    "py-1",
                    u !== undefined && u >= 1
                      ? "text-fail"
                      : u !== undefined && u >= 0.8 && "text-warn",
                  )}
                >
                  {utilisationText(u)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const noopSubscribe = () => () => {};

/**
 * Opens the design in the page's link, if any. The first render always shows the default design
 * (it is server-rendered); a linked design replaces it once the page has hydrated.
 */
export function SandboxSimulation() {
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  // Read once: later changes to the address bar (e.g. copying a link) must not reset the run.
  const shared = useMemo(
    () => (hydrated ? decodeDesign(window.location.search) : null),
    [hydrated],
  );
  return <Sandbox key={shared ? "shared" : "default"} shared={shared} />;
}

type LinkStatus = { copied: true } | { copied: false; url: string } | null;

function Sandbox({ shared }: { shared: SharedDesign | null }) {
  const [challengeId, setChallengeId] = useState(shared?.challengeId ?? FREE_PLAY_ID);
  const challenge = getChallenge(challengeId);
  const [architecture, setArchitecture] = useState<Architecture>(
    shared?.architecture ?? challenge.start,
  );
  const [freeTraffic, setFreeTraffic] = useState<TrafficProfile>({
    ...challenge.traffic,
    ...shared?.traffic,
  });
  const traffic = challenge.goals ? challenge.traffic : freeTraffic;
  const log = useActionLog<SandboxAction>(shared?.failures);
  const [linkStatus, setLinkStatus] = useState<LinkStatus>(null);
  const scenarioId = useId();

  const copyLink = async () => {
    const query = encodeDesign({
      challengeId,
      architecture,
      ...(!challenge.goals && {
        traffic: { base: freeTraffic.base, readShare: freeTraffic.readShare },
      }),
      failures: log.actions,
    });
    const url = `${window.location.origin}${window.location.pathname}?${query}`;
    window.history.replaceState(window.history.state, "", url);
    try {
      await navigator.clipboard.writeText(url);
      setLinkStatus({ copied: true });
    } catch {
      // Clipboard access can be blocked; show the link so it can be copied by hand.
      setLinkStatus({ copied: false, url });
    }
  };

  const ticks = Math.max(challenge.ticks, (log.actions.at(-1)?.tick ?? 0) + 30);
  const actions = useMemo(
    () => [...challenge.script, ...log.actions].sort((x, y) => x.tick - y.tick),
    [challenge.script, log.actions],
  );
  const frames = useMemo(
    () =>
      runSimulation(sandboxModel, {
        params: { architecture, traffic },
        seed: SEED,
        ticks,
        actions,
      }),
    [architecture, traffic, ticks, actions],
  );
  const playback = usePlayback({ frameCount: frames.length, frameMs: 400 });
  const state = frames[Math.min(playback.frame, frames.length - 1)]!.state;
  const results = challenge.goals ? evaluate(frames, architecture, challenge.goals) : null;

  /** Architecture and traffic are the design under test: changing them restarts the run. */
  const restart = () => {
    setLinkStatus(null);
    log.reset();
    playback.pause();
    playback.seek(0);
  };
  const design = (change: Partial<Architecture>) => {
    setArchitecture((a) => ({ ...a, ...change }));
    restart();
  };
  const act = (action: SandboxAction) => {
    setLinkStatus(null);
    log.add(playback.frame + 1, action);
    if (!playback.playing) playback.seek(playback.frame + 1);
  };

  return (
    <div className="space-y-6">
      <section
        aria-labelledby={`${scenarioId}-title`}
        className="space-y-3 rounded-xl border border-border p-5"
      >
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={scenarioId} className="text-xs font-medium text-fg-muted">
              Scenario
            </label>
            <select
              id={scenarioId}
              value={challengeId}
              onChange={(event) => {
                const next = getChallenge(event.target.value);
                setChallengeId(next.id);
                setArchitecture(next.start);
                restart();
              }}
              className="rounded-md border border-border-strong bg-bg px-2.5 py-1.5 text-sm"
            >
              {CHALLENGES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.goals ? `Challenge: ${c.title}` : c.title}
                </option>
              ))}
            </select>
          </div>
          <p className="font-mono text-xs text-fg-subtle">
            Cost of this design: {costUnits(architecture)} units
          </p>
          <button
            type="button"
            onClick={() => void copyLink()}
            className="inline-flex items-center gap-1.5 rounded-md border border-border-strong px-2.5 py-1 text-xs hover:bg-surface"
          >
            <Link2 aria-hidden className="size-3.5" /> Copy link to this design
          </button>
          <span role="status" className="text-xs text-fg-muted">
            {linkStatus?.copied && "Link copied — it opens this scenario, design and failures."}
          </span>
        </div>
        {linkStatus && !linkStatus.copied && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${scenarioId}-link`} className="text-xs font-medium text-fg-muted">
              Couldn&apos;t copy automatically — copy this link:
            </label>
            <input
              id={`${scenarioId}-link`}
              readOnly
              value={linkStatus.url}
              onFocus={(event) => event.target.select()}
              className="w-full rounded-md border border-border-strong bg-bg px-2.5 py-1 font-mono text-xs"
            />
          </div>
        )}
        <h2 id={`${scenarioId}-title`} className="font-semibold">
          {challenge.title}
        </h2>
        <p className="text-sm text-fg-muted">{challenge.brief}</p>
        <details className="text-sm">
          <summary className="cursor-pointer text-fg-muted hover:text-fg">Hint</summary>
          <p className="mt-1 text-fg-muted">{challenge.hint}</p>
        </details>

        {results && (
          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-sm font-medium" aria-live="polite">
              Load test result for this design:{" "}
              {results.every((r) => r.passed) ? (
                <span className="text-ok">all goals met</span>
              ) : (
                <span className="text-fail">
                  {results.filter((r) => !r.passed).length} of {results.length} goals missed
                </span>
              )}
            </p>
            <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
              {results.map((r) => (
                <li key={r.label} className="flex gap-2">
                  {r.passed ? (
                    <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-ok" />
                  ) : (
                    <CircleX aria-hidden className="mt-0.5 size-4 shrink-0 text-fail" />
                  )}
                  <span>
                    <span className="sr-only">{r.passed ? "Met: " : "Missed: "}</span>
                    {r.label}
                    <span className="block text-xs text-fg-subtle">{r.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-fg-subtle">
              Checked against every second of the run, including any failures you inject.
            </p>
          </div>
        )}
      </section>

      <SimulationPlayer
        kind="simulation"
        title="System design sandbox"
        description="A diagram of requests flowing from clients through a load balancer and app servers to an optional cache, read replicas, a write queue and the database primary. Each component shows its load against its capacity, and the bottleneck is labelled. The table below the playback controls lists the same numbers."
        frames={frames}
        playback={playback}
        aspectRatio="760 / 400"
        scene={(f) => <SandboxScene state={f.state} />}
        positionLabel={(f) => `${f.index} s`}
        eventTime={(at) => `${at} s`}
        assumptions={SANDBOX_ASSUMPTIONS}
        stats={(f) => {
          const m = f.state.metrics;
          if (!m)
            return <p className="text-sm text-fg-muted">Press Play to start the load test.</p>;
          return (
            <>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-5">
                <Stat label="Offered" value={per(m.offered)} />
                <Stat
                  label="Error rate"
                  value={pctText(m.errorRate)}
                  tone={m.errorRate > 0.01 ? "fail" : m.errorRate > 0 ? "warn" : "ok"}
                />
                <Stat
                  label="Latency (illustrative)"
                  value={`${Math.round(m.latencyMs)} ms`}
                  tone={m.latencyMs > 150 ? "warn" : undefined}
                />
                <Stat
                  label="Cache hit ratio"
                  value={f.state.architecture.cache ? pctText(m.hitRatio) : "no cache"}
                />
                <Stat
                  label="Write backlog"
                  value={
                    f.state.architecture.asyncWrites
                      ? Number.isFinite(m.backlogSeconds)
                        ? `${Math.round(m.backlog)} (${m.backlogSeconds.toFixed(1)} s)`
                        : `${Math.round(m.backlog)} (not draining)`
                      : "no queue"
                  }
                  tone={m.backlogSeconds > 10 ? "warn" : undefined}
                />
              </dl>
              <ComponentTable m={m} a={f.state.architecture} />
            </>
          );
        }}
        controls={
          <div className="space-y-5">
            <p className="text-xs text-fg-subtle">
              Changing the design restarts the run. Failures happen at the current second.
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-4">
              {!challenge.goals && (
                <>
                  <SegmentedControl
                    label="Traffic"
                    value={String(freeTraffic.base)}
                    options={TRAFFIC_BASES.map((n) => ({
                      value: String(n),
                      label: `${n.toLocaleString("en-US")}/s`,
                    }))}
                    onChange={(base) => {
                      setFreeTraffic((t) => ({ ...t, base: Number(base) }));
                      restart();
                    }}
                  />
                  <SegmentedControl
                    label="Reads"
                    value={String(freeTraffic.readShare)}
                    options={READ_SHARES.map((n) => ({
                      value: String(n),
                      label: `${Math.round(n * 100)}%`,
                    }))}
                    onChange={(share) => {
                      setFreeTraffic((t) => ({ ...t, readShare: Number(share) }));
                      restart();
                    }}
                  />
                </>
              )}
              <NumberSelect
                label="App servers"
                value={architecture.appServers}
                options={range(...LIMITS.appServers)}
                onChange={(appServers) => design({ appServers })}
              />
              <NumberSelect
                label="Read replicas"
                value={architecture.readReplicas}
                options={range(...LIMITS.readReplicas)}
                onChange={(readReplicas) => design({ readReplicas })}
              />
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-4">
              <div className="space-y-2">
                <Toggle
                  label="Cache"
                  description="answers repeated reads"
                  checked={architecture.cache}
                  onChange={(cache) => design({ cache })}
                />
                {architecture.cache && (
                  <SegmentedControl
                    label="Hit ratio"
                    value={String(architecture.cacheHitRatio)}
                    options={HIT_RATIOS.map((n) => ({
                      value: String(n),
                      label: `${Math.round(n * 100)}%`,
                    }))}
                    onChange={(r) => design({ cacheHitRatio: Number(r) })}
                  />
                )}
              </div>
              <div className="space-y-2">
                <Toggle
                  label="Write queue"
                  description="accept writes now, save them later"
                  checked={architecture.asyncWrites}
                  onChange={(asyncWrites) => design({ asyncWrites })}
                />
                {architecture.asyncWrites && (
                  <NumberSelect
                    label="Queue workers"
                    value={architecture.workers}
                    options={range(...LIMITS.workers)}
                    onChange={(workers) => design({ workers })}
                  />
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-fg-muted">Break something</p>
              <div className="flex flex-wrap gap-2">
                <ActionButton
                  tone="danger"
                  onClick={() => act({ type: "fail-server" })}
                  disabled={state.failedServers >= architecture.appServers}
                >
                  <Zap aria-hidden className="size-3.5" /> Fail an app server
                </ActionButton>
                <ActionButton
                  tone="positive"
                  onClick={() => act({ type: "restore-servers" })}
                  disabled={state.failedServers === 0}
                >
                  <Power aria-hidden className="size-3.5" /> Replace failed servers
                </ActionButton>
                <ActionButton
                  tone="danger"
                  onClick={() => act({ type: "flush-cache" })}
                  disabled={!architecture.cache}
                >
                  <Trash2 aria-hidden className="size-3.5" /> Flush the cache
                </ActionButton>
                {state.databaseDegraded ? (
                  <ActionButton tone="positive" onClick={() => act({ type: "restore-database" })}>
                    <Power aria-hidden className="size-3.5" /> Restore the database
                  </ActionButton>
                ) : (
                  <ActionButton tone="danger" onClick={() => act({ type: "degrade-database" })}>
                    <Snail aria-hidden className="size-3.5" /> Slow the database
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
      <CompareDesigns
        architecture={architecture}
        traffic={traffic}
        ticks={ticks}
        actions={actions}
        framesA={frames}
        goals={challenge.goals}
        onAdopt={(b) => design(b)}
      />
    </div>
  );
}
