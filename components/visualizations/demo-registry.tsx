"use client";

import dynamic from "next/dynamic";
import type { DemoSlug } from "./demo-slugs";

/*
 * Interactive demos by slug (see content/playground.ts), used by playground pages and lessons.
 * This must stay a client module: only then does `dynamic()` give each demo its own chunk, so a
 * page downloads just the demo it shows. Every demo still server-renders its first frame.
 */
const LoadBalancerSimulation = dynamic(() =>
  import("./scenes/load-balancer/load-balancer-simulation").then((m) => m.LoadBalancerSimulation),
);
const TlsHandshakeWalkthrough = dynamic(() =>
  import("./scenes/tls/tls-walkthrough").then((m) => m.TlsHandshakeWalkthrough),
);
const KubernetesSimulation = dynamic(() =>
  import("./scenes/kubernetes/kubernetes-simulation").then((m) => m.KubernetesSimulation),
);

const CacheSimulation = dynamic(() =>
  import("./scenes/cache/cache-simulation").then((m) => m.CacheSimulation),
);
const RateLimiterSimulation = dynamic(() =>
  import("./scenes/rate-limiter/rate-limiter-simulation").then((m) => m.RateLimiterSimulation),
);
const EmbeddingExplorer = dynamic(() =>
  import("./scenes/embeddings/embedding-explorer").then((m) => m.EmbeddingExplorer),
);

const BTreeSimulation = dynamic(() =>
  import("./scenes/btree/btree-simulation").then((m) => m.BTreeSimulation),
);
const DnsWalkthrough = dynamic(() =>
  import("./scenes/dns/dns-walkthrough").then((m) => m.DnsWalkthrough),
);
const RagWalkthrough = dynamic(() =>
  import("./scenes/rag/rag-walkthrough").then((m) => m.RagWalkthrough),
);
const DockerSimulation = dynamic(() =>
  import("./scenes/docker/docker-simulation").then((m) => m.DockerSimulation),
);
const TokenizerExplorer = dynamic(() =>
  import("./scenes/tokenizer/tokenizer-explorer").then((m) => m.TokenizerExplorer),
);
const ZonesSimulation = dynamic(() =>
  import("./scenes/zones/zones-simulation").then((m) => m.ZonesSimulation),
);
const DeploymentsSimulation = dynamic(() =>
  import("./scenes/deployments/deployments-simulation").then((m) => m.DeploymentsSimulation),
);
const AutoscalingSimulation = dynamic(() =>
  import("./scenes/autoscaling/autoscaling-simulation").then((m) => m.AutoscalingSimulation),
);
const ServiceCallsSimulation = dynamic(() =>
  import("./scenes/service-calls/service-calls-simulation").then((m) => m.ServiceCallsSimulation),
);
const EventSourcingSimulation = dynamic(() =>
  import("./scenes/event-sourcing/event-sourcing-simulation").then(
    (m) => m.EventSourcingSimulation,
  ),
);
const HexagonalExplorer = dynamic(() =>
  import("./scenes/hexagonal/hexagonal-explorer").then((m) => m.HexagonalExplorer),
);
const ChunkingExplorer = dynamic(() =>
  import("./scenes/chunking/chunking-explorer").then((m) => m.ChunkingExplorer),
);
const HybridSearchExplorer = dynamic(() =>
  import("./scenes/hybrid-search/hybrid-search-explorer").then((m) => m.HybridSearchExplorer),
);
const ContextBudgetExplorer = dynamic(() =>
  import("./scenes/context-budget/context-budget-explorer").then((m) => m.ContextBudgetExplorer),
);
const AgentWalkthrough = dynamic(() =>
  import("./scenes/agent-loop/agent-walkthrough").then((m) => m.AgentWalkthrough),
);
const ShardingExplorer = dynamic(() =>
  import("./scenes/sharding/sharding-explorer").then((m) => m.ShardingExplorer),
);
const ReplicationSimulation = dynamic(() =>
  import("./scenes/replication/replication-simulation").then((m) => m.ReplicationSimulation),
);
const SandboxSimulation = dynamic(() =>
  import("./scenes/sandbox/sandbox-simulation").then((m) => m.SandboxSimulation),
);
const QueueSimulation = dynamic(() =>
  import("./scenes/queue/queue-simulation").then((m) => m.QueueSimulation),
);

export function Demo({ slug }: { slug: DemoSlug }) {
  switch (slug) {
    case "load-balancer":
      return <LoadBalancerSimulation />;
    case "tls-handshake":
      return <TlsHandshakeWalkthrough />;
    case "kubernetes-self-healing":
      return <KubernetesSimulation />;
    case "cache":
      return <CacheSimulation />;
    case "rate-limiter":
      return <RateLimiterSimulation />;
    case "embeddings":
      return <EmbeddingExplorer />;
    case "btree-index":
      return <BTreeSimulation />;
    case "dns-resolution":
      return <DnsWalkthrough />;
    case "rag-pipeline":
      return <RagWalkthrough />;
    case "docker-build-cache":
      return <DockerSimulation />;
    case "tokenizer":
      return <TokenizerExplorer />;
    case "message-queue":
      return <QueueSimulation />;
    case "system-design-sandbox":
      return <SandboxSimulation />;
    case "availability-zones":
      return <ZonesSimulation />;
    case "deployment-strategies":
      return <DeploymentsSimulation />;
    case "autoscaling":
      return <AutoscalingSimulation />;
    case "service-calls":
      return <ServiceCallsSimulation />;
    case "event-sourcing":
      return <EventSourcingSimulation />;
    case "hexagonal-architecture":
      return <HexagonalExplorer />;
    case "chunking":
      return <ChunkingExplorer />;
    case "hybrid-search":
      return <HybridSearchExplorer />;
    case "context-budget":
      return <ContextBudgetExplorer />;
    case "agent-loop":
      return <AgentWalkthrough />;
    case "sharding":
      return <ShardingExplorer />;
    case "replication":
      return <ReplicationSimulation />;
  }
}
