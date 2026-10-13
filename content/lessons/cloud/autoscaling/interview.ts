import { defineInterview } from "@/lib/content/schema";

export default defineInterview([
  {
    id: "how-target-tracking-works",
    question: "How does a target tracking autoscaling policy decide how many instances to run?",
    level: "junior",
    kind: "concept",
    answer:
      "It watches a metric such as average CPU and computes the count that would bring it to the target, in proportion: desired = ceil(current instances × current metric ÷ target). It ignores small deviations within a tolerance, adds instances promptly when above the target — counting instances that are still starting — and removes them cautiously when below, within configured minimum and maximum limits.",
    rubric: {
      core: [
        "Keeps a chosen metric near a target value",
        "Scales in proportion: current count × metric ÷ target",
        "Respects minimum and maximum limits",
      ],
      strong: ["Mentions tolerance, and that scale-in is more cautious than scale-out"],
      redFlags: ["Describes it as adding one instance per alarm with no proportionality"],
    },
  },
  {
    id: "errors-during-ramp",
    question:
      "Users see errors every morning as traffic ramps up, even though autoscaling is on. What do you check and change?",
    level: "mid",
    kind: "debugging",
    answer:
      "Compare how fast traffic climbs with how long new instances take to serve. If start-up is slow relative to the climb, the fleet runs out before capacity arrives. Fixes: lower the target utilisation for more headroom, shorten start-up (smaller images, pre-baked images, warm pools), raise the minimum, or add scheduled or predictive scaling before the known morning ramp. Also check the metric arrives promptly and that the limit isn't the maximum instance count or a dependency.",
    rubric: {
      core: [
        "Identifies start-up time and metric lag versus the rate of the climb",
        "Suggests more headroom via a lower target or a higher minimum",
        "Suggests scheduled or predictive scaling for a known daily ramp",
      ],
      strong: ["Checks the maximum instance count and downstream dependencies"],
      redFlags: ["Just raises the maximum instance count without examining the lag"],
    },
  },
  {
    id: "flapping",
    question: "What is flapping in autoscaling, and how do you prevent it?",
    level: "mid",
    kind: "debugging",
    answer:
      "Flapping is repeatedly adding and removing instances because the policy reacts to short-lived changes: capacity is removed during a brief lull, then needed again minutes later, and users see errors while new instances start. Prevent it by making scale-in slower than scale-out: a stabilisation window that scales in only to the highest recent recommendation, a tolerance around the target, and blocking scale-in while instances are still starting.",
    rubric: {
      core: [
        "Defines flapping as scaling in and out repeatedly on short-lived changes",
        "Uses a scale-in stabilisation window or delay",
        "Uses a tolerance band around the target",
      ],
      strong: ["Explains the cost: errors while re-added instances start, plus start-up charges"],
      redFlags: ["Suggests making scale-in faster"],
    },
  },
  {
    id: "autoscaling-limits",
    question: "Why isn't autoscaling enough to protect a service from a sudden tenfold spike?",
    level: "senior",
    kind: "trade-off",
    answer:
      "Capacity can't arrive faster than instances start, and a tenfold spike exhausts any reasonable headroom within seconds. Dependencies such as databases don't scale with the web tier and may fail first. You also need ways to absorb or shed load: queues for work that can wait, rate limiting and load shedding to protect the service, caching, and pre-scaling for events you know about.",
    rubric: {
      core: [
        "Start-up time makes autoscaling too slow for sudden spikes",
        "Dependencies behind the fleet don't scale with it",
        "Needs complementary protection: queues, rate limiting or load shedding",
      ],
      strong: ["Mentions pre-scaling or scheduled scaling for known events"],
      redFlags: ["Says a higher maximum instance count solves it"],
    },
  },
]);
