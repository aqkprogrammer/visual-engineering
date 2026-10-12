// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  recentEvents,
  SimulationPlayer,
} from "@/components/visualizations/player/simulation-player";
import { usePlayback } from "@/components/visualizations/player/use-playback";
import { walkthroughFrames } from "@/lib/simulation/run";

const frames = walkthroughFrames([
  {
    title: "One",
    caption: "First step.",
    state: 1,
    events: [{ message: "started", tone: "info" }],
  },
  {
    title: "Two",
    caption: "Second step.",
    state: 2,
    events: [{ message: "warned", tone: "warning" }],
  },
  {
    title: "Three",
    caption: "Third step.",
    state: 3,
    events: [{ message: "failed", tone: "error" }],
  },
]);

function Harness() {
  const playback = usePlayback({ frameCount: frames.length, frameMs: 100 });
  return (
    <SimulationPlayer
      kind="walkthrough"
      title="Test player"
      description="A three-step test walkthrough."
      frames={frames}
      playback={playback}
      scene={(f) => <div data-testid="scene">state {f.state}</div>}
      aspectRatio="2 / 1"
      positionLabel={(f) => `Step ${f.index + 1} of ${frames.length}`}
      eventTime={(at) => `#${at + 1}`}
      assumptions={["Everything is pretend."]}
      stepTitles={["One", "Two", "Three"]}
    />
  );
}

function mockReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: reduce && query.includes("reduce"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

const caption = () => screen.getByText(/step\.$/, { selector: "p[aria-live]" });

describe("SimulationPlayer", () => {
  beforeEach(() => mockReducedMotion(false));

  it("is a labelled region with a text description and starts paused on the first frame", () => {
    render(<Harness />);
    const region = screen.getByRole("region", { name: "Test player" });
    expect(region).toHaveAccessibleDescription("A three-step test walkthrough.");
    expect(caption()).toHaveTextContent("One. First step.");
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous step" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("steps forward and back with buttons and updates the scene, caption and log", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Next step" }));
    expect(screen.getByTestId("scene")).toHaveTextContent("state 2");
    expect(caption()).toHaveTextContent("Two. Second step.");
    expect(screen.getByText("warned")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next step" }));
    expect(screen.getByRole("button", { name: "Next step" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    // Clicking a disabled control does nothing.
    await user.click(screen.getByRole("button", { name: "Next step" }));
    expect(caption()).toHaveTextContent("Three. Third step.");
    expect(screen.getByRole("button", { name: "Replay" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Restart" }));
    expect(caption()).toHaveTextContent("One. First step.");
  });

  it("announces captions politely only while paused", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(caption()).toHaveAttribute("aria-live", "polite");
    await user.click(screen.getByRole("button", { name: "Play" }));
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    expect(caption()).toHaveAttribute("aria-live", "off");
  });

  it("supports keyboard shortcuts inside the player", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const next = screen.getByRole("button", { name: "Next step" });
    next.focus();
    await user.keyboard("{ArrowRight}");
    expect(caption()).toHaveTextContent("Two.");
    await user.keyboard("{ArrowRight}");
    expect(caption()).toHaveTextContent("Three.");
    await user.keyboard("{ArrowLeft}");
    expect(caption()).toHaveTextContent("Two.");
    await user.keyboard("{Home}");
    expect(caption()).toHaveTextContent("One.");
    await user.keyboard("k");
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    await user.keyboard("k");
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
  });

  it("leaves arrow keys to native controls such as the timeline slider", () => {
    render(<Harness />);
    const slider = screen.getByRole("slider", { name: "Timeline" });
    expect(slider).toHaveAttribute("aria-valuetext", "Step 1 of 3: One. First step.");
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    fireEvent.keyDown(slider, { key: "k" });
    // The player's shortcuts ignore keys aimed at the slider, so nothing moved or started.
    expect(caption()).toHaveTextContent("One. First step.");
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
  });

  it("jumps to a step from the step list and marks it current", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: /3\.\s*Three/ }));
    expect(caption()).toHaveTextContent("Three. Third step.");
    expect(screen.getByRole("button", { name: /3\.\s*Three/ })).toHaveAttribute(
      "aria-current",
      "step",
    );
  });

  it("changes speed", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.selectOptions(screen.getByRole("combobox", { name: "Playback speed" }), "2");
    expect(screen.getByRole("combobox", { name: "Playback speed" })).toHaveValue("2");
  });

  it("tweens between frames normally and not at all with reduced motion", () => {
    const { container, unmount } = render(<Harness />);
    const scene = () => container.querySelector<HTMLElement>("[style*='--frame-ms']")!;
    expect(scene().style.getPropertyValue("--frame-ms")).toBe("100ms");
    unmount();
    mockReducedMotion(true);
    const again = render(<Harness />);
    expect(
      again.container
        .querySelector<HTMLElement>("[style*='--frame-ms']")!
        .style.getPropertyValue("--frame-ms"),
    ).toBe("0ms");
  });

  it("lists assumptions as text", () => {
    render(<Harness />);
    const region = screen.getByRole("region", { name: "Test player" });
    expect(within(region).getByText("Everything is pretend.")).toBeInTheDocument();
  });

  it("pauses when the tab is hidden", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Play" }));
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
  });
});

describe("recentEvents", () => {
  it("returns events up to the current frame, newest first, capped", () => {
    expect(recentEvents(frames, 1).map((e) => e.message)).toEqual(["warned", "started"]);
    expect(recentEvents(frames, 2, 2).map((e) => e.message)).toEqual(["failed", "warned"]);
  });
});
