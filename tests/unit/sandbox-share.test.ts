import { describe, expect, it } from "vitest";
import { CHALLENGES, FREE_PLAY_ID, getChallenge } from "@/lib/sandbox/challenges";
import {
  decodeDesign,
  encodeDesign,
  MAX_SHARED_FAILURES,
  type SharedDesign,
} from "@/lib/sandbox/share";
import { DEFAULT_ARCHITECTURE } from "@/lib/simulation/models/sandbox";

const design: SharedDesign = {
  challengeId: "launch-day",
  architecture: {
    appServers: 6,
    cache: true,
    cacheHitRatio: 0.95,
    readReplicas: 1,
    asyncWrites: true,
    workers: 3,
  },
  failures: [
    { tick: 12, action: { type: "fail-server" } },
    { tick: 20, action: { type: "flush-cache" } },
    { tick: 31, action: { type: "restore-servers" } },
  ],
};

describe("shareable sandbox links", () => {
  it("produce short, readable query strings", () => {
    expect(encodeDesign(design)).toBe(
      "scenario=launch-day&app=6&replicas=1&cache=95&queue=3&failures=12f.20c.31r",
    );
  });

  it("round-trip every challenge's starting design", () => {
    for (const challenge of CHALLENGES) {
      const shared: SharedDesign = {
        challengeId: challenge.id,
        architecture: challenge.start,
        ...(challenge.id === FREE_PLAY_ID && {
          traffic: { base: challenge.traffic.base, readShare: challenge.traffic.readShare },
        }),
        failures: [],
      };
      expect(decodeDesign(`?${encodeDesign(shared)}`)).toEqual(shared);
    }
  });

  it("round-trip a design with failures", () => {
    expect(decodeDesign(encodeDesign(design))).toEqual(design);
  });

  it("round-trip free-play traffic", () => {
    const free: SharedDesign = {
      challengeId: FREE_PLAY_ID,
      architecture: { ...DEFAULT_ARCHITECTURE, cache: false, asyncWrites: false },
      traffic: { base: 4000, readShare: 0.5 },
      failures: [{ tick: 5, action: { type: "degrade-database" } }],
    };
    expect(decodeDesign(encodeDesign(free))).toEqual(free);
  });

  it("ignore a page without a scenario", () => {
    expect(decodeDesign("")).toBeNull();
    expect(decodeDesign("?utm_source=x")).toBeNull();
  });

  it("fall back to the scenario's starting design for invalid values", () => {
    const start = getChallenge("read-heavy-catalogue").start;
    expect(
      decodeDesign(
        "?scenario=read-heavy-catalogue&app=99&replicas=-1&cache=42&queue=lots&traffic=4000",
      ),
    ).toEqual({ challengeId: "read-heavy-catalogue", architecture: start, failures: [] });
  });

  it("treat an unknown scenario as free play", () => {
    expect(decodeDesign("?scenario=<script>")?.challengeId).toBe(FREE_PLAY_ID);
  });

  it("ignore challenges' traffic in links: challenges fix their own", () => {
    expect(decodeDesign("?scenario=launch-day&traffic=500&reads=50")?.traffic).toBeUndefined();
  });

  it("drop malformed or out-of-range failures and sort the rest", () => {
    const failures = decodeDesign(
      "?scenario=free-play&failures=30c.0f.12x.abc.601f.5d.9999999u",
    )?.failures;
    expect(failures).toEqual([
      { tick: 5, action: { type: "degrade-database" } },
      { tick: 30, action: { type: "flush-cache" } },
    ]);
  });

  it(`keep at most ${MAX_SHARED_FAILURES} failures`, () => {
    const many = Array.from({ length: 80 }, (_, i) => `${i + 1}f`).join(".");
    expect(decodeDesign(`?scenario=free-play&failures=${many}`)?.failures).toHaveLength(
      MAX_SHARED_FAILURES,
    );
  });
});
