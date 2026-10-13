"use client";

import { useMemo, useState } from "react";
import { dnsFrames, dnsSteps, type Scenario } from "@/lib/simulation/models/dns";
import { SegmentedControl, Stat } from "../../player/controls";
import { SimulationPlayer } from "../../player/simulation-player";
import { usePlayback } from "../../player/use-playback";
import { DnsScene } from "./dns-scene";

export const DNS_ASSUMPTIONS = [
  "Uses names and addresses reserved for documentation (example.com, 203.0.113.0/24, 198.51.100.0/24).",
  "One recursive resolver; no DNSSEC validation, CNAME chains, IPv6 (AAAA) lookups or retries.",
  "Latencies are illustrative; real ones depend on distance and how busy each server is.",
  "TTLs shown are typical values, not those of any real domain.",
];

export function DnsWalkthrough() {
  const [scenario, setScenario] = useState<Scenario>("cold");
  const frames = useMemo(() => dnsFrames(scenario), [scenario]);
  const steps = useMemo(() => dnsSteps(scenario), [scenario]);
  const playback = usePlayback({ frameCount: frames.length, frameMs: 2000 });
  const state = frames[Math.min(playback.frame, frames.length - 1)]!.state;

  return (
    <SimulationPlayer
      kind="walkthrough"
      title="DNS resolution"
      description="Step-by-step messages between a browser, the operating system's stub resolver, a recursive resolver, and the root, .com and example.com name servers, with the resolver's cache shown alongside."
      frames={frames}
      playback={playback}
      aspectRatio="760 / 380"
      scene={(f) => <DnsScene state={f.state} />}
      positionLabel={(f) => `Step ${f.index + 1} of ${frames.length}`}
      eventTime={(at) => `#${at + 1}`}
      assumptions={DNS_ASSUMPTIONS}
      stepTitles={steps.map((s) => s.title)}
      stats={(f) => (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
          <Stat label="Time so far (illustrative)" value={`${f.state.elapsedMs} ms`} />
          <Stat
            label="Name servers contacted"
            value={
              f.state.involved.filter((p) => p === "root" || p === "tld" || p === "auth").length
            }
          />
          <Stat label="Resolver cache entries" value={f.state.resolverCache.length} />
        </dl>
      )}
      controls={
        <div className="space-y-4">
          <SegmentedControl<Scenario>
            label="Scenario"
            value={scenario}
            options={[
              { value: "cold", label: "First lookup (empty cache)" },
              { value: "warm", label: "Repeat lookup" },
              { value: "sibling", label: "Another name, same domain" },
            ]}
            onChange={(next) => {
              setScenario(next);
              playback.pause();
              playback.seek(0);
            }}
          />
          <div
            className="relative overflow-x-auto"
            tabIndex={0}
            role="region"
            aria-label="Resolver cache"
          >
            <table className="w-full min-w-[30rem] font-mono text-xs">
              <caption className="mb-2 text-left font-sans text-xs font-medium text-fg-muted">
                Recursive resolver cache
              </caption>
              <thead>
                <tr className="text-left text-fg-subtle">
                  <th scope="col" className="py-1 pr-3 font-normal">
                    Name
                  </th>
                  <th scope="col" className="py-1 pr-3 font-normal">
                    Type
                  </th>
                  <th scope="col" className="py-1 pr-3 font-normal">
                    Value
                  </th>
                  <th scope="col" className="py-1 font-normal">
                    TTL (s)
                  </th>
                </tr>
              </thead>
              <tbody>
                {state.resolverCache.length === 0 ? (
                  <tr className="border-t border-border">
                    <td colSpan={4} className="py-1.5 font-sans text-fg-subtle">
                      Empty
                    </td>
                  </tr>
                ) : (
                  state.resolverCache.map((e) => (
                    <tr key={`${e.name}-${e.type}`} className="border-t border-border">
                      <td className="py-1 pr-3">{e.name}</td>
                      <td className="py-1 pr-3">{e.type}</td>
                      <td className="py-1 pr-3">{e.value}</td>
                      <td className="py-1">{e.ttl}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      }
    />
  );
}
