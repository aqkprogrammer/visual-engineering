import { describe, expect, it } from "vitest";
import {
  activePods,
  DEFAULT_KUBE_PARAMS,
  endpoints,
  EVICT_AFTER_TICKS,
  kubernetesModel,
  NOT_READY_AFTER_TICKS,
  realBackoffSeconds,
  type KubeAction,
  type KubeState,
} from "@/lib/simulation/models/kubernetes";
import { runSimulation } from "@/lib/simulation/run";
import type { ScheduledAction } from "@/lib/simulation/types";

const SEED = 11;
const run = (actions: ScheduledAction<KubeAction>[] = [], ticks = 80) =>
  runSimulation(kubernetesModel, { params: DEFAULT_KUBE_PARAMS, seed: SEED, ticks, actions });
const initial = run([], 0)[0]!.state;
const podAt = (state: KubeState, name: string) => state.pods.find((p) => p.name === name);
const firstPod = initial.pods[0]!.name;
const messages = (frames: { events: { message: string }[] }[]) =>
  frames.flatMap((f) => f.events.map((e) => e.message));

describe("kubernetes self-healing model", () => {
  it("starts in a steady state: 3 Ready pods spread across 3 nodes, names like real ReplicaSet pods", () => {
    expect(endpoints(initial)).toHaveLength(3);
    expect(new Set(initial.pods.map((p) => p.node)).size).toBe(3);
    for (const pod of initial.pods)
      expect(pod.name).toMatch(/^web-6d4cf56db6-[bcdfghjklmnpqrstvwxz2456789]{5}$/);
  });

  it("is deterministic", () => {
    expect(run([{ tick: 5, action: { type: "delete-pod", pod: firstPod } }])).toEqual(
      run([{ tick: 5, action: { type: "delete-pod", pod: firstPod } }]),
    );
  });

  it("replaces a deleted pod with a new one and converges back to 3 Ready", () => {
    const frames = run([{ tick: 5, action: { type: "delete-pod", pod: firstPod } }]);
    const end = frames.at(-1)!.state;
    expect(podAt(end, firstPod)).toBeUndefined();
    expect(endpoints(end)).toHaveLength(3);
    expect(end.pods.filter((p) => p.name !== firstPod)).toHaveLength(3);
    expect(messages(frames).some((m) => m.startsWith("ReplicaSet created"))).toBe(true);
    // The replacement is created while the old pod is still terminating.
    const replacementTick = frames.findIndex((f) =>
      f.events.some((e) => e.message.startsWith("ReplicaSet created")),
    );
    expect(podAt(frames[replacementTick]!.state, firstPod)?.status).toBe("Terminating");
  });

  it("restarts a crashed container inside the same pod with growing back-off", () => {
    const frames = run([
      { tick: 5, action: { type: "crash-container", pod: firstPod } },
      { tick: 15, action: { type: "crash-container", pod: firstPod } },
    ]);
    expect(podAt(frames[5]!.state, firstPod)).toMatchObject({ status: "Error", ready: false });
    expect(podAt(frames[15]!.state, firstPod)).toMatchObject({ status: "CrashLoopBackOff" });
    const end = podAt(frames.at(-1)!.state, firstPod)!;
    expect(end).toMatchObject({ status: "Running", ready: true, restarts: 2 });
    expect(messages(frames).join("\n")).toMatch(/10 s back-off[\s\S]*20 s back-off/);
    // No replacement pod: the ReplicaSet never saw fewer than 3 pods.
    expect(messages(frames).some((m) => m.startsWith("ReplicaSet created"))).toBe(false);
  });

  it("caps the real back-off at five minutes", () => {
    expect([1, 2, 3, 4, 5, 6, 7].map(realBackoffSeconds)).toEqual([10, 20, 40, 80, 160, 300, 300]);
  });

  it("keeps routing to pods on a failed node until it is marked NotReady, then evicts after the toleration", () => {
    const node = initial.pods[0]!.node!;
    const failTick = 5;
    const frames = run([{ tick: failTick, action: { type: "fail-node", node } }], 60);
    const notReadyTick = failTick + NOT_READY_AFTER_TICKS;
    // Before detection, the dead pod is still an endpoint.
    expect(endpoints(frames[notReadyTick - 1]!.state).map((p) => p.name)).toContain(firstPod);
    expect(endpoints(frames[notReadyTick]!.state).map((p) => p.name)).not.toContain(firstPod);
    // Eviction, then a replacement on a healthy node.
    expect(podAt(frames[notReadyTick + EVICT_AFTER_TICKS]!.state, firstPod)?.status).toBe(
      "Terminating",
    );
    const end = frames.at(-1)!.state;
    expect(endpoints(end)).toHaveLength(3);
    expect(endpoints(end).every((p) => p.node !== node)).toBe(true);
    // The evicted pod stays stuck Terminating while its node is unreachable.
    expect(podAt(end, firstPod)?.status).toBe("Terminating");
  });

  it("cleans up stuck pods when the node comes back", () => {
    const node = initial.pods[0]!.node!;
    const frames = run([
      { tick: 5, action: { type: "fail-node", node } },
      { tick: 40, action: { type: "recover-node", node } },
    ]);
    const end = frames.at(-1)!.state;
    expect(podAt(end, firstPod)).toBeUndefined();
    expect(activePods(end)).toHaveLength(3);
  });

  it("scales up and down", () => {
    const frames = run([
      { tick: 5, action: { type: "scale", replicas: 5 } },
      { tick: 30, action: { type: "scale", replicas: 2 } },
    ]);
    expect(endpoints(frames[29]!.state)).toHaveLength(5);
    expect(activePods(frames.at(-1)!.state)).toHaveLength(2);
    expect(endpoints(frames.at(-1)!.state)).toHaveLength(2);
  });

  it("leaves pods Pending when no node is Ready", () => {
    const frames = run(
      [
        ...initial.nodes.map((n) => ({
          tick: 3,
          action: { type: "fail-node", node: n.name } as const,
        })),
      ],
      40,
    );
    expect(messages(frames).some((m) => m.startsWith("0/3 nodes are available"))).toBe(true);
    expect(frames.at(-1)!.state.pods.some((p) => p.status === "Pending")).toBe(true);
  });
});
