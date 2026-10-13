// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { InterviewHub } from "@/components/interview/interview-hub";
import type { InterviewEntry } from "@/lib/content/catalog";
import { interviewItemSchema } from "@/lib/content/schema";

function entry(
  id: string,
  level: "junior" | "mid" | "senior",
  kind: "concept" | "debugging",
  domain: "system-design" | "ai",
): InterviewEntry {
  return {
    item: interviewItemSchema.parse({
      id,
      question: `Question ${id}?`,
      level,
      kind,
      answer: `A model answer for ${id} that is comfortably longer than the eighty character minimum.`,
      rubric: {
        core: [`First core point for ${id}`, `Second core point for ${id}`],
        strong: [`A strong signal for ${id}`],
        redFlags: [`A red flag for ${id}`],
      },
    }),
    lesson: {
      id: `${domain}/fixture`,
      title: `Lesson for ${id}`,
      domain,
      domainTitle: domain === "ai" ? "AI Engineering" : "System Design",
    },
  };
}

const entries = [
  entry("alpha", "junior", "concept", "system-design"),
  entry("beta", "senior", "debugging", "system-design"),
  entry("gamma", "mid", "concept", "ai"),
];

describe("InterviewHub", () => {
  it("filters by domain, level and kind and announces the count", async () => {
    const user = userEvent.setup();
    render(<InterviewHub entries={entries} />);
    expect(screen.getByText("3 questions")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Domain"), "system-design");
    expect(screen.getByText("2 of 3 questions")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Kind"), "debugging");
    expect(screen.getByText("1 of 3 questions")).toBeInTheDocument();
    expect(screen.getByText("Question beta?")).toBeInTheDocument();
    expect(screen.queryByText("Question alpha?")).toBeNull();

    await user.selectOptions(screen.getByLabelText("Level"), "junior");
    expect(screen.getByText("0 of 3 questions")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Random question" })).toBeDisabled();
  });

  it("practises a question and grades it with the published rule", async () => {
    const user = userEvent.setup();
    render(<InterviewHub entries={entries} />);

    await user.click(screen.getByText("Question alpha?"));
    await user.click(screen.getAllByRole("button", { name: "Practise this question" })[0]!);
    const panel = screen.getByRole("region", { name: "Question alpha?" });
    expect(within(panel).getByRole("heading", { name: "Question alpha?" })).toHaveFocus();

    await user.type(within(panel).getByLabelText("Your answer"), "It spreads load.");
    expect(within(panel).queryByText("First core point for alpha")).toBeNull();
    await user.click(within(panel).getByRole("button", { name: "Grade my answer" }));

    const verdict = () => within(panel).getByText(/^Verdict:/).textContent;
    expect(verdict()).toMatch(/Not there yet/);
    await user.click(within(panel).getByLabelText("First core point for alpha"));
    expect(verdict()).toMatch(/Partly there/);
    await user.click(within(panel).getByLabelText("Second core point for alpha"));
    expect(verdict()).toMatch(/Solid/);
    await user.click(within(panel).getByLabelText("A strong signal for alpha"));
    expect(verdict()).toMatch(/Strong/);
    await user.click(within(panel).getByLabelText("A red flag for alpha"));
    expect(verdict()).toMatch(/Partly there/);
    expect(
      within(panel).getByText(/2 of 2 core points, 1 strong signal, 1 red flag/),
    ).toBeVisible();
    expect(within(panel).getByText(/A model answer for alpha/)).toBeVisible();
  });

  it("moves to another question and clears the previous answer", async () => {
    const user = userEvent.setup();
    render(<InterviewHub entries={entries} />);
    await user.click(screen.getByRole("button", { name: "Random question" }));
    const first = screen.getByRole("heading", { level: 2, name: /^Question/ }).textContent;
    await user.type(screen.getByLabelText("Your answer"), "draft");

    await user.click(screen.getByRole("button", { name: "Another question" }));
    const second = screen.getByRole("heading", { level: 2, name: /^Question/ }).textContent;
    expect(second).not.toBe(first);
    expect(screen.getByLabelText("Your answer")).toHaveValue("");
  });
});
