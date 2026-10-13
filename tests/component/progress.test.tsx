// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { KnowledgeCheck } from "@/components/lessons/knowledge-check";
import { CompletionBadge } from "@/components/progress/completion-badge";
import { LessonCompletion } from "@/components/progress/lesson-completion";
import { PathContinue, PathProgress } from "@/components/progress/path-progress";
import { clearProgress } from "@/components/progress/progress-store";
import { ProgressSummary } from "@/components/progress/progress-summary";
import { quizSchema } from "@/lib/content/schema";
import { PROGRESS_STORAGE_KEY } from "@/lib/progress/progress";

const LB = "system-design/load-balancing";
const CACHE = "system-design/caching";

const stored = () => JSON.parse(window.localStorage.getItem(PROGRESS_STORAGE_KEY) ?? "null");

afterEach(() => {
  act(() => clearProgress());
  window.localStorage.clear();
});

describe("LessonCompletion", () => {
  it("toggles completion, saves it, and updates other components on the page", async () => {
    const user = userEvent.setup();
    render(
      <>
        <LessonCompletion lessonId={LB} />
        <CompletionBadge lessonId={LB} />
        <PathProgress lessonIds={[LB, CACHE]} />
      </>,
    );
    const button = screen.getByRole("button", { name: "Mark as complete" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("0 of 2 lessons completed")).toBeInTheDocument();

    await user.click(button);
    expect(screen.getByRole("button", { name: "Completed" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("Completed", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("1 of 2 lessons completed")).toBeInTheDocument();
    expect(stored().lessons[LB].completedAt).toEqual(expect.any(String));

    await user.click(screen.getByRole("button", { name: "Completed" }));
    expect(screen.getByRole("button", { name: "Mark as complete" })).toBeInTheDocument();
    expect(window.localStorage.getItem(PROGRESS_STORAGE_KEY)).toBeNull();
  });

  it("reads progress saved earlier and ignores corrupt data", () => {
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, "{not json");
    const { unmount } = render(<LessonCompletion lessonId={LB} />);
    expect(screen.getByRole("button", { name: "Mark as complete" })).toBeInTheDocument();
    unmount();

    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({ version: 1, lessons: { [LB]: { completedAt: "2026-10-13T09:00:00Z" } } }),
    );
    render(<LessonCompletion lessonId={LB} />);
    expect(screen.getByRole("button", { name: "Completed" })).toBeInTheDocument();
  });
});

describe("PathContinue", () => {
  const steps = [
    { id: LB, title: "Load balancing" },
    { id: CACHE, title: "Caching" },
  ];

  it("starts, continues, and finally offers a review", async () => {
    const user = userEvent.setup();
    render(
      <>
        <PathContinue steps={steps} />
        <LessonCompletion lessonId={LB} />
      </>,
    );
    expect(screen.getByRole("link", { name: /Start: Load balancing/ })).toHaveAttribute(
      "href",
      `/${LB}`,
    );
    await user.click(screen.getByRole("button", { name: "Mark as complete" }));
    expect(screen.getByRole("link", { name: /Continue: Caching/ })).toHaveAttribute(
      "href",
      `/${CACHE}`,
    );
  });
});

describe("KnowledgeCheck progress", () => {
  const questions = quizSchema.parse(
    ["one", "two", "three"].map((id) => ({
      id,
      prompt: `Fixture question ${id}?`,
      options: [
        { id: "a", text: `Right ${id}`, correct: true, explanation: "This one is right." },
        { id: "b", text: `Wrong ${id}`, explanation: "This one is wrong." },
      ],
    })),
  );

  it("records the score once every question is answered", async () => {
    const user = userEvent.setup();
    render(<KnowledgeCheck questions={questions} lessonId={LB} />);
    const answer = async (text: string) => {
      await user.click(screen.getByLabelText(text));
      await user.click(screen.getAllByRole("button", { name: "Check answer" })[0]!);
    };

    await answer("Right one");
    await answer("Wrong two");
    expect(stored()).toBeNull();

    await answer("Right three");
    expect(stored().lessons[LB].quiz).toMatchObject({ best: 2, last: 2, total: 3 });
  });
});

describe("ProgressSummary", () => {
  it("resets progress only after confirmation", async () => {
    const user = userEvent.setup();
    render(
      <>
        <LessonCompletion lessonId={LB} />
        <ProgressSummary lessonIds={[LB, CACHE]} />
      </>,
    );
    expect(screen.queryByRole("button", { name: "Reset progress" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Mark as complete" }));
    expect(screen.getByText(/1 of 2 lessons completed/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reset progress" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText(/1 of 2 lessons completed/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reset progress" }));
    await user.click(screen.getByRole("button", { name: "Yes, reset progress" }));
    expect(screen.getByText(/0 of 2 lessons completed/)).toBeInTheDocument();
    expect(window.localStorage.getItem(PROGRESS_STORAGE_KEY)).toBeNull();
  });
});
