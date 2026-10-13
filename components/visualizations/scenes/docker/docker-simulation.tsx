"use client";

import { Hammer, PencilLine, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import {
  buildSteps,
  FILES,
  INITIAL_FILES,
  type BuildInput,
  type DockerState,
  type FileName,
  type FileVersions,
  type Layout,
} from "@/lib/simulation/models/docker";
import { walkthroughFrames, type WalkthroughStep } from "@/lib/simulation/run";
import { ActionButton, SegmentedControl, Stat, Toggle } from "../../player/controls";
import { SimulationPlayer } from "../../player/simulation-player";
import { usePlayback } from "../../player/use-playback";
import { DockerScene } from "./docker-scene";

export const DOCKER_ASSUMPTIONS = [
  "Build times and layer sizes are illustrative, not measurements.",
  "Each layer's cache key depends on its parent layer, its instruction text and (for COPY) the copied files; a miss forces every later layer to rebuild, as Docker documents.",
  "Every edit here is a real content change. Docker ignores changes to only a file's modification time.",
  "One builder with a local cache that keeps every earlier build; no remote cache or cache export.",
];

type History = { cache: string[]; registry: string[]; buildNumber: number };

export function DockerSimulation() {
  const [layout, setLayout] = useState<Layout>("copy-everything");
  const [dockerignore, setDockerignore] = useState(false);
  const [files, setFiles] = useState<FileVersions>(INITIAL_FILES);
  const [edited, setEdited] = useState<FileName[]>([]);
  // Build #1 is shown on load, so history starts from its result.
  const [initial] = useState(() =>
    buildSteps({
      layout: "copy-everything",
      dockerignore: false,
      files: INITIAL_FILES,
      cache: [],
      registry: [],
      buildNumber: 1,
    }),
  );
  const [history, setHistory] = useState<History>({
    cache: initial.cache,
    registry: initial.registry,
    buildNumber: 1,
  });
  const [steps, setSteps] = useState<WalkthroughStep<DockerState>[]>(initial.steps);
  const frames = useMemo(() => walkthroughFrames(steps), [steps]);
  const playback = usePlayback({ frameCount: frames.length, frameMs: 1300 });

  const runBuild = (next: Partial<{ layout: Layout; dockerignore: boolean }> = {}) => {
    const input: BuildInput = {
      layout: next.layout ?? layout,
      dockerignore: next.dockerignore ?? dockerignore,
      files,
      cache: history.cache,
      registry: history.registry,
      buildNumber: history.buildNumber + 1,
    };
    const result = buildSteps(input);
    setHistory({ cache: result.cache, registry: result.registry, buildNumber: input.buildNumber });
    setSteps(result.steps);
    setEdited([]);
    playback.pause();
    playback.seek(0);
  };

  return (
    <SimulationPlayer
      kind="walkthrough"
      title="Docker build cache"
      description="A Dockerfile being built step by step into image layers, showing which steps hit the build cache and which rebuild after you edit files, then pushing layers to a registry and running a container."
      frames={frames}
      playback={playback}
      aspectRatio="760 / 400"
      scene={(f) => <DockerScene state={f.state} />}
      positionLabel={(f) => `Step ${f.index + 1} of ${frames.length}`}
      eventTime={(at) => `#${at + 1}`}
      assumptions={DOCKER_ASSUMPTIONS}
      stepTitles={steps.map((s) => s.title)}
      stats={(f) => {
        const done = f.state.steps.filter((s) => s.status !== "pending");
        return (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
            <Stat label="Build" value={`#${f.state.buildNumber}`} />
            <Stat
              label="Cached steps"
              value={done.filter((s) => s.status === "cached").length}
              tone="ok"
            />
            <Stat
              label="Rebuilt steps"
              value={done.filter((s) => s.status === "built").length}
              tone="warn"
            />
            <Stat label="Build time (illustrative)" value={`${f.state.seconds.toFixed(1)} s`} />
          </dl>
        );
      }}
      controls={
        <div className="space-y-5">
          <div className="flex flex-wrap gap-x-6 gap-y-4">
            <SegmentedControl<Layout>
              label="Dockerfile"
              value={layout}
              options={[
                { value: "copy-everything", label: "COPY . . then npm ci" },
                { value: "dependencies-first", label: "Dependencies first" },
              ]}
              onChange={(next) => {
                setLayout(next);
                runBuild({ layout: next });
              }}
            />
            <Toggle
              label=".dockerignore excludes README.md"
              checked={dockerignore}
              onChange={(next) => {
                setDockerignore(next);
                runBuild({ dockerignore: next });
              }}
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-fg-muted">Edit a file, then rebuild</p>
            <ul className="flex flex-wrap gap-2">
              {FILES.map((file) => (
                <li key={file}>
                  <ActionButton
                    label={`Edit ${file}`}
                    onClick={() => {
                      setFiles((f) => ({ ...f, [file]: f[file] + 1 }));
                      setEdited((e) => (e.includes(file) ? e : [...e, file]));
                    }}
                  >
                    <PencilLine aria-hidden className="size-3.5" /> {file}
                    {edited.includes(file) ? " (edited)" : ""}
                  </ActionButton>
                </li>
              ))}
              <li>
                <ActionButton tone="positive" onClick={() => runBuild()}>
                  <Hammer aria-hidden className="size-3.5" /> docker build
                </ActionButton>
              </li>
              <li className="ml-auto">
                <ActionButton
                  onClick={() => {
                    setFiles(INITIAL_FILES);
                    setEdited([]);
                    const input: BuildInput = {
                      layout,
                      dockerignore,
                      files: INITIAL_FILES,
                      cache: [],
                      registry: [],
                      buildNumber: 1,
                    };
                    const result = buildSteps(input);
                    setHistory({ cache: result.cache, registry: result.registry, buildNumber: 1 });
                    setSteps(result.steps);
                    playback.pause();
                    playback.seek(0);
                  }}
                >
                  <RotateCcw aria-hidden className="size-3.5" /> Clear cache
                </ActionButton>
              </li>
            </ul>
          </div>
        </div>
      }
    />
  );
}
