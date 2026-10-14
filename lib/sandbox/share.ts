/**
 * Shareable sandbox links: a scenario, a design and any injected failures, encoded in a short,
 * readable query string such as `?scenario=launch-day&app=6&cache=95&failures=12f.20c`.
 *
 * Links come from anywhere, so decoding accepts only values the sandbox's own controls can
 * produce and ignores everything else.
 */
import {
  HIT_RATIOS,
  LIMITS,
  type Architecture,
  type SandboxAction,
} from "@/lib/simulation/models/sandbox";
import type { ScheduledAction } from "@/lib/simulation/types";
import { FREE_PLAY_ID, getChallenge } from "./challenges";

/** Free-play traffic choices, shared with the sandbox controls. */
export const TRAFFIC_BASES = [500, 1000, 2000, 4000] as const;
export const READ_SHARES = [0.5, 0.9, 0.98] as const;

export const MAX_SHARED_FAILURES = 50;
export const MAX_FAILURE_TICK = 600;

export type SharedDesign = {
  challengeId: string;
  architecture: Architecture;
  /** Free play only; challenges fix their own traffic. */
  traffic?: { base: number; readShare: number };
  failures: ScheduledAction<SandboxAction>[];
};

const ACTION_CODES = {
  "fail-server": "f",
  "restore-servers": "r",
  "flush-cache": "c",
  "degrade-database": "d",
  "restore-database": "u",
} as const satisfies Record<SandboxAction["type"], string>;
const ACTIONS_BY_CODE = new Map<string, SandboxAction["type"]>(
  Object.entries(ACTION_CODES).map(([type, code]) => [code, type as SandboxAction["type"]]),
);

const percent = (share: number) => String(Math.round(share * 100));

export function encodeDesign(design: SharedDesign): string {
  const { architecture: a } = design;
  const params = new URLSearchParams({ scenario: design.challengeId });
  params.set("app", String(a.appServers));
  params.set("replicas", String(a.readReplicas));
  params.set("cache", a.cache ? percent(a.cacheHitRatio) : "off");
  params.set("queue", a.asyncWrites ? String(a.workers) : "off");
  if (design.traffic) {
    params.set("traffic", String(design.traffic.base));
    params.set("reads", percent(design.traffic.readShare));
  }
  if (design.failures.length > 0) {
    params.set(
      "failures",
      design.failures.map((f) => `${f.tick}${ACTION_CODES[f.action.type]}`).join("."),
    );
  }
  return params.toString();
}

function integerIn(value: string | null, [min, max]: readonly [number, number]) {
  if (value === null || !/^\d{1,4}$/.test(value)) return undefined;
  const n = Number(value);
  return n >= min && n <= max ? n : undefined;
}

function shareFrom(value: string | null, options: readonly number[]) {
  return options.find((share) => value === percent(share));
}

function decodeFailures(value: string | null): ScheduledAction<SandboxAction>[] {
  if (!value) return [];
  const failures: ScheduledAction<SandboxAction>[] = [];
  for (const part of value.split(".").slice(0, MAX_SHARED_FAILURES)) {
    const match = /^(\d{1,4})([a-z])$/.exec(part);
    const type = match && ACTIONS_BY_CODE.get(match[2]!);
    const tick = match ? Number(match[1]) : 0;
    if (type && tick >= 1 && tick <= MAX_FAILURE_TICK) failures.push({ tick, action: { type } });
  }
  return failures.sort((x, y) => x.tick - y.tick);
}

/**
 * Reads a design from a query string, starting from the scenario's own starting design and
 * overriding only the values that are valid. Returns null when the link names no scenario.
 */
export function decodeDesign(search: string): SharedDesign | null {
  const params = new URLSearchParams(search);
  const scenario = params.get("scenario");
  if (scenario === null) return null;
  const challenge = getChallenge(scenario);
  const architecture: Architecture = { ...challenge.start };

  const app = integerIn(params.get("app"), LIMITS.appServers);
  if (app !== undefined) architecture.appServers = app;
  const replicas = integerIn(params.get("replicas"), LIMITS.readReplicas);
  if (replicas !== undefined) architecture.readReplicas = replicas;

  const cache = params.get("cache");
  const hitRatio = shareFrom(cache, HIT_RATIOS);
  if (cache === "off") architecture.cache = false;
  else if (hitRatio !== undefined)
    Object.assign(architecture, { cache: true, cacheHitRatio: hitRatio });

  const queue = params.get("queue");
  const workers = integerIn(queue, LIMITS.workers);
  if (queue === "off") architecture.asyncWrites = false;
  else if (workers !== undefined) Object.assign(architecture, { asyncWrites: true, workers });

  let traffic: SharedDesign["traffic"];
  if (challenge.id === FREE_PLAY_ID) {
    const base = TRAFFIC_BASES.find((n) => params.get("traffic") === String(n));
    const readShare = shareFrom(params.get("reads"), READ_SHARES);
    traffic = {
      base: base ?? challenge.traffic.base,
      readShare: readShare ?? challenge.traffic.readShare,
    };
  }

  return {
    challengeId: challenge.id,
    architecture,
    ...(traffic && { traffic }),
    failures: decodeFailures(params.get("failures")),
  };
}
