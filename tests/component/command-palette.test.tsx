// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import CommandPalette from "@/components/search/command-palette";
import type { SearchDoc } from "@/lib/search/search";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

beforeAll(() => {
  // jsdom has no modal dialogs yet.
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});
beforeEach(() => push.mockReset());

const doc = (title: string, href: string, kind: SearchDoc["kind"] = "lesson"): SearchDoc => ({
  kind,
  title,
  href,
  summary: "",
  context: "System Design",
  aliases: [],
  keywords: [],
  body: "",
});
const docs = [
  doc("How load balancing works", "/system-design/load-balancing/"),
  doc("Caching: hits, eviction and stale data", "/system-design/caching/"),
  doc("Load balancer simulator", "/playground/load-balancer/", "demo"),
];

describe("CommandPalette", () => {
  it("shows matching results and opens the highlighted one with Enter", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<CommandPalette docs={docs} onClose={onClose} />);
    const box = screen.getByRole("combobox", { name: "Search" });
    expect(box).toHaveFocus();
    await user.type(box, "load bal");
    const options = screen.getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([
      expect.stringContaining("How load balancing works"),
      expect.stringContaining("Load balancer simulator"),
    ]);
    expect(options[0]).toHaveAttribute("aria-selected", "true");
    expect(box).toHaveAttribute("aria-activedescendant", options[0]!.id);

    await user.keyboard("{ArrowDown}");
    expect(options[1]).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{Enter}");
    expect(push).toHaveBeenCalledWith("/playground/load-balancer/");
    expect(onClose).toHaveBeenCalled();
  });

  it("falls back to the full search page when nothing matches", async () => {
    const user = userEvent.setup();
    render(<CommandPalette docs={docs} onClose={vi.fn()} />);
    await user.type(screen.getByRole("combobox", { name: "Search" }), "zebra{Enter}");
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(push).toHaveBeenCalledWith("/search/?q=zebra");
  });

  it("explains what to do before anything is typed", () => {
    render(<CommandPalette docs={docs} onClose={vi.fn()} />);
    expect(screen.getByRole("status")).toHaveTextContent(/Type to search lessons/);
  });
});
