/**
 * Teaching model of Docker's layer cache for a small Node.js app.
 *
 * Simplifications (shown to learners):
 * - Durations and sizes are illustrative.
 * - Cache keys chain: each layer's key depends on its parent's key, its instruction text and,
 *   for COPY, the copied files. Once one layer misses, every later layer rebuilds — as Docker
 *   documents. Changing only a file's modification time would not invalidate the cache; here every
 *   "edit" is a real content change.
 * - One builder with a local cache that keeps every previous build; no cache export or remote cache.
 */
import { walkthroughFrames, type WalkthroughStep } from "../run";

export const FILES = ["package.json", "package-lock.json", "src/server.js", "README.md"] as const;
export type FileName = (typeof FILES)[number];
export type FileVersions = Record<FileName, number>;

export type Instruction = {
  id: string;
  text: string;
  /** Files whose content this instruction depends on (COPY/ADD). */
  copies?: FileName[] | "context";
  /** Illustrative build time and resulting layer size when not cached. */
  seconds: number;
  size: string;
  /** Instructions such as CMD only change image metadata and add no filesystem layer. */
  metadataOnly?: boolean;
};

export type Layout = "dependencies-first" | "copy-everything";

export const DOCKERFILES: Record<Layout, Instruction[]> = {
  "dependencies-first": [
    { id: "from", text: "FROM node:24-slim", seconds: 12, size: "base image" },
    { id: "workdir", text: "WORKDIR /app", seconds: 0.1, size: "0 B" },
    {
      id: "manifest",
      text: "COPY package.json package-lock.json ./",
      copies: ["package.json", "package-lock.json"],
      seconds: 0.2,
      size: "180 kB",
    },
    { id: "deps", text: "RUN npm ci --omit=dev", seconds: 45, size: "92 MB" },
    { id: "src", text: "COPY src ./src", copies: ["src/server.js"], seconds: 0.2, size: "40 kB" },
    {
      id: "cmd",
      text: 'CMD ["node", "src/server.js"]',
      seconds: 0,
      size: "metadata",
      metadataOnly: true,
    },
  ],
  "copy-everything": [
    { id: "from", text: "FROM node:24-slim", seconds: 12, size: "base image" },
    { id: "workdir", text: "WORKDIR /app", seconds: 0.1, size: "0 B" },
    { id: "all", text: "COPY . .", copies: "context", seconds: 0.3, size: "260 kB" },
    { id: "deps", text: "RUN npm ci --omit=dev", seconds: 45, size: "92 MB" },
    {
      id: "cmd",
      text: 'CMD ["node", "src/server.js"]',
      seconds: 0,
      size: "metadata",
      metadataOnly: true,
    },
  ],
};

/** Files sent to the builder as the build context. A .dockerignore here excludes README.md. */
export function contextFiles(dockerignore: boolean): FileName[] {
  return FILES.filter((f) => !(dockerignore && f === "README.md"));
}

function fnv(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0").slice(0, 7);
}

export type StepStatus = "pending" | "cached" | "built";
export type BuildStep = Instruction & {
  status: StepStatus;
  key: string;
  layer: string;
  reason?: string;
};

export type BuildInput = {
  layout: Layout;
  dockerignore: boolean;
  files: FileVersions;
  /** Cache keys from every previous build. */
  cache: string[];
  /** Layers the registry already has. */
  registry: string[];
  buildNumber: number;
};

export type DockerState = {
  layout: Layout;
  dockerignore: boolean;
  buildNumber: number;
  steps: BuildStep[];
  current: number | null;
  seconds: number;
  phase: "build" | "push" | "run";
  pushed: { uploaded: string[]; skipped: string[] } | null;
};

/** Computes the result of one build: which steps hit the cache, and why the others missed. */
export function plan(input: BuildInput): BuildStep[] {
  const cache = new Set(input.cache);
  const included = contextFiles(input.dockerignore);
  let parent = "";
  let missed = false;
  return DOCKERFILES[input.layout].map((instruction) => {
    const copied = instruction.copies === "context" ? included : (instruction.copies ?? []);
    const fingerprint = copied.map((f) => `${f}@${input.files[f]}`).join(",");
    const key = fnv(`${parent}|${instruction.text}|${fingerprint}`);
    parent = key;
    const hit = cache.has(key);
    let reason: string | undefined;
    if (!hit) {
      reason = missed
        ? "a previous layer changed, so every later layer must be rebuilt"
        : copied.length > 0 && input.cache.length > 0
          ? "the copied files changed"
          : input.cache.length === 0
            ? "nothing is cached yet"
            : "the instruction changed";
      missed = true;
    }
    return {
      ...instruction,
      status: hit ? "cached" : "built",
      key,
      layer: fnv(`layer:${key}`),
      reason,
    };
  });
}

export function buildSteps(input: BuildInput): {
  steps: WalkthroughStep<DockerState>[];
  cache: string[];
  registry: string[];
} {
  const planned = plan(input);
  const steps: WalkthroughStep<DockerState>[] = [];
  const base = {
    layout: input.layout,
    dockerignore: input.dockerignore,
    buildNumber: input.buildNumber,
  };
  let seconds = 0;
  const withStatus = (upTo: number) =>
    planned.map((s, i) => (i <= upTo ? s : { ...s, status: "pending" as const }));

  steps.push({
    title: `Build #${input.buildNumber}`,
    caption: `The CLI sends the build context (${contextFiles(input.dockerignore).join(", ")}) to the builder, which works through the Dockerfile top to bottom.`,
    state: {
      ...base,
      steps: withStatus(-1),
      current: null,
      seconds: 0,
      phase: "build",
      pushed: null,
    },
  });
  planned.forEach((s, i) => {
    seconds += s.status === "cached" ? 0 : s.seconds;
    steps.push({
      title: `${s.status === "cached" ? "CACHED" : "BUILT"} ${s.text}`,
      caption:
        s.status === "cached"
          ? `Cache hit: the parent layer, the instruction and any copied files are unchanged, so the existing ${s.metadataOnly ? "setting" : "layer"} is reused instantly.`
          : `Cache miss — ${s.reason}. ${s.metadataOnly ? "This only updates image metadata." : `Executing takes about ${s.seconds} s and produces a ${s.size} layer.`}`,
      state: { ...base, steps: withStatus(i), current: i, seconds, phase: "build", pushed: null },
      events: [
        {
          message: `${s.status === "cached" ? "CACHED" : `built (${s.seconds} s)`} — ${s.text}`,
          tone: s.status === "cached" ? "success" : s.seconds >= 10 ? "warning" : "info",
        },
      ],
    });
  });

  const layers = planned.filter((s) => !s.metadataOnly && s.id !== "from").map((s) => s.layer);
  const registry = new Set(input.registry);
  const uploaded = layers.filter((l) => !registry.has(l));
  const skipped = layers.filter((l) => registry.has(l));
  steps.push({
    title: "Push to the registry",
    caption:
      uploaded.length === 0
        ? "Every layer is already in the registry, so the push only updates the image manifest."
        : `${uploaded.length} new layer${uploaded.length === 1 ? "" : "s"} uploaded; ${skipped.length} already in the registry and skipped. Base image layers are referenced, not re-uploaded.`,
    state: {
      ...base,
      steps: planned,
      current: null,
      seconds,
      phase: "push",
      pushed: { uploaded, skipped },
    },
    events: [
      { message: `Pushed: ${uploaded.length} uploaded, ${skipped.length} skipped`, tone: "info" },
    ],
  });
  steps.push({
    title: "Run a container",
    caption:
      "docker run stacks the image's read-only layers and adds a thin writable layer on top. Files the app writes go there and disappear when the container is removed; the image itself never changes.",
    state: {
      ...base,
      steps: planned,
      current: null,
      seconds,
      phase: "run",
      pushed: { uploaded, skipped },
    },
  });

  return {
    steps,
    cache: [...new Set([...input.cache, ...planned.map((s) => s.key)])],
    registry: [...new Set([...input.registry, ...layers])],
  };
}

export const INITIAL_FILES: FileVersions = {
  "package.json": 1,
  "package-lock.json": 1,
  "src/server.js": 1,
  "README.md": 1,
};

export const dockerFrames = (input: BuildInput) => walkthroughFrames(buildSteps(input).steps);
