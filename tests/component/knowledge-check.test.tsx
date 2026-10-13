// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { KnowledgeCheck } from "@/components/lessons/knowledge-check";
import { quizSchema } from "@/lib/content/schema";

const questions = quizSchema.parse([
  {
    id: "first",
    prompt: "Which colour is the sky on a clear day?",
    options: [
      {
        id: "a",
        text: "Blue",
        correct: true,
        explanation: "Rayleigh scattering favours blue light.",
      },
      { id: "b", text: "Green", explanation: "Green light scatters less than blue." },
    ],
  },
  {
    id: "second",
    prompt: "How many sides does a triangle have?",
    options: [
      { id: "a", text: "Three", correct: true, explanation: "Tri- means three." },
      { id: "b", text: "Four", explanation: "That is a quadrilateral." },
    ],
  },
  {
    id: "third",
    prompt: "Which is a prime number here?",
    options: [
      { id: "a", text: "Seven", correct: true, explanation: "Only divisible by one and itself." },
      { id: "b", text: "Nine", explanation: "Nine is three times three." },
    ],
  },
]);

const group = (name: RegExp) => screen.getByRole("group", { name });

describe("KnowledgeCheck", () => {
  it("disables checking until an answer is chosen", async () => {
    const user = userEvent.setup();
    render(<KnowledgeCheck questions={questions} />);
    const first = group(/Question 1/);
    const check = within(first).getByRole("button", { name: "Check answer" });
    expect(check).toBeDisabled();
    await user.click(within(first).getByRole("radio", { name: /Green/ }));
    expect(check).toBeEnabled();
  });

  it("explains every option after a wrong answer and can be retried", async () => {
    const user = userEvent.setup();
    render(<KnowledgeCheck questions={questions} />);
    const first = group(/Question 1/);
    await user.click(within(first).getByRole("radio", { name: /Green/ }));
    await user.click(within(first).getByRole("button", { name: "Check answer" }));
    expect(within(first).getByRole("status")).toHaveTextContent("Not quite");
    expect(within(first).getByText("Rayleigh scattering favours blue light.")).toBeInTheDocument();
    expect(within(first).getByText("Green light scatters less than blue.")).toBeInTheDocument();
    expect(within(first).getByText("correct answer")).toBeInTheDocument();
    expect(within(first).getByText("your answer")).toBeInTheDocument();
    for (const radio of within(first).getAllByRole("radio")) expect(radio).toBeDisabled();

    await user.click(within(first).getByRole("button", { name: "Try again" }));
    expect(within(first).getByRole("button", { name: "Check answer" })).toBeDisabled();
  });

  it("keeps a running score", async () => {
    const user = userEvent.setup();
    render(<KnowledgeCheck questions={questions} />);
    expect(screen.getByText("3 questions")).toBeInTheDocument();
    for (const [n, answer] of [
      [1, /Blue/],
      [2, /Four/],
    ] as const) {
      const g = group(new RegExp(`Question ${n}`));
      await user.click(within(g).getByRole("radio", { name: answer }));
      await user.click(within(g).getByRole("button", { name: "Check answer" }));
    }
    expect(screen.getByText("1 of 3 correct")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Start over/ }));
    expect(screen.getByText("3 questions")).toBeInTheDocument();
  });
});
