type Server = { label: string; y: number; healthy: boolean };

const SERVERS: Server[] = [
  { label: "app-1", y: 50, healthy: true },
  { label: "app-2", y: 140, healthy: true },
  { label: "app-3", y: 230, healthy: false },
];

/**
 * Static overview of a load balancer in front of three servers, one of which has failed its
 * health checks. State is encoded with shape, line style and text — never color alone.
 * The interactive simulation of the same system replaces this in the visualization engine phase.
 */
export function LoadBalancerDiagram({
  caption = true,
  id = "lb-diagram",
}: {
  caption?: boolean;
  /** Prefix for SVG ids; pass a distinct value if rendering more than once per page. */
  id?: string;
}) {
  const titleId = `${id}-title`;
  const descId = `${id}-desc`;

  return (
    <figure className="not-prose my-8">
      <div className="overflow-hidden rounded-xl border border-border bg-blueprint">
        <svg
          viewBox="0 0 640 280"
          role="img"
          aria-labelledby={`${titleId} ${descId}`}
          className="block h-auto w-full font-mono"
        >
          <title id={titleId}>Load balancer distributing requests across three servers</title>
          <desc id={descId}>
            Clients send requests to a single load balancer. It forwards them to app-1 and app-2,
            which are healthy. app-3 has failed its health checks, so the load balancer sends it no
            traffic while continuing to probe it.
          </desc>
          <defs>
            <marker
              id={`${id}-arrow`}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" className="fill-accent" />
            </marker>
          </defs>

          {/* Client → load balancer */}
          <line
            x1="132"
            y1="140"
            x2="250"
            y2="140"
            className="stroke-accent"
            strokeWidth="2"
            markerEnd={`url(#${id}-arrow)`}
          />
          <text x="191" y="128" textAnchor="middle" className="fill-fg-subtle text-[11px]">
            requests
          </text>

          {/* Load balancer → servers */}
          {SERVERS.map((s) =>
            s.healthy ? (
              <path
                key={s.label}
                d={`M 362 140 C 410 140, 420 ${s.y}, 478 ${s.y}`}
                fill="none"
                className="stroke-accent"
                strokeWidth="2"
                markerEnd={`url(#${id}-arrow)`}
              />
            ) : (
              <path
                key={s.label}
                d={`M 362 140 C 410 140, 420 ${s.y}, 478 ${s.y}`}
                fill="none"
                className="stroke-fg-subtle"
                strokeWidth="1.5"
                strokeDasharray="2 5"
                strokeLinecap="round"
              />
            ),
          )}
          <text x="420" y="268" textAnchor="middle" className="fill-fg-subtle text-[11px]">
            health checks only
          </text>

          {/* Client */}
          <g>
            <rect
              x="20"
              y="110"
              width="112"
              height="60"
              rx="8"
              className="fill-surface-2 stroke-border-strong"
              strokeWidth="1"
            />
            <text x="76" y="137" textAnchor="middle" className="fill-fg text-[13px]">
              clients
            </text>
            <text x="76" y="155" textAnchor="middle" className="fill-fg-subtle text-[11px]">
              browsers, apps
            </text>
          </g>

          {/* Load balancer */}
          <g>
            <rect
              x="252"
              y="100"
              width="110"
              height="80"
              rx="10"
              className="fill-surface-2 stroke-accent"
              strokeWidth="1.5"
            />
            <text x="307" y="136" textAnchor="middle" className="fill-fg text-[13px] font-medium">
              load
            </text>
            <text x="307" y="153" textAnchor="middle" className="fill-fg text-[13px] font-medium">
              balancer
            </text>
          </g>

          {/* Servers */}
          {SERVERS.map((s) => (
            <g key={s.label}>
              <rect
                x="480"
                y={s.y - 26}
                width="140"
                height="52"
                rx="8"
                className={
                  s.healthy ? "fill-surface-2 stroke-border-strong" : "fill-surface stroke-fail"
                }
                strokeWidth={s.healthy ? 1 : 1.5}
                strokeDasharray={s.healthy ? undefined : "5 4"}
              />
              <text x="500" y={s.y - 3} className="fill-fg text-[13px]">
                {s.label}
              </text>
              <text
                x="500"
                y={s.y + 14}
                className={s.healthy ? "fill-ok text-[11px]" : "fill-fail text-[11px]"}
              >
                {s.healthy ? "✓ healthy" : "✕ unhealthy"}
              </text>
            </g>
          ))}
        </svg>
      </div>
      {caption && (
        <figcaption className="mt-3 text-sm text-fg-subtle">
          A load balancer is the single entry point. Healthy servers share the traffic; a server
          that fails its health checks stops receiving requests but keeps being probed so it can
          return.
        </figcaption>
      )}
    </figure>
  );
}
