// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SearchView } from "@/components/search/search-view";
import type { SearchDoc } from "@/lib/search/search";

const docs: SearchDoc[] = [
  {
    kind: "lesson",
    title: "Message queues and backpressure",
    href: "/system-design/message-queues",
    summary: "How queues decouple producers from consumers.",
    context: "System Design",
    aliases: [],
    keywords: ["queues"],
    body: "",
  },
  {
    kind: "term",
    title: "Dead-letter queue",
    href: "/glossary/#dead-letter-queue",
    summary: "Where repeatedly failing messages go.",
    context: "Glossary",
    aliases: ["DLQ"],
    keywords: [],
    body: "",
  },
];

afterEach(() => {
  window.history.replaceState(null, "", "/");
  vi.unstubAllGlobals();
});

describe("SearchView", () => {
  it("shows suggestions, then results with a live count, and keeps the query in the URL", async () => {
    const user = userEvent.setup();
    render(<SearchView docs={docs} />);
    expect(
      screen.getByText("2 lessons, paths, demos, incidents, questions and terms to search."),
    ).toBeInTheDocument();

    await user.type(screen.getByRole("searchbox"), "queue");
    expect(screen.getByText("2 results for “queue”.")).toBeInTheDocument();
    expect(window.location.search).toBe("?q=queue");

    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveAttribute("href", "/system-design/message-queues");
    expect(links[0]?.querySelector("mark")).toHaveTextContent("queues");
  });

  it("finds a term by its alias and explains an empty result", async () => {
    const user = userEvent.setup();
    render(<SearchView docs={docs} />);
    await user.type(screen.getByRole("searchbox"), "dlq");
    expect(screen.getByRole("link", { name: /Dead-letter queue/ })).toBeInTheDocument();

    await user.clear(screen.getByRole("searchbox"));
    await user.type(screen.getByRole("searchbox"), "zzqxv");
    expect(screen.getByText("No results for “zzqxv”.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "browse all topics" })).toBeInTheDocument();
  });

  it("restores the query from the URL and applies a suggestion", async () => {
    window.history.replaceState(null, "", "/search/?q=dlq");
    const user = userEvent.setup();
    render(<SearchView docs={docs} />);
    expect(screen.getByRole("searchbox")).toHaveValue("dlq");

    await user.clear(screen.getByRole("searchbox"));
    await act(async () => {
      await user.click(screen.getByRole("button", { name: "idempotency" }));
    });
    expect(screen.getByRole("searchbox")).toHaveValue("idempotency");
  });
});

describe("SearchView fetching its index", () => {
  it("shows a loading message, then searches the fetched index", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(docs) });
    vi.stubGlobal("fetch", fetchMock);
    window.history.replaceState(null, "", "/search/?q=dlq");
    render(<SearchView />);
    expect(screen.getByText("Loading the search index…")).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /Dead-letter queue/ })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/search-index.json");
  });

  it("explains when the index can't be loaded", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    render(<SearchView />);
    expect(await screen.findByText(/Search couldn’t load/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "idempotency" })).toBeNull();
  });
});
