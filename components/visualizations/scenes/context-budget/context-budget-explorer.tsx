"use client";

import { CircleCheck, CircleX } from "lucide-react";
import { useId, useMemo, useState } from "react";
import {
  CACHED_PRICE_FACTOR,
  conversationCost,
  DEFAULT_BUDGET_PARAMS,
  DOC_COUNTS,
  KEEP_RECENT_TURNS,
  planRequest,
  PRICE_TIERS,
  RESERVES,
  SIZES,
  TOOL_COUNTS,
  TURN_COUNTS,
  verdict,
  WINDOWS,
  type BudgetParams,
  type BudgetVerdict,
  type PartKind,
  type PriceTier,
  type Strategy,
} from "@/lib/simulation/models/context-budget";
import { cn } from "@/lib/utils/cn";
import { SegmentedControl, Stat, Toggle } from "../../player/controls";
import { ExplorerFrame } from "../../player/explorer-frame";

export const CONTEXT_BUDGET_ASSUMPTIONS = [
  `Token counts are fixed, illustrative numbers: a ${SIZES.system}-token system prompt, ${SIZES.perTool} tokens per tool definition, ${SIZES.perDoc} per retrieved document, 180–520 per earlier turn and a ${SIZES.answer}-token answer. Real counts come from the provider's tokenizer.`,
  "The reserved answer space is treated as a hard limit. Depending on the API and model, a request whose input plus maximum output exceeds the window is either rejected or accepted and cut short when the window fills.",
  `Summarising replaces all but the last ${KEEP_RECENT_TURNS} turns with a ${SIZES.summary}-token summary that keeps the order number but not exact wording. Producing the summary costs a model call, which isn't counted here.`,
  `Prices are illustrative, not any provider's. Cached input is billed at ${CACHED_PRICE_FACTOR}× the normal input price, as some providers charge for most of their models; cached tokens still take up the window.`,
];

const k = (n: number) => (n >= 1000 ? `${n / 1000}K` : String(n));
const tokens = (n: number) => `${n.toLocaleString("en-US")} tokens`;
const money = (n: number) => (n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`);

const PART_STYLE: Record<PartKind, string> = {
  system: "bg-fg-subtle/60",
  tools: "bg-data/70",
  summary: "bg-accent/35",
  history: "bg-accent/70",
  docs: "bg-warn/70",
  question: "bg-fg/80",
};

const STRATEGIES: { value: Strategy; label: string; hint: string }[] = [
  { value: "reject", label: "Send it anyway", hint: "the request is rejected" },
  { value: "drop-oldest", label: "Drop the oldest turns", hint: "until it fits" },
  {
    value: "summarise",
    label: "Summarise older turns",
    hint: `keep the last ${KEEP_RECENT_TURNS} verbatim`,
  },
  { value: "fewer-docs", label: "Retrieve fewer documents", hint: "lowest-ranked first" },
];

const VERDICT_TEXT: Record<BudgetVerdict, string> = {
  correct: "The assistant can answer: it has the order number and the refund policy.",
  "wrong-order": "The assistant has lost the order number, so it has to ask again — or guess.",
  "no-policy": "The assistant knows the order but not the refund policy, so it can't say when.",
  rejected: "The request is too long for the window: nothing is answered.",
};

function Check({ ok, children }: { ok: boolean; children: string }) {
  return (
    <li className="flex gap-2 text-sm">
      {ok ? (
        <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-ok" />
      ) : (
        <CircleX aria-hidden className="mt-0.5 size-4 shrink-0 text-fail" />
      )}
      <span>
        <span className="sr-only">{ok ? "Yes: " : "No: "}</span>
        {children}
      </span>
    </li>
  );
}

export function ContextBudgetExplorer() {
  const [params, setParams] = useState<BudgetParams>(DEFAULT_BUDGET_PARAMS);
  const strategyName = useId();
  const set = (change: Partial<BudgetParams>) => setParams((p) => ({ ...p, ...change }));
  const plan = useMemo(() => planRequest(params), [params]);
  const whole = useMemo(() => conversationCost(params), [params]);
  const outcome = verdict(plan);
  const used = plan.input + params.reserve;
  const scale = Math.max(params.window, used);
  const width = (n: number) => `${(n / scale) * 100}%`;
  const numberOptions = (values: readonly number[], format = k) =>
    values.map((n) => ({ value: String(n), label: format(n) }));

  return (
    <ExplorerFrame title="Context window budget" assumptions={CONTEXT_BUDGET_ASSUMPTIONS}>
      <div className="grid gap-6 px-4 py-4 lg:grid-cols-[18rem_1fr]">
        <div className="space-y-4">
          <SegmentedControl
            label="Context window"
            value={String(params.window)}
            options={numberOptions(WINDOWS)}
            onChange={(v) => set({ window: Number(v) })}
          />
          <SegmentedControl
            label="Earlier turns in the conversation"
            value={String(params.turns)}
            options={numberOptions(TURN_COUNTS, String)}
            onChange={(v) => set({ turns: Number(v) })}
          />
          <SegmentedControl
            label="Retrieved documents"
            value={String(params.docs)}
            options={numberOptions(DOC_COUNTS, String)}
            onChange={(v) => set({ docs: Number(v) })}
          />
          <SegmentedControl
            label="Tool definitions"
            value={String(params.tools)}
            options={numberOptions(TOOL_COUNTS, String)}
            onChange={(v) => set({ tools: Number(v) })}
          />
          <SegmentedControl
            label="Space reserved for the answer"
            value={String(params.reserve)}
            options={numberOptions(RESERVES)}
            onChange={(v) => set({ reserve: Number(v) })}
          />
          <fieldset className="space-y-1">
            <legend className="mb-1.5 text-xs font-medium text-fg-muted">
              When it doesn&apos;t fit
            </legend>
            {STRATEGIES.map((s) => (
              <label
                key={s.value}
                className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1 text-sm hover:bg-surface has-[:checked]:bg-accent-soft"
              >
                <input
                  type="radio"
                  name={strategyName}
                  value={s.value}
                  checked={params.strategy === s.value}
                  onChange={() => set({ strategy: s.value })}
                  className="mt-1 accent-[var(--accent)]"
                />
                <span>
                  {s.label}
                  <span className="block text-xs text-fg-subtle">{s.hint}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <SegmentedControl<PriceTier>
            label="Prices (illustrative)"
            value={params.tier}
            options={(Object.keys(PRICE_TIERS) as PriceTier[]).map((t) => ({
              value: t,
              label: PRICE_TIERS[t].label.replace(" model", ""),
            }))}
            onChange={(tier) => set({ tier })}
          />
          <Toggle
            label="Cache the system prompt and tools"
            description="repeated prefix billed at a discount"
            checked={params.cachePrefix}
            onChange={(cachePrefix) => set({ cachePrefix })}
          />
        </div>

        <div className="min-w-0 space-y-4">
          <div>
            <p className="mb-1.5 text-xs font-medium text-fg-muted">
              This request: {tokens(plan.input)} of input + {tokens(params.reserve)} reserved, in a{" "}
              {k(params.window)} window
            </p>
            <div
              aria-hidden
              className="relative flex h-8 w-full overflow-hidden rounded-md border border-border bg-surface"
            >
              {plan.parts.map((part) => (
                <div
                  key={part.kind}
                  className={cn("h-full border-r border-bg", PART_STYLE[part.kind])}
                  style={{ width: width(part.tokens) }}
                />
              ))}
              <div
                className="h-full border-r border-bg bg-[repeating-linear-gradient(135deg,var(--border-strong)_0_4px,transparent_4px_8px)]"
                style={{ width: width(params.reserve) }}
              />
              {used > params.window && (
                <div
                  className="absolute inset-y-0 border-l-2 border-fail"
                  style={{ left: width(params.window) }}
                />
              )}
            </div>
            <ul
              className="mt-2 grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2"
              aria-label="Parts of the request"
            >
              {plan.parts.map((part) => (
                <li key={part.kind} className="flex items-center gap-2">
                  <span aria-hidden className={cn("size-2.5 rounded-sm", PART_STYLE[part.kind])} />
                  <span className="flex-1">{part.label}</span>
                  <span className="font-mono text-fg-muted">
                    {part.tokens.toLocaleString("en-US")}
                  </span>
                </li>
              ))}
              <li className="flex items-center gap-2">
                <span aria-hidden className="size-2.5 rounded-sm border border-border-strong" />
                <span className="flex-1">Reserved for the answer</span>
                <span className="font-mono text-fg-muted">
                  {params.reserve.toLocaleString("en-US")}
                </span>
              </li>
            </ul>
          </div>

          <div className="space-y-2 rounded-lg border border-border px-3 py-2.5" aria-live="polite">
            <p
              className={cn(
                "text-sm font-medium",
                outcome === "correct"
                  ? "text-ok"
                  : outcome === "rejected"
                    ? "text-fail"
                    : "text-warn",
              )}
            >
              {plan.status === "rejected"
                ? `Rejected: ${tokens(plan.input)} of input won't fit in the ${tokens(plan.budget)} left after reserving the answer.`
                : plan.status === "trimmed"
                  ? `Trimmed to fit: ${[
                      plan.droppedTurns > 0 &&
                        `${plan.droppedTurns} earlier turn${plan.droppedTurns === 1 ? "" : "s"} ${plan.summarised ? "summarised" : "dropped"}`,
                      plan.keptDocs < params.docs &&
                        `${params.docs - plan.keptDocs} documents dropped`,
                    ]
                      .filter(Boolean)
                      .join(", ")}.`
                  : "Fits without changes."}
            </p>
            <p className="text-sm">
              Question: “When will I get my refund for that order?” — {VERDICT_TEXT[outcome]}
            </p>
            <ul className="space-y-1">
              <Check ok={plan.checks.order}>Knows the order number (turn 1)</Check>
              <Check ok={plan.checks.code}>
                Can quote the exact error the customer pasted (turn 2)
              </Check>
              <Check ok={plan.checks.policy}>Has the refund policy (top retrieved document)</Check>
            </ul>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
            <Stat label="Input this request" value={plan.input.toLocaleString("en-US")} />
            <Stat
              label="Cost of this request"
              value={plan.status === "rejected" ? "—" : money(plan.cost)}
            />
            <Stat
              label={`Whole conversation (${params.turns + 1} requests)`}
              value={money(whole.cost)}
            />
            <Stat
              label="Input tokens across the conversation"
              value={whole.inputTokens.toLocaleString("en-US")}
            />
          </dl>
          <p className="text-xs text-fg-subtle">
            Every request re-sends the conversation so far, so the total cost grows faster than the
            number of turns.
            {whole.rejected > 0 &&
              ` ${whole.rejected} of its requests were rejected and cost nothing — but went unanswered.`}{" "}
            Prices: {money(PRICE_TIERS[params.tier].input)} input and{" "}
            {money(PRICE_TIERS[params.tier].output)} output per million tokens — illustrative.
          </p>
        </div>
      </div>
    </ExplorerFrame>
  );
}
