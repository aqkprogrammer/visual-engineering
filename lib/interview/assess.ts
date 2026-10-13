/**
 * Self-assessment against a published rubric. The rule is deliberately simple and is shown to the
 * learner word for word (see `ASSESSMENT_RULES`), so there is no hidden scoring.
 */

export type Verdict = "not-yet" | "partial" | "solid" | "strong";

export type Assessment = {
  coreTotal: number;
  coreCovered: number;
  strongShown: number;
  redFlagsHit: number;
};

export const VERDICT_LABEL: Record<Verdict, string> = {
  "not-yet": "Not there yet",
  partial: "Partly there",
  solid: "Solid",
  strong: "Strong",
};

/** The rule, in the order it is applied. Rendered next to the checklist. */
export const ASSESSMENT_RULES: readonly { verdict: Verdict; rule: string }[] = [
  { verdict: "strong", rule: "Every core point, at least one strong signal, and no red flags." },
  { verdict: "solid", rule: "Every core point and no red flags." },
  { verdict: "partial", rule: "At least half of the core points." },
  { verdict: "not-yet", rule: "Fewer than half of the core points." },
];

export function assess({ coreTotal, coreCovered, strongShown, redFlagsHit }: Assessment): Verdict {
  const allCore = coreTotal > 0 && coreCovered >= coreTotal;
  if (allCore && redFlagsHit === 0) return strongShown > 0 ? "strong" : "solid";
  return coreCovered * 2 >= coreTotal ? "partial" : "not-yet";
}
