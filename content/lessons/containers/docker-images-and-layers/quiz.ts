import { defineQuiz } from "@/lib/content/schema";

export default defineQuiz([
  {
    id: "order",
    prompt:
      "A Dockerfile runs COPY . . before RUN npm ci. You change one line in src/server.js and rebuild. What happens?",
    options: [
      {
        id: "a",
        text: "Only the COPY layer rebuilds.",
        explanation: "Once COPY misses, every later layer has a new parent and must rebuild too.",
      },
      {
        id: "b",
        text: "The COPY layer and everything after it rebuild, including the slow dependency install.",
        correct: true,
        explanation:
          "Copy the dependency manifests and install them before copying the source so code changes don't invalidate the install.",
      },
      {
        id: "c",
        text: "Nothing rebuilds; Docker detects that dependencies didn't change.",
        explanation:
          "The builder doesn't inspect what npm ci would install; it only compares cache keys.",
      },
    ],
  },
  {
    id: "writable-layer",
    prompt:
      "A container writes uploaded files to its own filesystem. The container is removed and recreated from the same image. What happens to the files?",
    options: [
      {
        id: "a",
        text: "They're gone — they lived in the container's writable layer.",
        correct: true,
        explanation:
          "The writable layer is deleted with the container. Use a volume for data that must persist.",
      },
      {
        id: "b",
        text: "They're saved into the image automatically.",
        explanation: "Images are immutable; running containers never change them.",
      },
      {
        id: "c",
        text: "They reappear because the image is the same.",
        explanation:
          "The image never contained them; they were only ever in the old container's layer.",
      },
    ],
  },
  {
    id: "push",
    prompt:
      "You change only your application code and push the new image. What does the registry receive?",
    options: [
      {
        id: "a",
        text: "The whole image, including the base image layers.",
        explanation:
          "Registries already holding a layer skip it; only missing layers are uploaded.",
      },
      {
        id: "b",
        text: "Only the layers it doesn't already have — here, the layer containing your code — plus the image manifest.",
        correct: true,
        explanation:
          "Layers are content-addressed, so unchanged layers are recognised and skipped.",
      },
      {
        id: "c",
        text: "Only the Dockerfile; the registry rebuilds the image.",
        explanation: "Registries store built layers; they don't run builds.",
      },
    ],
  },
  {
    id: "delete-later",
    prompt:
      "A Dockerfile downloads a 500 MB archive in one RUN step and deletes it in a later RUN step. How big is the image?",
    options: [
      {
        id: "a",
        text: "Still about 500 MB larger — the earlier layer keeps the file; the later layer only hides it.",
        correct: true,
        explanation:
          "Download and delete in the same RUN instruction, or use a multi-stage build so the archive never reaches the final image.",
      },
      {
        id: "b",
        text: "The same size as without the archive, because it was deleted.",
        explanation: "Deletion in a later layer doesn't remove data stored in an earlier one.",
      },
      {
        id: "c",
        text: "Smaller than before, because deleting files compresses the image.",
        explanation: "Deleting files never shrinks earlier layers.",
      },
    ],
  },
]);
