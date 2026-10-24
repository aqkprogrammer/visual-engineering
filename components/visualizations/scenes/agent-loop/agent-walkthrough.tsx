"use client";

import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import {
  agentFrames,
  agentSteps,
  DEFAULT_AGENT_PARAMS,
  OUTCOME_LABEL,
  STEP_LIMITS,
  type Actor,
  type AgentParams,
  type AgentState,
  type Scenario,
} from "@/lib/simulation/models/agent-loop";
import { cn } from "@/lib/utils/cn";
import { SegmentedControl, Stat, Toggle } from "../../player/controls";
import { SimulationPlayer } from "../../player/simulation-player";
import { usePlayback } from "../../player/use-playback";
import { AgentScene } from "./agent-scene";

export const AGENT_ASSUMPTIONS = [
  "The “model” is a script: its choices are written by hand to show common agent behaviours. In the prompt-injection scenario it follows the instruction hidden in a tool result, which real models sometimes do and sometimes don't. No model is called.",
  "Tools come from an MCP server, discovered with tools/list and called with tools/call. Tool failures return as results with isError set, which the model can react to.",
  "One tool call per model turn. Token counts are illustrative; the billed total adds up the whole conversation re-sent on every model call.",
  "The step limit counts model calls. When it is reached, the app stops the loop and hands the conversation to a person.",
];

const SCENARIOS: { value: Scenario; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "tool-error", label: "Tool times out" },
  { value: "injection", label: "Prompt injection" },
  { value: "polling", label: "Never finishes" },
];

const ACTOR_LABEL: Record<Actor, string> = {
  user: "User",
  app: "App",
  model: "Model",
  server: "MCP server",
  reviewer: "Reviewer",
};

function Transcript({ state }: { state: AgentState }) {
  return (
    <ol className="space-y-1.5" aria-label="Messages so far">
      {state.messages.map((m, i) => {
        const last = i === state.messages.length - 1;
        return (
          <li
            key={i}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm",
              last ? "border-accent" : "border-border",
              m.isError
                ? "bg-fail/10"
                : m.untrusted && state.params.scenario === "injection"
                  ? "bg-warn/10"
                  : "bg-surface",
            )}
          >
            <span className="mr-2 font-mono text-[11px] text-fg-subtle">
              {ACTOR_LABEL[m.from]} → {ACTOR_LABEL[m.to]} · {m.label}
            </span>
            {m.untrusted && (
              <span className="mr-2 font-mono text-[11px] text-fg-muted">untrusted content</span>
            )}
            <span
              className={cn(
                "block break-words",
                m.from === "model" && m.tool ? "font-mono text-xs" : "",
              )}
            >
              {m.text}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function AgentWalkthrough() {
  const [params, setParams] = useState<AgentParams>(DEFAULT_AGENT_PARAMS);
  const frames = useMemo(() => agentFrames(params), [params]);
  const steps = useMemo(() => agentSteps(params), [params]);
  const playback = usePlayback({ frameCount: frames.length, frameMs: 2200 });
  const state = frames[Math.min(playback.frame, frames.length - 1)]!.state;
  const final = steps.at(-1)!.state;
  const update = (patch: Partial<AgentParams>) => {
    setParams((p) => ({ ...p, ...patch }));
    playback.pause();
    playback.seek(0);
  };
  const outcome = final.outcome!;
  const good = outcome === "refunded" || outcome === "refunded-after-block";
  const Icon = good ? CircleCheck : outcome === "wrong-refund" ? TriangleAlert : CircleAlert;

  return (
    <SimulationPlayer
      kind="walkthrough"
      title="Agent loop with tools"
      description="A support assistant handles a refund request in a loop: the model asks for tool calls, the app runs them on an MCP server and returns the results, until the model answers or a limit stops it. The transcript below lists every message."
      frames={frames}
      playback={playback}
      aspectRatio="760 / 300"
      scene={(f) => <AgentScene state={f.state} />}
      positionLabel={(f) => `Step ${f.index + 1} of ${frames.length}`}
      eventTime={(at) => `#${at + 1}`}
      assumptions={AGENT_ASSUMPTIONS}
      stepTitles={steps.map((s) => s.title)}
      stats={(f) => (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
          <Stat label="Model calls" value={`${f.state.modelCalls} of ${params.maxSteps} allowed`} />
          <Stat
            label="Conversation size"
            value={`${f.state.contextTokens.toLocaleString("en-US")} tokens`}
          />
          <Stat
            label="Input tokens billed so far"
            value={f.state.billedTokens.toLocaleString("en-US")}
          />
          <Stat
            label="Refunds issued"
            value={
              f.state.refunds.length === 0
                ? "none"
                : f.state.refunds.map((r) => `$${r}.00`).join(", ")
            }
            tone={
              f.state.refunds.includes(500) ? "fail" : f.state.refunds.length > 0 ? "ok" : undefined
            }
          />
        </dl>
      )}
      controls={
        <div className="space-y-5">
          <div className="flex flex-wrap gap-x-6 gap-y-4">
            <SegmentedControl<Scenario>
              label="Scenario"
              value={params.scenario}
              options={SCENARIOS}
              onChange={(scenario) => update({ scenario })}
            />
            <SegmentedControl
              label="Step limit (model calls)"
              value={String(params.maxSteps)}
              options={STEP_LIMITS.map((n) => ({ value: String(n), label: String(n) }))}
              onChange={(v) => update({ maxSteps: Number(v) })}
            />
            <Toggle
              label="Human approval for refunds"
              description="the app asks a person before issue_refund runs"
              checked={params.approval}
              onChange={(approval) => update({ approval })}
            />
            <Toggle
              label="Server-side validation"
              description="refunds must match the order total"
              checked={params.validation}
              onChange={(validation) => update({ validation })}
            />
          </div>
          <p
            className={cn(
              "inline-flex items-start gap-1.5 text-sm font-medium",
              good ? "text-ok" : outcome === "wrong-refund" ? "text-fail" : "text-warn",
            )}
            aria-live="polite"
          >
            <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
            Where this run ends: {OUTCOME_LABEL[outcome]}.
          </p>
          <section aria-label="Transcript" className="rounded-lg border border-border p-4">
            <h4 className="mb-3 font-mono text-[11px] tracking-wide text-fg-subtle uppercase">
              {steps[playback.frame]?.title}
            </h4>
            <Transcript state={state} />
          </section>
        </div>
      }
    />
  );
}
