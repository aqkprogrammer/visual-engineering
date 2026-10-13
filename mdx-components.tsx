import type { MDXComponents } from "mdx/types";
import { Analogy, Callout, Definition, Steps, TradeOffs } from "@/components/lessons/mdx-blocks";
import { Demo } from "@/components/visualizations/demo-registry";
import { LoadBalancerDiagram } from "@/components/visualizations/static/load-balancer-diagram";

/**
 * Components available to every lesson without an import. Lessons are trusted, reviewed
 * repository content — MDX compiles to code, so it is never rendered from user input.
 *
 * Interactive demos go through `<Demo slug="…" />`, which lazy-loads each one in its own chunk.
 * Importing a simulation component directly would add it to the bundle of every lesson page.
 */
const components = {
  Analogy,
  Callout,
  Definition,
  Demo,
  Steps,
  TradeOffs,
  LoadBalancerDiagram,
} satisfies MDXComponents;

export function useMDXComponents(): MDXComponents {
  return components;
}
