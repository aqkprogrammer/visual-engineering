import { defineLesson } from "@/lib/content/schema";

export default defineLesson({
  slug: "docker-images-and-layers",
  domain: "containers",
  module: "containers",
  order: 10,
  title: "How Docker images and layers work",
  description:
    "How a Dockerfile becomes a stack of cached layers, why instruction order decides build speed, and how images, registries and containers relate.",
  difficulty: "beginner",
  related: ["containers/kubernetes-self-healing"],
  tags: ["docker", "containers", "images", "build-cache", "devops"],
  references: [
    {
      title: "Understanding the image layers",
      url: "https://docs.docker.com/get-started/docker-concepts/building-images/understanding-image-layers/",
      publisher: "Docker",
      kind: "official-docs",
    },
    {
      title: "Storage drivers (images, layers and the container layer)",
      url: "https://docs.docker.com/engine/storage/drivers/",
      publisher: "Docker",
      kind: "official-docs",
    },
    {
      title: "Docker build cache",
      url: "https://docs.docker.com/build/cache/",
      publisher: "Docker",
      kind: "official-docs",
    },
    {
      title: "Build cache invalidation",
      url: "https://docs.docker.com/build/cache/invalidation/",
      publisher: "Docker",
      kind: "official-docs",
    },
    {
      title: "Build context",
      url: "https://docs.docker.com/build/concepts/context/",
      publisher: "Docker",
      kind: "official-docs",
    },
    {
      title: "Multi-stage builds",
      url: "https://docs.docker.com/build/building/multi-stage/",
      publisher: "Docker",
      kind: "official-docs",
    },
  ],
  lastReviewed: "2026-10-13",
  status: "published",
});
