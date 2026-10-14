import { createHash } from "node:crypto";
import { build, insert, INITIAL_KEYS } from "@/lib/simulation/models/btree";
import { DEFAULT_KUBE_PARAMS, kubernetesModel } from "@/lib/simulation/models/kubernetes";
import { DEFAULT_LB_PARAMS, loadBalancerModel } from "@/lib/simulation/models/load-balancer";
import { DEFAULT_QUEUE_CONFIG, queueModel } from "@/lib/simulation/models/queue";
import { DEFAULT_LIMITER_CONFIG, rateLimiterModel } from "@/lib/simulation/models/rate-limiter";
import { runSimulation } from "@/lib/simulation/run";
import type { SimulationModel } from "@/lib/simulation/types";

export const fingerprint = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);

/**
 * Fixed scenarios that exercise every action of the models whose state copying was optimised.
 * Their outputs were fingerprinted with the original structuredClone implementation.
 */
export type Scenario = {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: SimulationModel<any, any, any>;
  params: unknown;
  ticks: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actions: { tick: number; action: any }[];
};

export const SCENARIOS: Scenario[] = [
  {
    name: "load balancer: crash, restart, scale, reconfigure",
    model: loadBalancerModel,
    params: DEFAULT_LB_PARAMS,
    ticks: 400,
    actions: [
      { tick: 50, action: { type: "crash", server: "app-2" } },
      { tick: 120, action: { type: "restart", server: "app-2" } },
      { tick: 160, action: { type: "add-server" } },
      {
        tick: 200,
        action: { type: "configure", config: { algorithm: "least-connections", traffic: "high" } },
      },
      { tick: 260, action: { type: "configure", config: { healthChecks: false } } },
      { tick: 280, action: { type: "crash", server: "app-1" } },
      { tick: 330, action: { type: "remove-server" } },
    ],
  },
  {
    name: "queue: spike, slow downstream, bounded, poison",
    model: queueModel,
    params: DEFAULT_QUEUE_CONFIG,
    ticks: 400,
    actions: [
      { tick: 40, action: { type: "configure", config: { rate: "spike" } } },
      { tick: 80, action: { type: "configure", config: { slowDownstream: true, bounded: true } } },
      { tick: 150, action: { type: "configure", config: { consumers: 6, poisonShare: 0.05 } } },
      { tick: 260, action: { type: "configure", config: { rate: "low", slowDownstream: false } } },
    ],
  },
  ...(["token-bucket", "fixed-window", "sliding-log", "sliding-counter"] as const).map(
    (algorithm) => ({
      name: `rate limiter: ${algorithm}`,
      model: rateLimiterModel,
      params: { ...DEFAULT_LIMITER_CONFIG, algorithm },
      ticks: 300,
      actions: [
        { tick: 60, action: { type: "configure", config: { pattern: "boundary" } } },
        { tick: 140, action: { type: "configure", config: { limit: 20, pattern: "steady-over" } } },
      ],
    }),
  ),
  {
    name: "kubernetes: crashes, node failure, scaling",
    model: kubernetesModel,
    params: DEFAULT_KUBE_PARAMS,
    ticks: 160,
    actions: [
      { tick: 5, action: { type: "crash-container", pod: "__first__" } },
      { tick: 20, action: { type: "fail-node", node: "node-b" } },
      { tick: 45, action: { type: "scale", replicas: 5 } },
      { tick: 70, action: { type: "recover-node", node: "node-b" } },
      { tick: 90, action: { type: "delete-pod", pod: "__first__" } },
      { tick: 120, action: { type: "scale", replicas: 2 } },
    ],
  },
];

/** B+ tree inserts, including splits that cascade to a new root. */
export function btreeScenario() {
  let tree = build(INITIAL_KEYS);
  const logs: string[][] = [];
  for (const key of [5, 6, 8, 9, 10, 11, 13, 14, 99, 100, 101, 102]) {
    const result = insert(tree, key);
    tree = result.tree;
    logs.push(result.log);
  }
  return { tree, logs };
}

/** Replaces "__first__" pod placeholders with the first live pod's name at that tick. */
export function resolveScenario(scenario: Scenario): Scenario {
  const actions: Scenario["actions"] = [];
  for (const { tick, action } of scenario.actions) {
    if (action.pod === "__first__") {
      const frames = runSimulation(scenario.model, {
        params: scenario.params,
        seed: 1,
        ticks: tick - 1,
        actions,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pods = (frames.at(-1)!.state as any).pods as { name: string; status: string }[];
      const pod = pods.find((p) => p.status === "Running") ?? pods[0]!;
      actions.push({ tick, action: { ...action, pod: pod.name } });
    } else {
      actions.push({ tick, action });
    }
  }
  return { ...scenario, actions };
}

export function runScenario(scenario: Scenario) {
  const resolved = resolveScenario(scenario);
  return runSimulation(resolved.model, {
    params: resolved.params,
    seed: 1,
    ticks: resolved.ticks,
    actions: resolved.actions,
  });
}
