import { describe, expect, it } from "vitest";
import { analyzeMdx, WORDS_PER_MINUTE } from "@/lib/content/mdx-text";

describe("analyzeMdx", () => {
  it("extracts h2/h3 headings with ids that match rehype-slug", () => {
    const { headings } = analyzeMdx(
      [
        "# Title",
        "## The problem",
        "### Layer 4 vs. layer 7",
        "#### Too deep",
        "## The problem",
      ].join("\n\n"),
    );
    expect(headings).toEqual([
      { depth: 2, text: "The problem", id: "the-problem" },
      { depth: 3, text: "Layer 4 vs. layer 7", id: "layer-4-vs-layer-7" },
      // Duplicate headings get a numeric suffix, exactly like github-slugger in rehype-slug.
      { depth: 2, text: "The problem", id: "the-problem-1" },
    ]);
  });

  it("uses the text content of headings that contain inline code", () => {
    const { headings } = analyzeMdx("## Using `least_conn` safely");
    expect(headings[0]).toEqual({
      depth: 2,
      text: "Using least_conn safely",
      id: "using-least_conn-safely",
    });
  });

  it("excludes fenced code and ESM from the word count", () => {
    const source = [
      'import { X } from "./x"',
      "One two three.",
      "```nginx\nupstream a { server 10.0.0.1; server 10.0.0.2; }\n```",
      "Four five.",
    ].join("\n\n");
    const result = analyzeMdx(source);
    expect(result.wordCount).toBe(5);
    expect(result.plainText).toBe("One two three. Four five.");
  });

  it("counts prose inside JSX children and string props", () => {
    const result = analyzeMdx(
      '<Callout title="Why balance load?">\nBecause servers fail.\n</Callout>',
    );
    expect(result.wordCount).toBe(6);
  });

  it("rounds reading time and never reports zero minutes", () => {
    expect(analyzeMdx("Hello world.").readingMinutes).toBe(1);
    const words = Array.from({ length: WORDS_PER_MINUTE * 3 }, () => "word").join(" ");
    expect(analyzeMdx(words).readingMinutes).toBe(3);
  });
});
