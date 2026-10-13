"use client";

import { useId, useState } from "react";
import {
  CHANGES,
  getChange,
  MODULES,
  OPTIONAL,
  summarise,
  type ChangeId,
  type Module,
  type ModuleKind,
  type Style,
} from "@/lib/architecture/change-impact";
import { cn } from "@/lib/utils/cn";
import { SegmentedControl } from "../../player/controls";
import { ExplorerFrame } from "../../player/explorer-frame";

export const HEXAGONAL_ASSUMPTIONS = [
  "One small ordering application, built two ways. The layered version is how such code commonly grows: the business layer calls data access and the email client directly and uses the ORM's entities as its model.",
  "A disciplined layered design can avoid some of these effects. The comparison is about which way dependencies point, which hexagonal architecture makes an explicit rule.",
  "Wiring — the place that decides which adapter to plug into each port — changes in the hexagonal version whenever an adapter is swapped; it isn't counted as a module here.",
];

type Status = "edited" | "added" | "absent" | "unchanged";

function statusOf(style: Style, id: string, edited: string[], added: string[]): Status {
  if (added.includes(id)) return "added";
  if (edited.includes(id)) return "edited";
  if (OPTIONAL[style].includes(id)) return "absent";
  return "unchanged";
}

const STATUS_LABEL: Record<Status, string> = {
  edited: "edited",
  added: "new",
  absent: "not built yet",
  unchanged: "",
};

function ModuleBox({ module, status }: { module: Module; status: Status }) {
  return (
    <li
      className={cn(
        "rounded-md border px-3 py-2 text-sm",
        status === "edited" && "border-warn bg-warn/10",
        status === "added" && "border-data bg-data/10",
        status === "absent" && "border-dashed border-border text-fg-subtle",
        status === "unchanged" && "border-border bg-surface",
      )}
    >
      <span className="block">{module.name}</span>
      {status !== "unchanged" && (
        <span
          className={cn(
            "font-mono text-[11px]",
            status === "edited" && "text-warn",
            status === "added" && "text-data",
            status === "absent" && "text-fg-subtle",
          )}
        >
          {STATUS_LABEL[status]}
        </span>
      )}
    </li>
  );
}

const GROUPS: Record<Style, { title: string; kinds: ModuleKind[]; ids?: string[] }[]> = {
  layered: [
    { title: "Presentation", kinds: ["layer"], ids: ["http-controllers", "cli"] },
    {
      title: "Business logic",
      kinds: ["layer"],
      ids: ["order-service", "pricing-rules", "orm-entities"],
    },
    {
      title: "Data access and infrastructure",
      kinds: ["layer"],
      ids: ["order-dao", "email-client"],
    },
    { title: "Tests", kinds: ["test"] },
  ],
  hexagonal: [
    { title: "Driving adapters (who calls the app)", kinds: ["driving-adapter"] },
    { title: "Core: use cases, rules and the ports they define", kinds: ["core", "port"] },
    { title: "Driven adapters (what the app calls)", kinds: ["driven-adapter"] },
    { title: "Tests", kinds: ["test"] },
  ],
};

export function HexagonalExplorer() {
  const [style, setStyle] = useState<Style>("hexagonal");
  const [changeId, setChangeId] = useState<ChangeId>("switch-database");
  const changeName = useId();
  const change = getChange(changeId);
  const impact = change.impact[style];
  const both = (["layered", "hexagonal"] as const).map((s) => ({
    style: s,
    ...summarise(s, change.impact[s]),
  }));

  return (
    <ExplorerFrame
      title="Change impact: layered versus hexagonal"
      assumptions={HEXAGONAL_ASSUMPTIONS}
    >
      <div className="grid gap-6 px-4 py-4 lg:grid-cols-[16rem_1fr]">
        <fieldset className="space-y-2">
          <legend className="mb-1.5 text-xs font-medium text-fg-muted">The change</legend>
          {CHANGES.map((c) => (
            <label
              key={c.id}
              className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface has-[:checked]:bg-accent-soft"
            >
              <input
                type="radio"
                name={changeName}
                value={c.id}
                checked={c.id === changeId}
                onChange={() => setChangeId(c.id)}
                className="mt-1 accent-[var(--accent)]"
              />
              {c.title}
            </label>
          ))}
        </fieldset>

        <div className="min-w-0 space-y-4">
          <SegmentedControl<Style>
            label="Architecture"
            value={style}
            options={[
              { value: "layered", label: "Layered" },
              { value: "hexagonal", label: "Hexagonal (ports and adapters)" },
            ]}
            onChange={setStyle}
          />

          <div className="space-y-3">
            {GROUPS[style].map((group) => {
              const modules = MODULES[style].filter(
                (m) => group.kinds.includes(m.kind) && (!group.ids || group.ids.includes(m.id)),
              );
              return (
                <section key={group.title} aria-label={group.title} className="space-y-1.5">
                  <p className="font-mono text-[11px] tracking-wide text-fg-subtle uppercase">
                    {group.title}
                  </p>
                  <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {modules.map((m) => (
                      <ModuleBox
                        key={m.id}
                        module={m}
                        status={statusOf(style, m.id, impact.edited, impact.added)}
                      />
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>

          <p className="text-sm text-fg-muted" aria-live="polite">
            {impact.explanation}
          </p>

          <div
            className="relative overflow-x-auto"
            tabIndex={0}
            role="region"
            aria-label="Impact of this change in each architecture"
          >
            <table className="w-full min-w-[30rem] text-left text-sm">
              <thead className="text-xs text-fg-subtle">
                <tr>
                  <th scope="col" className="py-1 pr-3 font-medium">
                    {change.title}
                  </th>
                  <th scope="col" className="py-1 pr-3 font-medium">
                    Edited
                  </th>
                  <th scope="col" className="py-1 pr-3 font-medium">
                    New
                  </th>
                  <th scope="col" className="py-1 pr-3 font-medium">
                    Business core edited
                  </th>
                  <th scope="col" className="py-1 font-medium">
                    Tests need a database or server
                  </th>
                </tr>
              </thead>
              <tbody>
                {both.map((row) => (
                  <tr key={row.style} className="border-t border-border">
                    <th scope="row" className="py-1.5 pr-3 font-normal capitalize">
                      {row.style}
                    </th>
                    <td className="py-1.5 pr-3 font-mono">{row.edited}</td>
                    <td className="py-1.5 pr-3 font-mono">{row.added}</td>
                    <td className={cn("py-1.5 pr-3", row.coreTouched && "text-warn")}>
                      {row.coreTouched ? "yes" : "no"}
                    </td>
                    <td className={cn("py-1.5", row.testsNeedInfrastructure && "text-warn")}>
                      {row.testsNeedInfrastructure ? "yes" : "no"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ExplorerFrame>
  );
}
