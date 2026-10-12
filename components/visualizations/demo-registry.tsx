import dynamic from "next/dynamic";

/*
 * Playground demos by slug (see content/playground.ts). Each is code-split so a page only loads
 * its own simulation; all of them still server-render their first frame.
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

export const DEMO_SLUGS = ["load-balancer", "tls-handshake", "kubernetes-self-healing"] as const;

export function hasDemo(slug: string): boolean {
  return (DEMO_SLUGS as readonly string[]).includes(slug);
}

export function PlaygroundDemoView({ slug }: { slug: string }) {
  switch (slug) {
    case "load-balancer":
      return <LoadBalancerSimulation />;
    case "tls-handshake":
      return <TlsHandshakeWalkthrough />;
    case "kubernetes-self-healing":
      return <KubernetesSimulation />;
    default:
      return null;
  }
}
