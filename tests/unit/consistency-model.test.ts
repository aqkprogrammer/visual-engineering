import { describe, expect, it } from "vitest";
import {
  consistencyModel,
  countAt,
  lostLikes,
  REPLICAS,
  type ConsistencyAction,
  type Mode,
} from "@/lib/simulation/models/consistency";
import { runSimulation } from "@/lib/simulation/run";
import type { ScheduledAction } from "@/lib/simulation/types";

const PARTITION_AT = 40;
const HEAL_AT = 80;
const split: ScheduledAction<ConsistencyAction>[] = [
  { tick: PARTITION_AT, action: { type: "partition" } },
  { tick: HEAL_AT, action: { type: "heal" } },
];
const run = (mode: Mode, actions = split) =>
  runSimulation(consistencyModel, { params: { mode }, seed: 1, ticks: 120, actions });
const during = (frames: ReturnType<typeof run>) => frames[70]!.state;
const after = (frames: ReturnType<typeof run>) => frames.at(-1)!.state;
const agree = (s: ReturnType<typeof during>) =>
  new Set(REPLICAS.map((id) => countAt(s, id))).size === 1;

describe("consistency model", () => {
  it("without a partition, every mode agrees and loses nothing", () => {
    for (const mode of ["strong", "lww", "merge"] as const) {
      const s = after(run(mode, []));
      expect(agree(s)).toBe(true);
      expect(lostLikes(s)).toBe(0);
      expect(s.acknowledged).toBe(180);
    }
  });

  // The demo's "things to try", in order.
  it("strong: every answer takes 82 ms and every user sees the same count", () => {
    const frames = run("strong", []);
    for (const f of frames.slice(1)) {
      expect(f.state.clients!.us.latencyMs).toBe(82);
      expect(f.state.clients!.eu.latencyMs).toBe(82);
      expect(f.state.clients!.us.seen).toBe(f.state.clients!.eu.seen);
    }
  });

  it("strong, partitioned: Europe is refused, the US carries on at 122 ms, nothing is lost", () => {
    const frames = run("strong");
    const s = during(frames);
    expect(s.clients!.eu.ok).toBe(false);
    expect(s.clients!.us.ok).toBe(true);
    expect(s.clients!.us.latencyMs).toBe(122);
    expect(after(frames).failed).toBe(20);
    expect(lostLikes(after(frames))).toBe(0);
  });

  it("last writer wins: 2 ms answers, the regions disagree, and one side's likes vanish after healing", () => {
    const frames = run("lww");
    expect(during(frames).clients!.eu.latencyMs).toBe(2);
    expect(countAt(during(frames), "us")).not.toBe(countAt(during(frames), "eu"));
    const end = after(frames);
    expect(agree(end)).toBe(true);
    expect(lostLikes(end)).toBe(20); // here Europe's 20 likes: the US wrote last
    expect(end.failed).toBe(0);
  });

  it("merge: the same disagreement while cut off, but every like counted after healing", () => {
    const frames = run("merge");
    expect(countAt(during(frames), "us")).not.toBe(countAt(during(frames), "eu"));
    const end = after(frames);
    expect(agree(end)).toBe(true);
    expect(lostLikes(end)).toBe(0);
    expect(countAt(end, "us")).toBe(end.acknowledged);
  });

  it("last writer wins loses whichever side didn't write last", () => {
    const shifted = run("lww", [
      { tick: PARTITION_AT + 1, action: { type: "partition" } },
      { tick: HEAL_AT + 1, action: { type: "heal" } },
    ]);
    expect(lostLikes(after(shifted))).toBe(40); // the US's 40 likes: Europe wrote last
  });
});
