/**
 * Teaching model of Kubernetes self-healing for one Deployment ("web") on three nodes.
 *
 * It reproduces the *order* of events and who is responsible for each — ReplicaSet controller,
 * scheduler, kubelet, node lifecycle controller, EndpointSlice controller — but compresses time:
 * every duration is a few ticks, while event messages quote the real default values.
 * Not modelled: rolling updates, resource requests, affinity, PodDisruptionBudgets, liveness probes
 * (a crash is injected directly), and the API server/etcd round-trips between components.
 */
import type { Rng } from "../rng";
import type { SimEvent, SimulationModel, StepResult } from "../types";

export const CREATE_TICKS = 3; // pull (cached) image + start container
export const READY_DELAY_TICKS = 2; // readiness probe initial delay
export const TERMINATION_TICKS = 3; // terminationGracePeriodSeconds (default 30 s)
export const BACKOFF_BASE_TICKS = 2; // first restart delay (real default 10 s)
export const BACKOFF_CAP_TICKS = 16; // maximum delay (real default 300 s)
export const BACKOFF_RESET_TICKS = 12; // stable running time that resets back-off (real default 10 min)
export const NOT_READY_AFTER_TICKS = 4; // node-monitor grace period before Ready becomes Unknown
export const EVICT_AFTER_TICKS = 10; // default toleration for not-ready/unreachable (real 300 s)

const SUFFIX_ALPHABET = "bcdfghjklmnpqrstvwxz2456789"; // same alphabet Kubernetes uses
const TEMPLATE_HASH = "6d4cf56db6";
const NODE_NAMES = ["node-a", "node-b", "node-c"] as const;
export const MAX_REPLICAS = 6;

export type PodStatus =
  "Pending" | "ContainerCreating" | "Running" | "Error" | "CrashLoopBackOff" | "Terminating";

export type Pod = {
  name: string;
  node: string | null;
  status: PodStatus;
  ready: boolean;
  restarts: number;
  /** Ticks until the current transition completes (creating, back-off, terminating). */
  timer: number;
  /** Tick at which the readiness probe first succeeds. */
  readyAt: number | null;
  consecutiveCrashes: number;
  runningSince: number | null;
  createdAt: number;
};

export type Node = {
  name: string;
  /** Whether the machine and its kubelet are actually working. */
  healthy: boolean;
  /** The control plane's view: the node's Ready condition. */
  ready: boolean;
  failedAt: number | null;
  notReadySince: number | null;
};

export type KubeState = {
  tick: number;
  desired: number;
  pods: Pod[];
  nodes: Node[];
};

export type KubeParams = { replicas: number };
export const DEFAULT_KUBE_PARAMS: KubeParams = { replicas: 3 };

export type KubeAction =
  | { type: "crash-container"; pod: string }
  | { type: "delete-pod"; pod: string }
  | { type: "fail-node"; node: string }
  | { type: "recover-node"; node: string }
  | { type: "scale"; replicas: number };

/** Pods and nodes are updated in place, so each step copies them (both lists are short). */
function clone(state: KubeState): KubeState {
  return {
    ...state,
    pods: state.pods.map((p) => ({ ...p })),
    nodes: state.nodes.map((n) => ({ ...n })),
  };
}

function podName(rng: Rng): string {
  let suffix = "";
  for (let i = 0; i < 5; i++) suffix += SUFFIX_ALPHABET[rng.int(0, SUFFIX_ALPHABET.length - 1)];
  return `web-${TEMPLATE_HASH}-${suffix}`;
}

/** Real default restart delay in seconds for the n-th consecutive crash. */
export function realBackoffSeconds(crashes: number): number {
  return Math.min(10 * 2 ** (crashes - 1), 300);
}

function backoffTicks(crashes: number): number {
  return Math.min(BACKOFF_BASE_TICKS * 2 ** (crashes - 1), BACKOFF_CAP_TICKS);
}

/** Pods that count towards the ReplicaSet: everything not already being deleted. */
export function activePods(state: KubeState): Pod[] {
  return state.pods.filter((p) => p.status !== "Terminating");
}

/** Pods the Service sends traffic to: Ready pods on Ready nodes. */
export function endpoints(state: KubeState): Pod[] {
  return state.pods.filter((p) => p.ready && p.status === "Running");
}

function nodeOf(state: KubeState, pod: Pod): Node | undefined {
  return state.nodes.find((n) => n.name === pod.node);
}

function newPod(rng: Rng, tick: number): Pod {
  return {
    name: podName(rng),
    node: null,
    status: "Pending",
    ready: false,
    restarts: 0,
    timer: 0,
    readyAt: null,
    consecutiveCrashes: 0,
    runningSince: null,
    createdAt: tick,
  };
}

function startTerminating(pod: Pod) {
  pod.status = "Terminating";
  pod.ready = false;
  pod.timer = TERMINATION_TICKS;
}

function tick(state: KubeState, rng: Rng): StepResult<KubeState> {
  const s = clone(state);
  const events: SimEvent[] = [];
  s.tick += 1;
  const at = s.tick;

  // Node lifecycle controller: a silent kubelet makes the node NotReady after a grace period,
  // its pods stop being Ready, and after the default toleration they are evicted.
  for (const node of s.nodes) {
    if (
      !node.healthy &&
      node.ready &&
      node.failedAt !== null &&
      at - node.failedAt >= NOT_READY_AFTER_TICKS
    ) {
      node.ready = false;
      node.notReadySince = at;
      events.push({
        at,
        tone: "warning",
        message: `${node.name} stopped reporting — marked NotReady`,
      });
      for (const pod of s.pods.filter((p) => p.node === node.name && p.ready)) {
        pod.ready = false;
        events.push({
          at,
          tone: "warning",
          message: `${pod.name} is no longer Ready — removed from Service endpoints`,
        });
      }
    }
    if (
      !node.ready &&
      node.notReadySince !== null &&
      at - node.notReadySince === EVICT_AFTER_TICKS
    ) {
      const victims = s.pods.filter((p) => p.node === node.name && p.status !== "Terminating");
      for (const pod of victims) startTerminating(pod);
      if (victims.length > 0) {
        events.push({
          at,
          tone: "warning",
          message: `Toleration expired (default 300 s) — evicting ${victims.length} pod${victims.length === 1 ? "" : "s"} from ${node.name}`,
        });
      }
    }
  }

  // Kubelet: only kubelets on healthy nodes make progress.
  const removed: string[] = [];
  for (const pod of s.pods) {
    const node = nodeOf(s, pod);
    if (!node || !node.healthy) continue;
    switch (pod.status) {
      case "ContainerCreating":
        pod.timer -= 1;
        if (pod.timer <= 0) {
          pod.status = "Running";
          pod.runningSince = at;
          pod.readyAt = at + READY_DELAY_TICKS;
          events.push({ at, tone: "info", message: `Started container in ${pod.name}` });
        }
        break;
      case "Running":
        if (!pod.ready && pod.readyAt !== null && at >= pod.readyAt && node.ready) {
          pod.ready = true;
          events.push({
            at,
            tone: "success",
            message: `${pod.name} passed its readiness probe — added to Service endpoints`,
          });
        }
        if (
          pod.consecutiveCrashes > 0 &&
          pod.runningSince !== null &&
          at - pod.runningSince >= BACKOFF_RESET_TICKS
        ) {
          pod.consecutiveCrashes = 0;
        }
        break;
      case "Error":
      case "CrashLoopBackOff":
        pod.timer -= 1;
        if (pod.timer <= 0) {
          pod.status = "Running";
          pod.restarts += 1;
          pod.runningSince = at;
          pod.readyAt = at + READY_DELAY_TICKS;
          events.push({
            at,
            tone: "info",
            message: `Restarted container in ${pod.name} (restart #${pod.restarts})`,
          });
        }
        break;
      case "Terminating":
        pod.timer -= 1;
        if (pod.timer <= 0) {
          removed.push(pod.name);
          events.push({ at, tone: "info", message: `${pod.name} terminated and was removed` });
        }
        break;
      case "Pending":
        break;
    }
  }
  s.pods = s.pods.filter((p) => !removed.includes(p.name));

  // ReplicaSet controller: converge the number of non-terminating pods on the desired count.
  const active = activePods(s);
  if (active.length < s.desired) {
    for (let i = active.length; i < s.desired; i++) {
      const pod = newPod(rng, at);
      s.pods.push(pod);
      events.push({
        at,
        tone: "info",
        message: `ReplicaSet created ${pod.name} (${i + 1} of ${s.desired} desired)`,
      });
    }
  } else if (active.length > s.desired) {
    const extras = [...active]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, active.length - s.desired);
    for (const pod of extras) {
      startTerminating(pod);
      events.push({
        at,
        tone: "info",
        message: `ReplicaSet scaling down — terminating ${pod.name}`,
      });
    }
  }

  // Scheduler: bind each pending pod to the Ready node running the fewest pods.
  for (const pod of s.pods.filter((p) => p.status === "Pending")) {
    const candidates = s.nodes.filter((n) => n.ready);
    if (candidates.length === 0) {
      events.push({
        at,
        tone: "error",
        message: `0/${s.nodes.length} nodes are available — ${pod.name} stays Pending`,
      });
      continue;
    }
    const load = (n: Node) => activePods(s).filter((p) => p.node === n.name).length;
    const target = [...candidates].sort(
      (a, b) => load(a) - load(b) || a.name.localeCompare(b.name),
    )[0]!;
    pod.node = target.name;
    pod.status = "ContainerCreating";
    pod.timer = CREATE_TICKS;
    events.push({ at, tone: "info", message: `Scheduler assigned ${pod.name} to ${target.name}` });
  }

  return { state: s, events };
}

function apply(state: KubeState, action: KubeAction): StepResult<KubeState> {
  const s = clone(state);
  const events: SimEvent[] = [];
  const at = s.tick + 1;
  switch (action.type) {
    case "crash-container": {
      const pod = s.pods.find((p) => p.name === action.pod);
      const node = pod && nodeOf(s, pod);
      if (!pod || pod.status !== "Running" || !node?.healthy) break;
      pod.consecutiveCrashes += 1;
      pod.ready = false;
      pod.status = pod.consecutiveCrashes >= 2 ? "CrashLoopBackOff" : "Error";
      pod.timer = backoffTicks(pod.consecutiveCrashes);
      pod.runningSince = null;
      events.push({
        at,
        tone: "error",
        message: `Container in ${pod.name} exited — kubelet will restart it in the same pod after a ${realBackoffSeconds(pod.consecutiveCrashes)} s back-off`,
      });
      break;
    }
    case "delete-pod": {
      const pod = s.pods.find((p) => p.name === action.pod);
      if (!pod || pod.status === "Terminating") break;
      startTerminating(pod);
      events.push({
        at,
        tone: "warning",
        message: `${pod.name} deleted — terminating (grace period, default 30 s)`,
      });
      break;
    }
    case "fail-node": {
      const node = s.nodes.find((n) => n.name === action.node);
      if (!node || !node.healthy) break;
      node.healthy = false;
      node.failedAt = at;
      events.push({
        at,
        tone: "error",
        message: `${node.name} lost power — its pods stop, but the control plane doesn't know yet`,
      });
      break;
    }
    case "recover-node": {
      const node = s.nodes.find((n) => n.name === action.node);
      if (!node || node.healthy) break;
      node.healthy = true;
      node.ready = true;
      node.failedAt = null;
      node.notReadySince = null;
      // Pods that were still bound here come back (their containers restart) unless they were evicted.
      for (const pod of s.pods.filter((p) => p.node === node.name && p.status === "Running")) {
        pod.restarts += 1;
        pod.ready = false;
        pod.runningSince = at;
        pod.readyAt = at + READY_DELAY_TICKS;
      }
      events.push({ at, tone: "success", message: `${node.name} is back and Ready` });
      break;
    }
    case "scale": {
      const replicas = Math.max(0, Math.min(MAX_REPLICAS, Math.round(action.replicas)));
      if (replicas === s.desired) break;
      events.push({
        at,
        tone: "info",
        message: `Deployment scaled from ${s.desired} to ${replicas} replicas`,
      });
      s.desired = replicas;
      break;
    }
  }
  return { state: s, events };
}

export const kubernetesModel: SimulationModel<KubeState, KubeParams, KubeAction> = {
  id: "kubernetes-self-healing",
  init(params, rng) {
    const nodes: Node[] = NODE_NAMES.map((name) => ({
      name,
      healthy: true,
      ready: true,
      failedAt: null,
      notReadySince: null,
    }));
    // Start from a steady state: every replica already Running and Ready, spread across nodes.
    const pods: Pod[] = Array.from({ length: params.replicas }, (_, i) => ({
      ...newPod(rng, 0),
      node: NODE_NAMES[i % NODE_NAMES.length]!,
      status: "Running" as const,
      ready: true,
      readyAt: 0,
      runningSince: 0,
    }));
    return { tick: 0, desired: params.replicas, pods, nodes };
  },
  tick,
  apply,
  describe(state) {
    const ready = endpoints(state).length;
    const notReadyNodes = state.nodes.filter((n) => !n.ready).map((n) => n.name);
    return [
      `Step ${state.tick}`,
      `desired ${state.desired} · ready ${ready}`,
      `${ready} endpoint${ready === 1 ? "" : "s"} behind the Service`,
      notReadyNodes.length > 0 ? `${notReadyNodes.join(", ")} NotReady` : "all nodes Ready",
    ].join(" · ");
  },
};
