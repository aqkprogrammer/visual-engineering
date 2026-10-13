import { defineQuiz } from "@/lib/content/schema";

export default defineQuiz([
  {
    id: "crash-same-pod",
    prompt: "The process inside one of your pods crashes. What does Kubernetes do first?",
    options: [
      {
        id: "a",
        text: "The ReplicaSet deletes the pod and creates a new one with a new name.",
        explanation:
          "The pod still exists, so the ReplicaSet's count is unchanged. A new pod is only created if the pod is deleted or evicted.",
      },
      {
        id: "b",
        text: "The kubelet restarts the container inside the same pod, after a back-off delay.",
        correct: true,
        explanation:
          "Container restarts are the kubelet's job. RESTARTS increases and the pod keeps its name and node.",
      },
      {
        id: "c",
        text: "The scheduler moves the pod to a different node.",
        explanation:
          "Pods are never moved. The scheduler only places new pods that have no node yet.",
      },
      {
        id: "d",
        text: "Nothing until an operator runs kubectl rollout restart.",
        explanation:
          "Restarting failed containers is automatic for Deployments, which use restartPolicy: Always.",
      },
    ],
  },
  {
    id: "readiness-vs-liveness",
    prompt:
      "Your app can't serve requests for 20 seconds while it reloads its cache, but it will recover by itself. Which probe should report that?",
    options: [
      {
        id: "a",
        text: "Liveness — so the container gets restarted.",
        explanation:
          "Restarting would throw away the reload in progress and could make things worse. The app is not stuck.",
      },
      {
        id: "b",
        text: "Readiness — so the pod stops receiving traffic until it is ready again.",
        correct: true,
        explanation:
          "Readiness failures remove the pod from Service endpoints without restarting it — exactly right for temporary unavailability.",
      },
      {
        id: "c",
        text: "Neither; Kubernetes detects this automatically.",
        explanation:
          "Kubernetes only knows what your probes tell it. Without a readiness probe, a running container is assumed ready.",
      },
    ],
  },
  {
    id: "node-failure-timing",
    prompt: "With default settings, how quickly are pods on a powered-off node replaced elsewhere?",
    options: [
      {
        id: "a",
        text: "Within a second or two.",
        explanation:
          "The control plane first has to notice the silent node, and pods then tolerate the NotReady node before eviction.",
      },
      {
        id: "b",
        text: "After the node is marked NotReady plus the default 300-second toleration — several minutes.",
        correct: true,
        explanation:
          "Kubernetes deliberately waits in case the node is only briefly unreachable. Enough replicas across nodes is how you stay available meanwhile.",
      },
      {
        id: "c",
        text: "Never; pods on a failed node are lost for good.",
        explanation:
          "They are evicted after the toleration and the ReplicaSet creates replacements.",
      },
    ],
  },
  {
    id: "files-after-restart",
    prompt:
      "Your app writes uploaded files to /tmp inside its container. The container crashes and is restarted. What happens to the files?",
    options: [
      {
        id: "a",
        text: "They are still there, because the pod didn't change.",
        explanation:
          "The pod is the same, but a restarted container starts from a fresh writable layer.",
      },
      {
        id: "b",
        text: "They are gone; durable data needs a persistent volume or an external store.",
        correct: true,
        explanation:
          "Container filesystems are disposable. An emptyDir volume survives container restarts but not pod deletion; persistent volumes or object storage survive both.",
      },
      {
        id: "c",
        text: "Kubernetes copies them to the new container automatically.",
        explanation:
          "Kubernetes doesn't copy container filesystems; it only reattaches volumes defined in the pod spec.",
      },
    ],
  },
]);
