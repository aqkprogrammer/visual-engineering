/**
 * Authored walkthroughs of DNS resolution for shop.example.com.
 *
 * Uses names and addresses reserved for documentation (example.com, RFC 2606; 203.0.113.0/24 and
 * 198.51.100.0/24, RFC 5737). Latencies are illustrative. Simplified: one resolver, no DNSSEC,
 * no CNAMEs, no IPv6 (AAAA) lookup, no retries or server selection.
 */
import { walkthroughFrames, type WalkthroughStep } from "../run";

export type Party = "browser" | "stub" | "resolver" | "root" | "tld" | "auth";
export type Scenario = "cold" | "warm" | "sibling";

export type CacheEntry = { name: string; type: "A" | "NS"; value: string; ttl: number };

export type DnsState = {
  scenario: Scenario;
  /** Message on the wire in this step. */
  message: { from: Party; to: Party; kind: "query" | "referral" | "answer"; label: string } | null;
  /** Parties that have taken part so far. */
  involved: Party[];
  resolverCache: CacheEntry[];
  elapsedMs: number;
  done: boolean;
};

export const PARTY_LABEL: Record<Party, string> = {
  browser: "browser",
  stub: "OS stub resolver",
  resolver: "recursive resolver",
  root: "root server",
  tld: ".com TLD server",
  auth: "example.com authoritative",
};

const COM_NS: CacheEntry = {
  name: "com.",
  type: "NS",
  value: "a.gtld-servers.net. (and 12 more)",
  ttl: 172800,
};
const EXAMPLE_NS: CacheEntry = {
  name: "example.com.",
  type: "NS",
  value: "ns1.example.com. (198.51.100.53)",
  ttl: 172800,
};
const SHOP_A: CacheEntry = {
  name: "shop.example.com.",
  type: "A",
  value: "203.0.113.10",
  ttl: 300,
};
const API_A: CacheEntry = { name: "api.example.com.", type: "A", value: "203.0.113.20", ttl: 300 };

type Step = WalkthroughStep<DnsState>;

function step(
  scenario: Scenario,
  title: string,
  caption: string,
  partial: Omit<DnsState, "scenario">,
  events: Step["events"] = [],
): Step {
  return { title, caption, state: { scenario, ...partial }, events };
}

function coldSteps(): Step[] {
  const s = "cold" as const;
  return [
    step(
      s,
      "The browser needs an address",
      "Before it can open a connection to shop.example.com, the browser asks the operating system's stub resolver for an IP address. The stub checks its local cache and hosts file: nothing.",
      {
        message: { from: "browser", to: "stub", kind: "query", label: "shop.example.com?" },
        involved: ["browser", "stub"],
        resolverCache: [],
        elapsedMs: 0,
        done: false,
      },
    ),
    step(
      s,
      "Ask the recursive resolver",
      "The stub forwards the question to a recursive resolver — run by the ISP, the company network or a public DNS service — asking it to do the whole job (recursion desired).",
      {
        message: {
          from: "stub",
          to: "resolver",
          kind: "query",
          label: "A shop.example.com? (recursion desired)",
        },
        involved: ["browser", "stub", "resolver"],
        resolverCache: [],
        elapsedMs: 5,
        done: false,
      },
    ),
    step(
      s,
      "Start at the root",
      "The resolver's cache is empty, so it starts at the top of the hierarchy and asks a root server. It knows the root servers' addresses from a built-in hints file.",
      {
        message: { from: "resolver", to: "root", kind: "query", label: "A shop.example.com?" },
        involved: ["browser", "stub", "resolver", "root"],
        resolverCache: [],
        elapsedMs: 15,
        done: false,
      },
    ),
    step(
      s,
      "Referral to .com",
      "The root doesn't know the answer, but it knows who is responsible for .com and returns a referral: the .com name servers and their addresses. The resolver caches this for two days.",
      {
        message: {
          from: "root",
          to: "resolver",
          kind: "referral",
          label: "Ask the .com servers: a.gtld-servers.net …",
        },
        involved: ["browser", "stub", "resolver", "root"],
        resolverCache: [COM_NS],
        elapsedMs: 25,
        done: false,
      },
      [{ message: "Cached: com. NS (TTL 172800 s)", tone: "info" }],
    ),
    step(
      s,
      "Ask the .com TLD servers",
      "The resolver repeats the question to a .com top-level-domain server.",
      {
        message: { from: "resolver", to: "tld", kind: "query", label: "A shop.example.com?" },
        involved: ["browser", "stub", "resolver", "root", "tld"],
        resolverCache: [COM_NS],
        elapsedMs: 37,
        done: false,
      },
    ),
    step(
      s,
      "Referral to example.com's name servers",
      "The .com servers delegate example.com to its own authoritative name servers, including their addresses (glue records) so the resolver can reach them.",
      {
        message: {
          from: "tld",
          to: "resolver",
          kind: "referral",
          label: "Ask ns1.example.com (198.51.100.53)",
        },
        involved: ["browser", "stub", "resolver", "root", "tld"],
        resolverCache: [COM_NS, EXAMPLE_NS],
        elapsedMs: 50,
        done: false,
      },
      [{ message: "Cached: example.com. NS (TTL 172800 s)", tone: "info" }],
    ),
    step(
      s,
      "Ask the authoritative server",
      "Finally the resolver asks the server that actually holds the example.com zone.",
      {
        message: { from: "resolver", to: "auth", kind: "query", label: "A shop.example.com?" },
        involved: ["browser", "stub", "resolver", "root", "tld", "auth"],
        resolverCache: [COM_NS, EXAMPLE_NS],
        elapsedMs: 65,
        done: false,
      },
    ),
    step(
      s,
      "The authoritative answer",
      "The authoritative server answers with the A record: 203.0.113.10, valid for 300 seconds (its TTL). This answer is authoritative — it comes from the zone's owner.",
      {
        message: { from: "auth", to: "resolver", kind: "answer", label: "A 203.0.113.10, TTL 300" },
        involved: ["browser", "stub", "resolver", "root", "tld", "auth"],
        resolverCache: [COM_NS, EXAMPLE_NS, SHOP_A],
        elapsedMs: 80,
        done: false,
      },
      [{ message: "Cached: shop.example.com. A (TTL 300 s)", tone: "info" }],
    ),
    step(
      s,
      "Answer back to the stub",
      "The resolver returns the answer to the stub, which may cache it too, and hands the address to the browser. Total time is dominated by the three round trips the resolver made.",
      {
        message: { from: "resolver", to: "stub", kind: "answer", label: "A 203.0.113.10, TTL 300" },
        involved: ["browser", "stub", "resolver", "root", "tld", "auth"],
        resolverCache: [COM_NS, EXAMPLE_NS, SHOP_A],
        elapsedMs: 85,
        done: false,
      },
    ),
    step(
      s,
      "The browser connects",
      "With 203.0.113.10 in hand, the browser opens a TCP connection and starts the TLS handshake. DNS is done for this name until the TTL expires.",
      {
        message: { from: "stub", to: "browser", kind: "answer", label: "203.0.113.10" },
        involved: ["browser", "stub", "resolver", "root", "tld", "auth"],
        resolverCache: [COM_NS, EXAMPLE_NS, SHOP_A],
        elapsedMs: 85,
        done: true,
      },
      [
        {
          message: "Resolved in ~85 ms (illustrative), contacting 3 name servers",
          tone: "success",
        },
      ],
    ),
  ];
}

function warmSteps(): Step[] {
  const s = "warm" as const;
  const cache = [COM_NS, EXAMPLE_NS, { ...SHOP_A, ttl: 247 }];
  return [
    step(
      s,
      "Another lookup, 53 seconds later",
      "A different device on the same network asks for shop.example.com. Its own stub cache is empty.",
      {
        message: { from: "browser", to: "stub", kind: "query", label: "shop.example.com?" },
        involved: ["browser", "stub"],
        resolverCache: cache,
        elapsedMs: 0,
        done: false,
      },
    ),
    step(s, "Ask the recursive resolver", "The stub asks the same recursive resolver as before.", {
      message: { from: "stub", to: "resolver", kind: "query", label: "A shop.example.com?" },
      involved: ["browser", "stub", "resolver"],
      resolverCache: cache,
      elapsedMs: 5,
      done: false,
    }),
    step(
      s,
      "Cache hit",
      "The resolver still has the answer cached, with 247 of its 300 seconds left. It answers immediately — no root, TLD or authoritative servers are contacted — and passes on the remaining TTL.",
      {
        message: { from: "resolver", to: "stub", kind: "answer", label: "A 203.0.113.10, TTL 247" },
        involved: ["browser", "stub", "resolver"],
        resolverCache: cache,
        elapsedMs: 10,
        done: false,
      },
      [{ message: "Resolver cache hit (TTL 247 s remaining)", tone: "success" }],
    ),
    step(
      s,
      "The browser connects",
      "Resolution took one short round trip instead of four. This is why most DNS lookups are fast — and why DNS changes take time to be seen: caches keep old answers until their TTL runs out.",
      {
        message: { from: "stub", to: "browser", kind: "answer", label: "203.0.113.10" },
        involved: ["browser", "stub", "resolver"],
        resolverCache: cache,
        elapsedMs: 10,
        done: true,
      },
      [{ message: "Resolved in ~10 ms (illustrative) from cache", tone: "success" }],
    ),
  ];
}

function siblingSteps(): Step[] {
  const s = "sibling" as const;
  const cache = [COM_NS, EXAMPLE_NS, SHOP_A];
  return [
    step(
      s,
      "A new name in the same domain",
      "Now the page needs api.example.com. That exact name isn't cached anywhere yet.",
      {
        message: { from: "browser", to: "stub", kind: "query", label: "api.example.com?" },
        involved: ["browser", "stub"],
        resolverCache: cache,
        elapsedMs: 0,
        done: false,
      },
    ),
    step(s, "Ask the recursive resolver", "The stub asks the recursive resolver.", {
      message: { from: "stub", to: "resolver", kind: "query", label: "A api.example.com?" },
      involved: ["browser", "stub", "resolver"],
      resolverCache: cache,
      elapsedMs: 5,
      done: false,
    }),
    step(
      s,
      "Skip straight to the authoritative server",
      "The resolver has no answer for api.example.com, but it still has example.com's name servers cached from the earlier lookup. It skips the root and .com servers entirely.",
      {
        message: { from: "resolver", to: "auth", kind: "query", label: "A api.example.com?" },
        involved: ["browser", "stub", "resolver", "auth"],
        resolverCache: cache,
        elapsedMs: 20,
        done: false,
      },
      [{ message: "Used cached example.com. NS — root and .com skipped", tone: "info" }],
    ),
    step(
      s,
      "The authoritative answer",
      "One round trip to the authoritative server gets the answer, which the resolver caches.",
      {
        message: { from: "auth", to: "resolver", kind: "answer", label: "A 203.0.113.20, TTL 300" },
        involved: ["browser", "stub", "resolver", "auth"],
        resolverCache: [...cache, API_A],
        elapsedMs: 35,
        done: false,
      },
    ),
    step(
      s,
      "Done",
      "Caching the referrals, not just final answers, is what keeps the root and TLD servers from seeing every lookup on the internet.",
      {
        message: { from: "resolver", to: "stub", kind: "answer", label: "A 203.0.113.20, TTL 300" },
        involved: ["browser", "stub", "resolver", "auth"],
        resolverCache: [...cache, API_A],
        elapsedMs: 40,
        done: true,
      },
      [{ message: "Resolved in ~40 ms (illustrative) with one name server", tone: "success" }],
    ),
  ];
}

export function dnsSteps(scenario: Scenario): Step[] {
  return scenario === "cold" ? coldSteps() : scenario === "warm" ? warmSteps() : siblingSteps();
}

export const dnsFrames = (scenario: Scenario) => walkthroughFrames(dnsSteps(scenario));
