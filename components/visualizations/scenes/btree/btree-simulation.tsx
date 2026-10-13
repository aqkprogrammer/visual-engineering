"use client";

import { Plus, RotateCcw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import {
  build,
  height,
  INITIAL_KEYS,
  insertSteps,
  scaleEstimate,
  searchSteps,
  type BTree,
  type Heap,
} from "@/lib/simulation/models/btree";
import { walkthroughFrames, type WalkthroughStep } from "@/lib/simulation/run";
import { ActionButton, Stat } from "../../player/controls";
import { SimulationPlayer } from "../../player/simulation-player";
import { usePlayback } from "../../player/use-playback";
import { BTreeScene } from "./btree-scene";
import type { IndexFrameState } from "@/lib/simulation/models/btree";

export const BTREE_ASSUMPTIONS = [
  "Each page holds at most 3 keys so the tree stays small enough to see; real index pages hold hundreds.",
  "Keys are unique integers; leaf entries point to the heap page that holds the row.",
  "Every page visited counts as a read — there is no buffer cache.",
  "No deletion, concurrency control or fill-factor tuning.",
];

const CANDIDATE_INSERTS = [13, 50, 5, 90, 27, 58, 1, 99, 36, 70];

export function BTreeSimulation() {
  const [tree, setTree] = useState<BTree>(() => build(INITIAL_KEYS));
  const [heap, setHeap] = useState<Heap>(INITIAL_KEYS);
  const [steps, setSteps] = useState<WalkthroughStep<IndexFrameState>[]>(() =>
    searchSteps(build(INITIAL_KEYS), INITIAL_KEYS, 55),
  );
  const [searchKey, setSearchKey] = useState(55);
  const frames = useMemo(() => walkthroughFrames(steps), [steps]);
  const playback = usePlayback({ frameCount: frames.length, frameMs: 1600 });
  const remaining = CANDIDATE_INSERTS.filter((k) => !heap.includes(k));
  const [insertKey, setInsertKey] = useState(remaining[0] ?? 0);
  const scale = scaleEstimate(10_000_000);

  const start = (next: WalkthroughStep<IndexFrameState>[]) => {
    setSteps(next);
    playback.pause();
    playback.seek(0);
  };

  return (
    <SimulationPlayer
      kind="walkthrough"
      title="B+ tree index"
      description="A B+ tree index over a small table. Search for a key to watch the lookup descend from the root to a leaf and fetch the row, compared with a full table scan; insert a key to watch pages split."
      frames={frames}
      playback={playback}
      aspectRatio="760 / 400"
      scene={(f) => <BTreeScene state={f.state} />}
      positionLabel={(f) => `Step ${f.index + 1} of ${frames.length}`}
      eventTime={(at) => `#${at + 1}`}
      assumptions={BTREE_ASSUMPTIONS}
      stepTitles={steps.map((s) => s.title)}
      stats={(f) => (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
          <Stat label="Index pages read" value={f.state.indexPagesRead} />
          <Stat label="Heap pages read" value={f.state.heapPage ? 1 : 0} />
          <Stat label="Full table scan reads" value={`${f.state.scanPages} pages`} tone="warn" />
          <Stat label="Tree height" value={height(f.state.tree)} />
        </dl>
      )}
      controls={
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
            <label className="flex flex-col gap-1.5 text-xs font-medium text-fg-muted">
              Look up id
              <select
                value={searchKey}
                onChange={(e) => setSearchKey(Number(e.target.value))}
                className="rounded-md border border-border bg-bg px-2 py-1.5 font-mono text-sm text-fg"
              >
                {[...heap, 50]
                  .sort((a, b) => a - b)
                  .filter((k, i, all) => all.indexOf(k) === i)
                  .map((k) => (
                    <option key={k} value={k}>
                      {k}
                      {heap.includes(k) ? "" : " (not in table)"}
                    </option>
                  ))}
              </select>
            </label>
            <ActionButton onClick={() => start(searchSteps(tree, heap, searchKey))}>
              <Search aria-hidden className="size-3.5" /> Search
            </ActionButton>

            <label className="flex flex-col gap-1.5 text-xs font-medium text-fg-muted">
              Insert id
              <select
                value={insertKey}
                onChange={(e) => setInsertKey(Number(e.target.value))}
                disabled={remaining.length === 0}
                className="rounded-md border border-border bg-bg px-2 py-1.5 font-mono text-sm text-fg"
              >
                {remaining.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
            <ActionButton
              disabled={remaining.length === 0 || !remaining.includes(insertKey)}
              onClick={() => {
                const result = insertSteps(tree, heap, insertKey);
                setTree(result.tree);
                setHeap(result.heap);
                setInsertKey(CANDIDATE_INSERTS.find((k) => !result.heap.includes(k)) ?? 0);
                start(result.steps);
              }}
            >
              <Plus aria-hidden className="size-3.5" /> Insert
            </ActionButton>

            <div className="ml-auto">
              <ActionButton
                onClick={() => {
                  const fresh = build(INITIAL_KEYS);
                  setTree(fresh);
                  setHeap(INITIAL_KEYS);
                  setInsertKey(CANDIDATE_INSERTS[0]!);
                  start(searchSteps(fresh, INITIAL_KEYS, searchKey));
                }}
              >
                <RotateCcw aria-hidden className="size-3.5" /> Reset table
              </ActionButton>
            </div>
          </div>
          <p className="text-sm text-fg-muted">
            At production scale (illustrative: 10 million rows, ~100 rows per 8 KB page, ~300 keys
            per index page) a full scan reads about {scale.heapPages.toLocaleString("en")} pages; an
            index lookup reads about {scale.indexReads}.
          </p>
        </div>
      }
    />
  );
}
