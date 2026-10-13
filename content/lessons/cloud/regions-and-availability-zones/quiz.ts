import { defineQuiz } from "@/lib/content/schema";

export default defineQuiz([
  {
    id: "az-definition",
    prompt: "What is an Availability Zone?",
    options: [
      {
        id: "a",
        text: "One or more data centres in a region with their own power, networking and connectivity, isolated from the region's other zones.",
        correct: true,
        explanation:
          "Zones are separate failure domains within one region, far enough apart to avoid shared disasters but close enough for low-latency links.",
      },
      {
        id: "b",
        text: "A separate country or continent where the provider operates.",
        explanation:
          "That is closer to a region. Zones are the isolated locations inside a region.",
      },
      {
        id: "c",
        text: "A rack of servers inside one data centre.",
        explanation:
          "A rack shares the building's power and cooling. A zone is at least a whole data centre with independent infrastructure.",
      },
      {
        id: "d",
        text: "A content delivery network edge location.",
        explanation:
          "Edge locations cache content close to users. They are a different part of the infrastructure from zones.",
      },
    ],
  },
  {
    id: "single-zone-headroom",
    prompt:
      "An application runs 12 servers, all in one zone, where 6 would carry the load. What happens if that zone fails?",
    options: [
      {
        id: "a",
        text: "Everything goes down: the extra servers are in the same zone.",
        correct: true,
        explanation:
          "Headroom in one zone protects against individual server failures, not against the zone's own failure.",
      },
      {
        id: "b",
        text: "Nothing: there's 100% spare capacity.",
        explanation: "All 12 servers fail together because they share the zone.",
      },
      {
        id: "c",
        text: "Half the requests fail.",
        explanation: "Half would fail only if half the servers were in another, healthy zone.",
      },
    ],
  },
  {
    id: "static-stability-headroom",
    prompt:
      "You need 6 instances' worth of capacity and run in three zones. How many instances make the system statically stable against losing one zone?",
    options: [
      {
        id: "a",
        text: "6 — two per zone.",
        explanation: "Losing a zone leaves 4, a third short, until replacements launch.",
      },
      {
        id: "b",
        text: "9 — three per zone, so any two zones carry the full load.",
        correct: true,
        explanation:
          "Over-provisioning by 50% across three zones means the two survivors already have the 6 instances needed, with nothing to launch.",
      },
      {
        id: "c",
        text: "18 — six per zone.",
        explanation:
          "That survives losing two zones, at three times the cost. One zone's loss needs only 50% extra.",
      },
    ],
  },
  {
    id: "control-plane-dependency",
    prompt: "Why is relying on autoscaling to replace a failed zone's capacity risky?",
    options: [
      {
        id: "a",
        text: "Launching instances depends on the control plane and takes minutes, during exactly the kind of event that strains it.",
        correct: true,
        explanation:
          "Replacement capacity is reactive: until it arrives, users see errors, and it may not arrive at all if the control plane is impaired.",
      },
      {
        id: "b",
        text: "Autoscaling can only add instances in the zone that failed.",
        explanation:
          "It launches into the healthy zones you allow; the problem is timing and dependence on the control plane.",
      },
      {
        id: "c",
        text: "Autoscaling is not available in multi-zone setups.",
        explanation: "Autoscaling groups commonly span several zones.",
      },
    ],
  },
  {
    id: "multi-region-cost",
    prompt: "Which is the main cost of running active-active in two regions?",
    options: [
      {
        id: "a",
        text: "Running and operating a second copy of everything, and keeping data consistent between regions.",
        correct: true,
        explanation:
          "Most services are regional, so each region needs its own stack, and asynchronous replication raises consistency and data-loss questions.",
      },
      {
        id: "b",
        text: "Users get slower responses because requests always cross between regions.",
        explanation:
          "Users are normally served by the region nearest to them, which can make responses faster, not slower.",
      },
      {
        id: "c",
        text: "Nothing — two regions cost the same as one.",
        explanation:
          "A second region roughly doubles infrastructure and adds data transfer and engineering effort.",
      },
    ],
  },
]);
