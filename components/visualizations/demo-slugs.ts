/** Playground demo slugs with a registered component (see `demo-registry.tsx`). */
export const DEMO_SLUGS = [
  "load-balancer",
  "tls-handshake",
  "kubernetes-self-healing",
  "cache",
  "rate-limiter",
  "embeddings",
  "btree-index",
  "dns-resolution",
  "rag-pipeline",
  "docker-build-cache",
  "tokenizer",
  "message-queue",
  "system-design-sandbox",
  "availability-zones",
  "deployment-strategies",
  "autoscaling",
  "service-calls",
  "event-sourcing",
  "hexagonal-architecture",
  "chunking",
  "hybrid-search",
  "context-budget",
  "agent-loop",
  "sharding",
  "replication",
] as const;

export type DemoSlug = (typeof DEMO_SLUGS)[number];

export function hasDemo(slug: string): slug is DemoSlug {
  return (DEMO_SLUGS as readonly string[]).includes(slug);
}
