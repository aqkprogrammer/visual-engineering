import { defineLesson } from "@/lib/content/schema";

export default defineLesson({
  slug: "load-balancing",
  domain: "system-design",
  module: "traffic",
  order: 10,
  title: "How load balancing works",
  description:
    "How a load balancer spreads requests across servers, detects failures with health checks, and what changes between layer 4 and layer 7 balancing.",
  difficulty: "beginner",
  tags: ["load-balancing", "scalability", "availability", "health-checks", "reverse-proxy"],
  references: [
    {
      title: "Using nginx as HTTP load balancer",
      url: "https://nginx.org/en/docs/http/load_balancing.html",
      publisher: "nginx.org",
      kind: "official-docs",
    },
    {
      title: "Health checks for Application Load Balancer target groups",
      url: "https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html",
      publisher: "Amazon Web Services",
      kind: "official-docs",
    },
    {
      title: "Target groups for your Application Load Balancers",
      url: "https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html",
      publisher: "Amazon Web Services",
      kind: "official-docs",
    },
    {
      title: "Edit attributes for your Application Load Balancer (connection idle timeout)",
      url: "https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-load-balancer-attributes.html",
      publisher: "Amazon Web Services",
      kind: "official-docs",
    },
    {
      title: "Module ngx_http_upstream_module",
      url: "https://nginx.org/en/docs/http/ngx_http_upstream_module.html",
      publisher: "nginx.org",
      kind: "official-docs",
    },
    {
      title: "Supported load balancers",
      url: "https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/load_balancing/load_balancers",
      publisher: "Envoy Project",
      kind: "official-docs",
    },
    {
      title: "Load Balancing in the Datacenter (Site Reliability Engineering, ch. 20)",
      url: "https://sre.google/sre-book/load-balancing-datacenter/",
      publisher: "Google",
      kind: "book",
    },
    {
      title: "gRPC Load Balancing",
      url: "https://grpc.io/blog/grpc-load-balancing/",
      publisher: "gRPC Authors",
      kind: "article",
    },
  ],
  lastReviewed: "2026-10-12",
  status: "published",
});
