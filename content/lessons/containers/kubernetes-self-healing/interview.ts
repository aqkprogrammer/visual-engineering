import { defineInterview } from "@/lib/content/schema";

export default defineInterview([
  {
    id: "liveness-vs-readiness",
    question: "What is the difference between a liveness probe and a readiness probe?",
    level: "junior",
    kind: "concept",
    answer:
      "A readiness probe decides whether a pod should receive traffic; failing it removes the pod from Service endpoints without restarting anything. A liveness probe decides whether a container is beyond recovery; failing it past the threshold makes the kubelet restart the container. Readiness handles temporary inability to serve, liveness handles stuck processes.",
    rubric: {
      core: [
        "Readiness decides whether a pod receives traffic",
        "Failing readiness removes the pod from Service endpoints without restarting it",
        "Failing liveness past its threshold makes the kubelet restart the container",
      ],
      strong: ["Readiness covers temporary inability to serve; liveness covers stuck processes"],
      redFlags: ["Says both probes restart the container"],
    },
  },
  {
    id: "node-loses-power",
    question: "A node loses power. Walk through what happens to the pods that were running on it.",
    level: "senior",
    kind: "debugging",
    answer:
      "The kubelet stops reporting, and after the node-monitor grace period the node lifecycle controller marks the node NotReady and its pods not Ready, removing them from Services. Pods tolerate the NotReady/unreachable taints for 300 seconds by default; after that they are evicted. The ReplicaSet controller then sees too few pods and creates replacements, which the scheduler places on healthy nodes. The old pods remain Terminating until the node returns or they are force-deleted.",
    rubric: {
      core: [
        "The node is marked NotReady after the grace period, and its pods stop receiving traffic",
        "Pods are evicted after the default 300-second toleration",
        "The ReplicaSet controller creates replacements, which the scheduler places on healthy nodes",
      ],
      strong: [
        "Notes that old pods stay Terminating until the node returns or they are force-deleted",
      ],
      redFlags: ["Says the pods move to another node instantly"],
    },
  },
  {
    id: "database-check-in-liveness",
    question: "Why might adding a database check to a liveness probe cause an outage?",
    level: "senior",
    kind: "debugging",
    answer:
      "If the database becomes briefly unavailable, every pod's liveness probe fails at the same time, so the kubelet restarts all of them together. The service loses all capacity and the restart storm can add load just as the database recovers. Liveness should only fail when restarting the container itself would fix the problem.",
    rubric: {
      core: [
        "A database blip fails every pod's liveness probe at the same time",
        "The kubelet restarts all pods together, removing all capacity",
        "Liveness should fail only when restarting this container would fix the problem",
      ],
      strong: ["Points out that the restart storm adds load just as the database recovers"],
      redFlags: ["Recommends checking dependencies in liveness probes"],
    },
  },
  {
    id: "crashloopbackoff",
    question: "What does CrashLoopBackOff mean, and how do you investigate it?",
    level: "junior",
    kind: "debugging",
    answer:
      "The container keeps exiting and the kubelet is waiting out an exponentially growing delay — 10 s, 20 s, 40 s, up to 5 minutes — before restarting it again. Investigate with `kubectl logs --previous` to see the crashed container's output and `kubectl describe pod` for exit codes, OOM kills and probe failures.",
    rubric: {
      core: [
        "The container keeps exiting and restarts are delayed by an exponential backoff",
        "The delay grows from 10 seconds up to 5 minutes",
        "Investigates with `kubectl logs --previous` and `kubectl describe pod`",
      ],
      strong: ["Checks exit codes, out-of-memory kills and probe failures"],
      redFlags: ["Assumes Kubernetes itself is broken"],
    },
  },
]);
