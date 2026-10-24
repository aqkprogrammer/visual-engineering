// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { KnowledgeMap } from "@/components/map/knowledge-map";
import { layoutMap, type MapLessonInput } from "@/lib/map/layout";
import { PROGRESS_STORAGE_KEY } from "@/lib/progress/progress";

const lessons: MapLessonInput[] = [
  {
    id: "ai/embeddings",
    title: "Embeddings",
    domain: "ai",
    moduleIndex: 0,
    order: 1,
    prerequisites: [],
  },
  {
    id: "ai/how-rag-works",
    title: "How RAG works",
    domain: "ai",
    moduleIndex: 1,
    order: 1,
    prerequisites: ["ai/embeddings"],
  },
  {
    id: "cloud/autoscaling",
    title: "Autoscaling",
    domain: "cloud",
    moduleIndex: 0,
    order: 1,
    prerequisites: [],
  },
];
const layout = layoutMap(
  [
    { id: "ai", title: "AI Engineering" },
    { id: "cloud", title: "Cloud" },
  ],
  lessons,
  [{ slug: "ai-path", title: "AI path", lessons: ["ai/embeddings", "ai/how-rag-works"] }],
);

afterEach(() => window.localStorage.clear());

describe("KnowledgeMap", () => {
  it("links every lesson and describes what it builds on", () => {
    render(<KnowledgeMap layout={layout} lessons={lessons} />);
    const rag = screen.getByRole("link", { name: /^How RAG works/ });
    expect(rag).toHaveAttribute("href", "/ai/how-rag-works/");
    expect(rag).toHaveAccessibleName("How RAG works — builds on Embeddings");
    expect(screen.getByRole("link", { name: /^Embeddings — ready to start/ })).toBeInTheDocument();
    expect(screen.getByText(/0 of 3 lessons completed · 2 ready to start/)).toBeInTheDocument();
  });

  it("marks completed lessons and unlocks the ones that build on them", () => {
    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        lessons: { "ai/embeddings": { completedAt: "2026-10-24T09:00:00Z" } },
      }),
    );
    render(<KnowledgeMap layout={layout} lessons={lessons} />);
    expect(screen.getByRole("link", { name: /^Embeddings — completed/ })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /^How RAG works — ready to start/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/1 of 3 lessons completed · 2 ready to start/)).toBeInTheDocument();
  });

  it("numbers a learning path's lessons when it is selected", async () => {
    const user = userEvent.setup();
    render(<KnowledgeMap layout={layout} lessons={lessons} />);
    await user.click(screen.getByText("AI path"));
    expect(screen.getByText(/AI path: 2 lessons, numbered in order/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /step 2 of AI path$/ })).toHaveAccessibleName(
      /^How RAG works/,
    );
  });
});
