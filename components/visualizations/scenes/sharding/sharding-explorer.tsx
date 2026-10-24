"use client";

import { Minus, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import {
  activeNodes,
  assign,
  DEFAULT_SHARDING_PARAMS,
  fnv1a,
  HOT_KEY,
  HOT_SHARE,
  idealMovedShare,
  imbalance,
  KEY_COUNT,
  KEYS,
  loads,
  MAX_NODES,
  MIN_NODES,
  movedShare,
  RING_SIZE,
  ringTokens,
  VNODE_OPTIONS,
  type ShardingParams,
  type Strategy,
  type Workload,
} from "@/lib/simulation/models/sharding";
import { cn } from "@/lib/utils/cn";
import { ActionButton, SegmentedControl, Stat } from "../../player/controls";
import { ExplorerFrame } from "../../player/explorer-frame";

export const SHARDING_ASSUMPTIONS = [
  `${KEY_COUNT} keys (user:0001 to user:${String(KEY_COUNT).padStart(4, "0")}), all the same size. Keys and node names are hashed with 32-bit FNV-1a plus a mixing step; real systems use other hash functions, with the same behaviour.`,
  "Hash modulo assigns a key to node number hash(key) mod N. Consistent hashing places nodes on a ring and gives each key to the first node clockwise from the key's hash.",
  `With a hot key, one key (${HOT_KEY}) receives ${Math.round(HOT_SHARE * 100)}% of all requests and the rest share the remainder evenly.`,
  "Moving a key is instantaneous here; real rebalancing copies data while serving traffic, which takes time and capacity.",
];

const NODE_FILL = [
  "fill-accent",
  "fill-data",
  "fill-warn",
  "fill-ok",
  "fill-fail",
  "fill-fg-muted",
];
const NODE_BG = ["bg-accent", "bg-data", "bg-warn", "bg-ok", "bg-fail", "bg-fg-muted"];
const pct = (n: number) => `${(n * 100).toFixed(n < 0.1 ? 1 : 0)}%`;

const SIZE = 260;
const R = 105;
const C = SIZE / 2;
const angle = (position: number) => (position / RING_SIZE) * 2 * Math.PI - Math.PI / 2;
const at = (position: number, radius: number) => ({
  x: C + radius * Math.cos(angle(position)),
  y: C + radius * Math.sin(angle(position)),
});

function Ring({ params }: { params: ShardingParams }) {
  const nodes = activeNodes(params.nodes);
  const owners = assign(params);
  const tokens = params.strategy === "ring" ? ringTokens(nodes, params.vnodes) : [];
  const colour = (node: string) => NODE_FILL[nodes.indexOf(node as (typeof nodes)[number])]!;
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="mx-auto w-full max-w-[18rem]" aria-hidden>
      <circle cx={C} cy={C} r={R} className="fill-none stroke-border-strong" />
      {KEYS.filter((_, i) => i % 3 === 0).map((key) => {
        const p = at(fnv1a(key), R - 12);
        return <circle key={key} cx={p.x} cy={p.y} r={2.2} className={colour(owners.get(key)!)} />;
      })}
      {tokens.map((t, i) => {
        const a = at(t.position, R - 4);
        const b = at(t.position, R + 8);
        return (
          <line
            key={i}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            strokeWidth={params.vnodes > 8 ? 1.25 : 3}
            className={colour(t.node).replace("fill-", "stroke-")}
          />
        );
      })}
      {params.workload === "hot-key" &&
        (() => {
          const p = at(fnv1a(HOT_KEY), R - 26);
          return (
            <text
              x={p.x}
              y={p.y + 4}
              textAnchor="middle"
              className="fill-fail font-mono text-[12px]"
            >
              ★
            </text>
          );
        })()}
      <text x={C} y={C - 4} textAnchor="middle" className="fill-fg font-mono text-[11px]">
        {params.strategy === "modulo" ? "hash mod N" : "hash ring"}
      </text>
      <text x={C} y={C + 12} textAnchor="middle" className="fill-fg-subtle font-mono text-[10px]">
        {params.strategy === "modulo" ? "no ring positions" : `${tokens.length} positions`}
      </text>
    </svg>
  );
}

export function ShardingExplorer() {
  const [params, setParams] = useState<ShardingParams>(DEFAULT_SHARDING_PARAMS);
  const [previous, setPrevious] = useState<number | null>(null);
  const set = (change: Partial<ShardingParams>) => {
    setPrevious(null);
    setParams((p) => ({ ...p, ...change }));
  };
  const resize = (nodes: number) => {
    setPrevious(params.nodes);
    setParams((p) => ({ ...p, nodes }));
  };

  const nodeLoads = useMemo(() => loads(params), [params]);
  const moved = previous === null ? null : movedShare({ ...params, nodes: previous }, params);
  const ideal = previous === null ? null : idealMovedShare(previous, params.nodes);
  const keyImbalance = imbalance(nodeLoads, "keys");
  const requestImbalance = imbalance(nodeLoads, "requests");
  const busiest = Math.max(...nodeLoads.map((n) => n.requestShare));

  return (
    <ExplorerFrame title="Sharding explorer" assumptions={SHARDING_ASSUMPTIONS}>
      <div className="grid gap-6 px-4 py-4 lg:grid-cols-[17rem_1fr]">
        <div className="space-y-4">
          <SegmentedControl<Strategy>
            label="How keys are assigned"
            value={params.strategy}
            options={[
              { value: "modulo", label: "Hash mod N" },
              { value: "ring", label: "Consistent hashing" },
            ]}
            onChange={(strategy) => set({ strategy })}
          />
          {params.strategy === "ring" && (
            <SegmentedControl
              label="Virtual nodes per node"
              value={String(params.vnodes)}
              options={VNODE_OPTIONS.map((n) => ({ value: String(n), label: String(n) }))}
              onChange={(v) => set({ vnodes: Number(v) })}
            />
          )}
          <SegmentedControl<Workload>
            label="Traffic"
            value={params.workload}
            options={[
              { value: "uniform", label: "Even" },
              { value: "hot-key", label: "One hot key" },
            ]}
            onChange={(workload) => set({ workload })}
          />
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-fg-muted">Nodes: {params.nodes}</p>
            <div className="flex flex-wrap gap-2">
              <ActionButton
                tone="positive"
                disabled={params.nodes >= MAX_NODES}
                onClick={() => resize(params.nodes + 1)}
              >
                <Plus aria-hidden className="size-3.5" /> Add a node
              </ActionButton>
              <ActionButton
                tone="danger"
                disabled={params.nodes <= MIN_NODES}
                onClick={() => resize(params.nodes - 1)}
              >
                <Minus aria-hidden className="size-3.5" /> Remove a node
              </ActionButton>
            </div>
          </div>
          <Ring params={params} />
        </div>

        <div className="min-w-0 space-y-4">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
            <Stat
              label="Keys moved by the last change"
              value={moved === null ? "—" : `${pct(moved)} (even split: ${pct(ideal!)})`}
              tone={moved === null ? undefined : moved > ideal! * 1.5 ? "fail" : "ok"}
            />
            <Stat
              label="Busiest node's keys vs an even share"
              value={`${keyImbalance.toFixed(2)}×`}
              tone={keyImbalance > 1.5 ? "warn" : undefined}
            />
            <Stat
              label="Busiest node's requests"
              value={`${pct(busiest)} (${requestImbalance.toFixed(2)}× even)`}
              tone={requestImbalance > 1.5 ? "fail" : undefined}
            />
          </dl>
          <p className="text-sm text-fg-muted" aria-live="polite">
            {moved !== null
              ? `Going from ${previous} to ${params.nodes} nodes moved ${Math.round(moved * KEY_COUNT)} of ${KEY_COUNT} keys. ${params.strategy === "modulo" ? "Changing N changes almost every key's remainder." : "Only keys on the arcs taken by the new node, or freed by the removed one, moved."}`
              : "Add or remove a node to see how many keys have to move."}
          </p>
          <div role="region" aria-label="Keys and requests per node" className="space-y-2">
            {nodeLoads.map((n, i) => (
              <div
                key={n.node}
                className="grid grid-cols-[4.5rem_1fr_7.5rem] items-center gap-3 text-sm"
              >
                <span className="font-mono text-xs">{n.node}</span>
                <span className="relative h-4 rounded-sm bg-surface-2">
                  <span
                    className={cn("absolute inset-y-0 left-0 rounded-sm", NODE_BG[i])}
                    style={{
                      width: `${Math.min(100, (n.requestShare / Math.max(busiest, 0.0001)) * 100)}%`,
                    }}
                  />
                </span>
                <span className="font-mono text-xs text-fg-muted">
                  {n.keys} keys · {pct(n.requestShare)}
                  {n.hasHotKey && <span className="text-fail"> ★ hot</span>}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-fg-subtle">
            Bars show each node&apos;s share of requests. On the ring, dots are a sample of keys
            coloured by owner, and ticks are each node&apos;s positions.
          </p>
        </div>
      </div>
    </ExplorerFrame>
  );
}
