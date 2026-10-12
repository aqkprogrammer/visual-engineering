/**
 * Generates the README's visual assets and curriculum section from the real project data:
 *
 *   docs/assets/hero-dark.svg, hero-light.svg   animated banner, coloured from app/globals.css
 *   README.md  <!-- curriculum:start --> … <!-- curriculum:end -->   built from content/
 *
 *   pnpm readme           regenerate
 *   pnpm readme --check   exit non-zero if anything is out of date (used in CI)
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { loadCatalog } from "../lib/content/load";
import { oklchToHex, parseOklch } from "../lib/design/contrast";
import { readThemeTokens, type ThemeName } from "../lib/design/tokens";
import { site } from "../lib/site";

const root = (path: string) => fileURLToPath(new URL(`../${path}`, import.meta.url));
const check = process.argv.includes("--check");

// ---------------------------------------------------------------- hero banner

const PERIOD = 12; // seconds per loop
const TRAVEL = 1.6; // seconds for one request to reach its server
const SERVERS = [130, 220, 310] as const; // server centre y positions

type Point = [number, number];

/** Client → load balancer → curve into server `index`, sampled as a polyline. */
function requestPath(index: number): Point[] {
  const y = SERVERS[index]!;
  const p0: Point = [900, 220];
  const p1: Point = [942, 220];
  const p2: Point = [948, y];
  const p3: Point = [982, y];
  const curve = Array.from({ length: 7 }, (_, i): Point => {
    const t = (i + 1) / 7;
    const u = 1 - t;
    return [
      u ** 3 * p0[0] + 3 * u ** 2 * t * p1[0] + 3 * u * t ** 2 * p2[0] + t ** 3 * p3[0],
      u ** 3 * p0[1] + 3 * u ** 2 * t * p1[1] + 3 * u * t ** 2 * p2[1] + t ** 3 * p3[1],
    ];
  });
  return [[722, 220], [780, 220], p0, ...curve];
}

/**
 * The loop: requests go round-robin to all three servers; at the half-way point app-3 fails its
 * health checks and the remaining requests alternate between app-1 and app-2.
 */
function schedule(): { start: number; server: number }[] {
  const before = Array.from({ length: 8 }, (_, i) => ({ start: i * 0.75, server: i % 3 }));
  const after = Array.from({ length: 6 }, (_, i) => ({ start: 6 + i * 0.75, server: i % 2 }));
  return [...before, ...after];
}

const pct = (seconds: number) => `${((seconds / PERIOD) * 100).toFixed(3)}%`;

function packetKeyframes(name: string, start: number, path: Point[]): string {
  const lengths = path.slice(1).map((p, i) => Math.hypot(p[0] - path[i]![0], p[1] - path[i]![1]));
  const total = lengths.reduce((a, b) => a + b, 0);
  const frames: string[] = [];
  const at = ([x, y]: Point, opacity: number) =>
    `transform:translate(${x.toFixed(1)}px,${y.toFixed(1)}px);opacity:${opacity}`;

  frames.push(`0%{${at(path[0]!, 0)}}`);
  if (start > 0) frames.push(`${pct(start - 0.001)}{${at(path[0]!, 0)}}`);
  let elapsed = 0;
  path.forEach((point, i) => {
    if (i > 0) elapsed += lengths[i - 1]!;
    frames.push(`${pct(start + (elapsed / total) * TRAVEL)}{${at(point, 1)}}`);
  });
  const end = path.at(-1)!;
  frames.push(`${pct(start + TRAVEL + 0.01)}{${at(end, 0)}}`, `100%{${at(end, 0)}}`);
  return `@keyframes ${name}{${frames.join("")}}`;
}

function hero(theme: ThemeName): string {
  const tokens = readThemeTokens(theme);
  const c = (name: string) => oklchToHex(parseOklch(tokens[name]!));
  const sans = `-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif`;
  const mono = `ui-monospace,SFMono-Regular,Menlo,Consolas,monospace`;

  const packets = schedule().map((p, i) => ({ ...p, name: `p${i}` }));
  const keyframes = packets.map((p) => packetKeyframes(p.name, p.start, requestPath(p.server)));

  const server = (index: number, label: string) => {
    const y = SERVERS[index]!;
    const box = (stroke: string, dash = "") =>
      `<rect x="982" y="${y - 26}" width="168" height="52" rx="8" fill="${c("surface-2")}" stroke="${stroke}" stroke-width="1.5"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`;
    const text = (status: string, colour: string) =>
      `<text x="1000" y="${y - 3}" class="mono" font-size="14" fill="${c("fg")}">${label}</text><text x="1000" y="${y + 15}" class="mono" font-size="12" fill="${colour}">${status}</text>`;
    if (index < 2) return `<g>${box(c("border-strong"))}${text("✓ healthy", c("ok"))}</g>`;
    return [
      `<g class="ok-state">${box(c("border-strong"))}${text("✓ healthy", c("ok"))}</g>`,
      `<g class="fail-state">${box(c("fail"), "6 4")}${text("✕ unhealthy", c("fail"))}</g>`,
    ].join("");
  };

  const edges = SERVERS.map((y, i) => {
    const edge = `<path d="M900 220 C942 220 948 ${y} 982 ${y}" fill="none" stroke="${c("border-strong")}" stroke-width="1.5"/>`;
    // The failed server keeps only its dashed health-check line.
    return i === 2 ? `<g class="ok-state">${edge}</g>` : edge;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 440" width="1200" height="440" role="img" aria-labelledby="t d">
<title id="t">Visual Engineering — watch it work, change it, break it</title>
<desc id="d">Animated illustration: requests flow from clients through a load balancer to three servers in turn. Halfway through, app-3 fails its health checks and the load balancer reroutes traffic to app-1 and app-2.</desc>
<style>
.sans{font-family:${sans}}.mono{font-family:${mono}}
.pkt{animation-duration:${PERIOD}s;animation-timing-function:linear;animation-iteration-count:infinite;opacity:0}
${packets.map((p) => `.${p.name}{animation-name:${p.name}}`).join("")}
${keyframes.join("\n")}
.ok-state,.status-ok{animation:first-half ${PERIOD}s step-end infinite}
.fail-state,.status-fail{animation:second-half ${PERIOD}s step-end infinite}
@keyframes first-half{0%{opacity:1}50%{opacity:0}}
@keyframes second-half{0%{opacity:0}50%{opacity:1}}
.probe{animation:probe 1.2s linear infinite}
@keyframes probe{to{stroke-dashoffset:-16}}
@media (prefers-reduced-motion:reduce){
.pkt,.probe,.ok-state,.fail-state,.status-ok,.status-fail{animation:none}
.ok-state,.status-ok{opacity:0}.fail-state,.status-fail{opacity:1}
}
</style>
<defs>
<pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="${c("border")}" stroke-width="1" opacity=".55"/></pattern>
</defs>
<rect width="1200" height="440" rx="16" fill="${c("bg")}"/>
<rect x="560" y="40" width="616" height="360" rx="12" fill="${c("surface")}" stroke="${c("border")}"/>
<rect x="560" y="40" width="616" height="360" rx="12" fill="url(#grid)"/>

<text x="48" y="128" class="mono" font-size="14" letter-spacing="1.5" fill="${c("fg-subtle")}">OPEN-SOURCE ENGINEERING LESSONS</text>
<text x="46" y="196" class="sans" font-size="58" font-weight="600" letter-spacing="-1" fill="${c("fg")}">Visual</text>
<text x="46" y="262" class="sans" font-size="58" font-weight="600" letter-spacing="-1" fill="${c("fg-muted")}">Engineering</text>
<text x="48" y="314" class="sans" font-size="22" fill="${c("fg")}">Watch it work. Change it. Break it.</text>
<rect x="48" y="340" width="56" height="3" rx="1.5" fill="${c("accent")}"/>

<path d="M722 220 H780" stroke="${c("accent")}" stroke-width="2"/>
${edges}
<g class="fail-state"><path d="M900 220 C942 220 948 310 982 310" fill="none" stroke="${c("fail")}" stroke-width="1.5" stroke-dasharray="2 6" stroke-linecap="round" class="probe"/></g>

<rect x="584" y="190" width="138" height="60" rx="8" fill="${c("surface-2")}" stroke="${c("border-strong")}"/>
<text x="653" y="216" text-anchor="middle" class="mono" font-size="14" fill="${c("fg")}">clients</text>
<text x="653" y="235" text-anchor="middle" class="mono" font-size="11" fill="${c("fg-subtle")}">browsers, apps</text>

<rect x="780" y="178" width="120" height="84" rx="10" fill="${c("surface-2")}" stroke="${c("accent")}" stroke-width="1.75"/>
<text x="840" y="215" text-anchor="middle" class="mono" font-size="14" font-weight="600" fill="${c("fg")}">load</text>
<text x="840" y="233" text-anchor="middle" class="mono" font-size="14" font-weight="600" fill="${c("fg")}">balancer</text>

${server(0, "app-1")}
${server(1, "app-2")}
${server(2, "app-3")}

${packets.map((p) => `<circle r="5" class="pkt ${p.name}" fill="${c("accent")}"/>`).join("")}

<text x="584" y="376" class="mono status-ok" font-size="13" fill="${c("fg-muted")}">round robin · 3 of 3 servers healthy</text>
<text x="584" y="376" class="mono status-fail" font-size="13" fill="${c("fg-muted")}">app-3 failed health checks → traffic rerouted to app-1 and app-2</text>
<text x="1152" y="68" text-anchor="end" class="mono" font-size="11" fill="${c("fg-subtle")}">illustration</text>
</svg>
`;
}

// ---------------------------------------------------------------- curriculum section

async function curriculum(): Promise<string> {
  const { domains, lessons, issues } = await loadCatalog();
  if (issues.length > 0) throw new Error("Content is invalid — run `pnpm content` for details.");
  const published = lessons.filter((l) => l.status === "published");

  const blocks = domains.map((domain) => {
    const live = published.filter((l) => l.domain === domain.id);
    const planned = domain.modules.reduce((n, m) => n + m.plannedTopics.length, 0);
    const rows = domain.modules.map((mod) => {
      const lessonsHere = live
        .filter((l) => l.module === mod.id)
        .map((l) => `[${l.title}](${site.liveUrl}/${l.id}/)`);
      const topics = mod.plannedTopics.join(" · ") || "—";
      return `| **${mod.title}** | ${lessonsHere.join("<br>") || "—"} | ${topics} |`;
    });
    const badge = live.length > 0 ? `🟢 ${live.length} live` : "⚪ in progress";
    return [
      `<details${live.length > 0 ? " open" : ""}>`,
      `<summary><b>${domain.title}</b> — ${domain.tagline} <sub>${badge} · ${planned} planned</sub></summary>`,
      "",
      "| Module | Live lessons | Planned topics |",
      "|---|---|---|",
      ...rows,
      "",
      "</details>",
    ].join("\n");
  });

  const totalPlanned = domains.reduce(
    (n, d) => n + d.modules.reduce((m, mod) => m + mod.plannedTopics.length, 0),
    0,
  );
  const modules = domains.reduce((n, d) => n + d.modules.length, 0);
  return [
    `**${published.length} live lesson${published.length === 1 ? "" : "s"}** · ${domains.length} domains · ${modules} modules · ${totalPlanned} planned topics. Expand a domain to see what's inside.`,
    "",
    ...blocks,
  ].join("\n");
}

// ---------------------------------------------------------------- write / check

async function main() {
  const outputs = new Map<string, string>([
    [root("docs/assets/hero-dark.svg"), hero("dark")],
    [root("docs/assets/hero-light.svg"), hero("light")],
  ]);

  const readmePath = root("README.md");
  const readme = await readFile(readmePath, "utf8");
  const start = "<!-- curriculum:start -->";
  const end = "<!-- curriculum:end -->";
  const [before, rest] = readme.split(start);
  const after = rest?.split(end)[1];
  if (before === undefined || after === undefined)
    throw new Error("README curriculum markers missing");
  outputs.set(readmePath, `${before}${start}\n${await curriculum()}\n${end}${after}`);

  const stale: string[] = [];
  for (const [path, content] of outputs) {
    const current = await readFile(path, "utf8").catch(() => "");
    if (current === content) continue;
    if (check) stale.push(path);
    else await writeFile(path, content);
  }

  if (check && stale.length > 0) {
    console.error(
      `✖ README assets are out of date — run \`pnpm readme\`:\n  ${stale.join("\n  ")}`,
    );
    process.exit(1);
  }
  console.log(check ? "✓ README assets up to date" : "✓ README assets generated");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
