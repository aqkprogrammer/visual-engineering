import { defineQuiz } from "@/lib/content/schema";

export default defineQuiz([
  {
    id: "root-referral",
    prompt:
      "A recursive resolver with an empty cache asks a root server for shop.example.com. What does the root reply?",
    options: [
      {
        id: "a",
        text: "The IP address of shop.example.com.",
        explanation:
          "Root servers don't hold records for individual domains; that would be impossible at internet scale.",
      },
      {
        id: "b",
        text: "A referral to the name servers responsible for .com.",
        correct: true,
        explanation:
          "Each level delegates to the next. The resolver follows the referral to the .com servers.",
      },
      {
        id: "c",
        text: "An error, because the resolver should have asked the TLD first.",
        explanation:
          "Starting at the root is exactly what a resolver does when it has nothing cached.",
      },
    ],
  },
  {
    id: "propagation",
    prompt:
      "You change an A record whose TTL is 3600 seconds. How long can some users keep reaching the old address?",
    options: [
      {
        id: "a",
        text: "Up to about an hour, until cached copies expire.",
        correct: true,
        explanation:
          "Resolvers that cached the old answer may keep serving it for up to its TTL. Lower the TTL in advance before planned changes.",
      },
      {
        id: "b",
        text: "No time at all — DNS changes are pushed to every resolver.",
        explanation:
          "Nothing is pushed. Resolvers only see the change when their cached copy expires.",
      },
      {
        id: "c",
        text: "Always exactly 48 hours.",
        explanation:
          "That folklore comes from long TTLs. The real bound is the TTL that was cached.",
      },
    ],
  },
  {
    id: "sibling-name",
    prompt:
      "Right after resolving shop.example.com, the same resolver is asked for api.example.com. Which servers does it need to contact?",
    options: [
      {
        id: "a",
        text: "Root, .com and the authoritative server again.",
        explanation:
          "It cached the example.com delegation from the first lookup, so it can skip the root and .com.",
      },
      {
        id: "b",
        text: "Only example.com's authoritative server.",
        correct: true,
        explanation:
          "Referrals are cached as well as answers, which is why the root and TLD servers see a small fraction of all lookups.",
      },
      {
        id: "c",
        text: "None — the answer for shop.example.com covers api.example.com too.",
        explanation: "Each name has its own records; only the delegation is shared.",
      },
    ],
  },
  {
    id: "negative-cache",
    prompt:
      "You queried new.example.com before creating its record, then created it. Some users still get 'name not found'. Why?",
    options: [
      {
        id: "a",
        text: "The NXDOMAIN answer was cached for a time set by the zone's SOA record.",
        correct: true,
        explanation:
          "Negative answers are cached too (RFC 2308). They clear once that negative-cache time passes.",
      },
      {
        id: "b",
        text: "New records take a day to be accepted by the root servers.",
        explanation: "The root servers aren't involved in records inside your zone.",
      },
      {
        id: "c",
        text: "The record type must be AAAA, not A.",
        explanation: "Record type isn't the issue; a cached 'does not exist' answer is.",
      },
    ],
  },
]);
