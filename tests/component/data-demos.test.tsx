// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReplicationSimulation } from "@/components/visualizations/scenes/replication/replication-simulation";
import { ShardingExplorer } from "@/components/visualizations/scenes/sharding/sharding-explorer";

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

describe("ShardingExplorer", () => {
  it("reports how many keys an added node moved", async () => {
    const user = userEvent.setup();
    render(<ShardingExplorer />);
    expect(
      screen.getByText("Add or remove a node to see how many keys have to move."),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add a node" }));
    expect(screen.getByText(/^Going from 4 to 5 nodes moved \d+ of 600 keys/)).toBeInTheDocument();
    expect(screen.getByText(/\(even split: 20%\)/)).toBeInTheDocument();
    const rows = screen.getByRole("region", { name: "Keys and requests per node" });
    expect(within(rows).getByText("node-e")).toBeInTheDocument();
  });

  it("marks the node that owns the hot key", async () => {
    const user = userEvent.setup();
    render(<ShardingExplorer />);
    await user.click(screen.getByRole("radio", { name: "One hot key" }));
    expect(screen.getAllByText(/★ hot/)).toHaveLength(1);
  });
});

describe("ReplicationSimulation", () => {
  it("crashes the leader and shows failover", async () => {
    const user = userEvent.setup();
    render(<ReplicationSimulation />);
    await user.click(screen.getByRole("button", { name: "Crash the leader" }));
    expect(screen.getByText(/db-1 \(the leader\) crashed/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crash the leader" })).toBeDisabled();
  });

  it("offers to speed a slowed follower back up", async () => {
    const user = userEvent.setup();
    render(<ReplicationSimulation />);
    await user.click(screen.getByRole("button", { name: "Slow down db-3" }));
    expect(screen.getByRole("button", { name: "Speed db-3 back up" })).toBeInTheDocument();
  });
});
