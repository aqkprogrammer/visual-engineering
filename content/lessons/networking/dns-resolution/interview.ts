import { defineInterview } from "@/lib/content/schema";

export default defineInterview([
  {
    id: "dns-url-walkthrough",
    question:
      "Walk through what happens when you type a URL into a browser, from the DNS point of view.",
    level: "junior",
    kind: "concept",
    answer:
      "The browser asks the OS stub resolver, which checks its cache and then asks a recursive resolver. If the resolver has nothing cached, it queries a root server and gets a referral to the TLD servers, queries those and gets a referral to the domain's authoritative servers, and queries one of them for the record. It caches the referrals and the answer according to their TTLs and returns the address to the stub, after which the browser connects.",
    rubric: {
      core: [
        "The stub resolver checks its cache, then asks a recursive resolver",
        "On a miss the resolver follows referrals: root, then TLD, then the authoritative server",
        "Referrals and answers are cached according to their TTLs",
      ],
      strong: ["Notes that browsers and operating systems cache answers too"],
      redFlags: ["Says the browser asks the root servers directly"],
    },
  },
  {
    id: "lowering-ttl-before-migration",
    question:
      "Why does lowering a DNS TTL before a migration help, and why must it be done in advance?",
    level: "mid",
    kind: "design",
    answer:
      "Resolvers keep a cached answer until its TTL expires. If you lower the TTL from, say, an hour to a minute at least an hour before the change, every cache will have refreshed and picked up the short TTL by the time you switch, so the new address is seen within about a minute. Lowering it at the moment of the change doesn't help, because caches still hold the old answer with the old, long TTL.",
    rubric: {
      core: [
        "Resolvers keep a cached answer until its TTL expires",
        "Lower the TTL at least one old-TTL period before the change",
        "Lowering it at the moment of the change doesn't help, because caches hold the old, long TTL",
      ],
      strong: ["Raises the TTL again once the migration has settled"],
      redFlags: ["Expects every client to see the change immediately"],
    },
  },
  {
    id: "recursive-vs-authoritative",
    question:
      "What is the difference between a recursive resolver and an authoritative name server?",
    level: "junior",
    kind: "concept",
    answer:
      "An authoritative server holds the actual records for the zones it is responsible for and answers only about those. A recursive resolver holds no zones of its own; it answers clients by querying authoritative servers on their behalf, following referrals down from the root, and caches the results.",
    rubric: {
      core: [
        "Authoritative servers hold the records for their zones and answer only about them",
        "Recursive resolvers hold no zones and query on behalf of clients",
        "Recursive resolvers cache what they learn",
      ],
      strong: ["Mentions following referrals down from the root"],
      redFlags: ["Mixes up the two roles"],
    },
  },
  {
    id: "dns-failover",
    question: "Why isn't DNS-based failover instant?",
    level: "senior",
    kind: "trade-off",
    answer:
      "Clients and resolvers cache the old answer until its TTL expires, some clients or intermediate caches don't honour very low TTLs, and applications may keep existing connections open. Failover time is therefore at least the TTL plus detection time, which is why it is usually combined with load balancers or anycast for faster recovery.",
    rubric: {
      core: [
        "Cached answers persist until their TTL expires",
        "Some clients and caches ignore very low TTLs, and open connections persist",
        "Failover takes at least detection time plus the TTL",
      ],
      strong: ["Combines DNS with load balancers or anycast for faster recovery"],
      redFlags: ["Treats DNS failover as instant"],
    },
  },
]);
