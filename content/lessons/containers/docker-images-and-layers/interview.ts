import { defineInterview } from "@/lib/content/schema";

export default defineInterview([
  {
    id: "docker-build-cache",
    question:
      "How does Docker's build cache work, and how do you structure a Dockerfile to make the most of it?",
    level: "mid",
    kind: "concept",
    answer:
      "Each instruction produces a layer whose cache key depends on its parent layer, the instruction and, for COPY or ADD, the copied files. If a matching layer exists it is reused; once one instruction misses, every later instruction rebuilds because its parent changed. So order instructions from least to most frequently changing: base image and system packages first, then dependency manifests and the dependency install, then application source last, and keep irrelevant files out with .dockerignore.",
    rubric: {
      core: [
        "Each instruction's cache key depends on its parent layer, the instruction and any copied files",
        "After the first miss, every later instruction rebuilds",
        "Orders instructions from least to most frequently changing: manifests and install before source",
      ],
      strong: ["Keeps irrelevant files out with .dockerignore"],
      redFlags: ["Says only the changed instruction rebuilds"],
    },
  },
  {
    id: "image-vs-container",
    question: "What is the difference between an image and a container?",
    level: "junior",
    kind: "concept",
    answer:
      "An image is an immutable, read-only stack of layers plus configuration. A container is a running instance of an image: the same read-only layers with a thin writable layer on top, plus its own process, network and resource settings. Many containers can run from one image, and removing a container deletes its writable layer but leaves the image untouched.",
    rubric: {
      core: [
        "An image is an immutable stack of read-only layers plus configuration",
        "A container is a running instance with a thin writable layer on top",
        "Many containers can run from one image; removing a container leaves the image untouched",
      ],
      strong: ["Mentions each container's own process, network and resource settings"],
      redFlags: ["Says a container is a lightweight virtual machine"],
    },
  },
  {
    id: "multi-stage-builds",
    question: "Why use a multi-stage build?",
    level: "mid",
    kind: "concept",
    answer:
      "To separate the environment needed to build software from the one needed to run it. Compilers, build tools and intermediate files stay in an earlier stage; only the finished artefacts are copied into a minimal final stage. The result is a smaller image that downloads faster and has a smaller attack surface.",
    rubric: {
      core: [
        "Separates the environment needed to build from the one needed to run",
        "Copies only the finished artefacts into a minimal final stage",
      ],
      strong: ["Mentions faster pulls and a smaller attack surface"],
      redFlags: ["Thinks deleting files in a later layer makes the image smaller"],
    },
  },
  {
    id: "database-in-a-container",
    question: "Where should a containerised database store its data, and why?",
    level: "junior",
    kind: "design",
    answer:
      "In a volume (or other persistent storage) mounted into the container, not in the container's writable layer. The writable layer is removed with the container and has write-performance overhead, while a volume persists independently of any container and can be backed up and reattached.",
    rubric: {
      core: [
        "Stores data in a volume, not the container's writable layer",
        "The writable layer is deleted along with the container",
        "Volumes persist independently and can be backed up and reattached",
      ],
      strong: ["Mentions the write-performance overhead of the container layer"],
      redFlags: ["Stores the data inside the image"],
    },
  },
]);
