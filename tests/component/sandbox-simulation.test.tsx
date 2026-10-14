// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SandboxSimulation } from "@/components/visualizations/scenes/sandbox/sandbox-simulation";

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
});

afterEach(() => window.history.replaceState(null, "", "/"));

const result = () => screen.getByText(/^Load test result for this design:/);

describe("SandboxSimulation", () => {
  it("starts in free play with no goals and an accessible component table", async () => {
    const user = userEvent.setup();
    render(<SandboxSimulation />);
    expect(screen.getByRole("heading", { name: "Free play" })).toBeInTheDocument();
    expect(screen.queryByText(/^Load test result/)).toBeNull();
    expect(screen.getByText("Cost of this design: 3 units")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next step" }));
    const table = screen.getByRole("region", { name: "Load on each component" });
    expect(table).toHaveTextContent("App servers (bottleneck)");
    expect(table).toHaveTextContent("1,000/s");
  });

  it("grades a challenge, and re-grades as the design changes", async () => {
    const user = userEvent.setup();
    render(<SandboxSimulation />);
    await user.selectOptions(screen.getByLabelText("Scenario"), "checkout-surge");
    expect(screen.getByRole("heading", { name: "Checkout surge" })).toBeInTheDocument();
    expect(result()).toHaveTextContent("goals missed");
    // Free-play traffic controls are hidden: the challenge fixes the traffic.
    expect(screen.queryByRole("group", { name: "Traffic" })).toBeNull();

    await user.selectOptions(screen.getByLabelText("Read replicas"), "1");
    await user.click(screen.getByRole("switch", { name: /Write queue/ }));
    await user.selectOptions(screen.getByLabelText("Queue workers"), "5");
    expect(result()).toHaveTextContent("all goals met");
    expect(screen.getByText("Cost of this design: 10 units")).toBeInTheDocument();
  });

  it("injects failures at the current second and can restart the run", async () => {
    const user = userEvent.setup();
    render(<SandboxSimulation />);
    await user.click(screen.getByRole("button", { name: "Fail an app server" }));
    expect(screen.getByText(/An app server failed — 1 of 2 left/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Replace failed servers" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Restart run" }));
    expect(screen.getByText("0 s")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Replace failed servers" })).toBeDisabled();
  });

  it("opens the scenario, design and failures in a shared link", () => {
    window.history.replaceState(
      null,
      "",
      "/playground/system-design-sandbox/?scenario=read-heavy-catalogue&app=10&cache=95&failures=3f",
    );
    render(<SandboxSimulation />);
    expect(screen.getByRole("heading", { name: "Read-heavy catalogue" })).toBeInTheDocument();
    expect(screen.getByLabelText("App servers")).toHaveValue("10");
    expect(screen.getByRole("switch", { name: /Cache/ })).toBeChecked();
    // The passing design misses a goal only because the link also fails a server at 3 s.
    expect(result()).toHaveTextContent("1 of 3 goals missed");
    expect(screen.getByRole("button", { name: "Restart run" })).toBeEnabled();
  });

  it("copies a link to the current design", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/playground/system-design-sandbox/");
    render(<SandboxSimulation />);
    await user.selectOptions(screen.getByLabelText("Scenario"), "launch-day");
    await user.selectOptions(screen.getByLabelText("App servers"), "7");
    await user.click(screen.getByRole("button", { name: "Copy link to this design" }));

    expect(await screen.findByText(/^Link copied/)).toBeInTheDocument();
    const copied = await navigator.clipboard.readText();
    expect(copied).toBe(
      `${window.location.origin}/playground/system-design-sandbox/?scenario=launch-day&app=7&replicas=0&cache=off&queue=off`,
    );
    expect(window.location.href).toBe(copied);
  });

  it("shows the link when the clipboard is unavailable", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));
    render(<SandboxSimulation />);
    await user.click(screen.getByRole("button", { name: "Copy link to this design" }));
    const link = await screen.findByLabelText<HTMLInputElement>(/copy this link/);
    expect(link.value).toMatch(/\?scenario=free-play&app=2&.*&traffic=1000&reads=90$/);
  });
});
