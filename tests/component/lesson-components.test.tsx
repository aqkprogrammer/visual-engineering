// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { DifficultyBadge } from "@/components/lessons/lesson-meta";
import { InterviewCard } from "@/components/interview/interview-card";
import { Analogy, Callout, TradeOffs } from "@/components/lessons/mdx-blocks";
import { interviewItemSchema } from "@/lib/content/schema";
import { TableOfContents } from "@/components/lessons/table-of-contents";
import { LoadBalancerDiagram } from "@/components/visualizations/static/load-balancer-diagram";

describe("Breadcrumbs", () => {
  it("links ancestors and marks the current page without a link", () => {
    render(
      <Breadcrumbs
        items={[
          { label: "Explore", href: "/explore" },
          { label: "System Design", href: "/system-design" },
          { label: "Load balancing" },
        ]}
      />,
    );
    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(
      within(nav)
        .getAllByRole("link")
        .map((a) => a.getAttribute("href")),
    ).toEqual(["/explore", "/system-design"]);
    expect(within(nav).getByText("Load balancing")).toHaveAttribute("aria-current", "page");
  });
});

describe("lesson blocks", () => {
  it("labels analogies so they are never mistaken for fact", () => {
    render(<Analogy>A restaurant host seats guests.</Analogy>);
    expect(screen.getByRole("complementary", { name: "Analogy" })).toHaveTextContent(
      "Analogy — not literal",
    );
  });

  it("labels illustrative callouts with their kind as text", () => {
    render(
      <Callout kind="illustrative" title="Detection is never instant">
        Numbers.
      </Callout>,
    );
    const callout = screen.getByRole("complementary", { name: "Detection is never instant" });
    expect(callout).toHaveTextContent("Illustrative numbers");
  });

  it("hides interview answers and the rubric until the reader asks for them", async () => {
    const user = userEvent.setup();
    const item = interviewItemSchema.parse({
      id: "why-load-balance",
      question: "Why use a load balancer?",
      level: "junior",
      kind: "concept",
      answer:
        "Because servers fail, and one server can't handle all the traffic. Use `nginx` or a managed one.",
      rubric: {
        core: ["Spreads traffic across servers", "Routes around failed servers"],
        redFlags: ["Says a single server is enough"],
      },
    });
    render(<InterviewCard item={item} />);
    const details = screen.getByText("Why use a load balancer?").closest("details");
    expect(details).not.toHaveAttribute("open");
    expect(screen.getByText("Junior")).toBeInTheDocument();
    await user.click(screen.getByText("Why use a load balancer?"));
    expect(details).toHaveAttribute("open");
    expect(screen.getByText("nginx").tagName).toBe("CODE");
    expect(screen.getByText("Every good answer covers")).toBeVisible();
    expect(screen.getByText("Says a single server is enough")).toBeVisible();
    expect(screen.queryByText("Signs of a strong answer")).toBeNull();
  });

  it("renders trade-offs as two labelled lists", () => {
    render(<TradeOffs use={["Many servers"]} avoid={["One tiny server"]} />);
    expect(screen.getByRole("region", { name: "When to use it" })).toHaveTextContent(
      "Many servers",
    );
    expect(screen.getByRole("region", { name: "When to avoid it" })).toHaveTextContent(
      "One tiny server",
    );
  });

  it("shows difficulty as text, not only as a visual meter", () => {
    render(<DifficultyBadge difficulty="intermediate" />);
    expect(screen.getByText("intermediate")).toBeInTheDocument();
  });

  it("links TOC entries to heading anchors", () => {
    render(<TableOfContents headings={[{ depth: 2, text: "The problem", id: "the-problem" }]} />);
    expect(screen.getByRole("link", { name: "The problem" })).toHaveAttribute(
      "href",
      "#the-problem",
    );
  });
});

describe("LoadBalancerDiagram", () => {
  it("exposes a text alternative describing the failed server", () => {
    render(<LoadBalancerDiagram />);
    const img = screen.getByRole("img");
    expect(img).toHaveAccessibleName(/Load balancer distributing requests across three servers/);
    expect(img).toHaveAccessibleName(/app-3 has failed its health checks/);
  });

  it("states server health in text, not colour alone", () => {
    render(<LoadBalancerDiagram />);
    expect(screen.getAllByText("✓ healthy")).toHaveLength(2);
    expect(screen.getByText("✕ unhealthy")).toBeInTheDocument();
  });
});
