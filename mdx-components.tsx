import type { MDXComponents } from "mdx/types";
import {
  Analogy,
  Callout,
  Definition,
  InterviewQuestion,
  Steps,
  TradeOffs,
} from "@/components/lessons/mdx-blocks";
import { LoadBalancerDiagram } from "@/components/visualizations/static/load-balancer-diagram";

/**
 * Components available to every lesson without an import. Lessons are trusted, reviewed
 * repository content — MDX compiles to code, so it is never rendered from user input.
 */
const components = {
  Analogy,
  Callout,
  Definition,
  InterviewQuestion,
  Steps,
  TradeOffs,
  LoadBalancerDiagram,
} satisfies MDXComponents;

export function useMDXComponents(): MDXComponents {
  return components;
}
