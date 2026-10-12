import GithubSlugger from "github-slugger";
import type { Root } from "mdast";
import { toString } from "mdast-util-to-string";
import remarkGfm from "remark-gfm";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { SKIP, visit } from "unist-util-visit";
import type { Heading } from "./schema";

/** Average adult silent-reading speed for technical prose (words per minute). */
export const WORDS_PER_MINUTE = 220;

export type MdxAnalysis = {
  wordCount: number;
  readingMinutes: number;
  headings: Heading[];
  /** Prose with code and markup removed — the input for the search index. */
  plainText: string;
};

const processor = unified().use(remarkParse).use(remarkGfm).use(remarkMdx);

/**
 * Derives reading time and the table of contents from an MDX body at build time, so neither
 * is hand-maintained. Heading ids use github-slugger, the same algorithm rehype-slug applies
 * to the rendered page, so TOC anchors always match.
 */
export function analyzeMdx(source: string): MdxAnalysis {
  const tree = processor.parse(source) as Root;
  const slugger = new GithubSlugger();
  const headings: Heading[] = [];
  const chunks: string[] = [];

  visit(tree, (node) => {
    // Code blocks and ESM import/export statements are not prose.
    if (node.type === "code" || node.type === "mdxjsEsm" || node.type === "mdxFlowExpression") {
      return SKIP;
    }
    if (node.type === "heading") {
      const text = toString(node).trim();
      const id = slugger.slug(text);
      if (node.depth === 2 || node.depth === 3) headings.push({ depth: node.depth, text, id });
      chunks.push(text);
      return SKIP;
    }
    if (node.type === "text" || node.type === "inlineCode") {
      chunks.push(node.value);
    }
    // Prose passed as string props, e.g. <InterviewQuestion question="…">.
    if (node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") {
      for (const attr of node.attributes) {
        if (attr.type === "mdxJsxAttribute" && typeof attr.value === "string")
          chunks.push(attr.value);
      }
    }
    return undefined;
  });

  const plainText = chunks.join(" ").replace(/\s+/g, " ").trim();
  const wordCount = plainText === "" ? 0 : plainText.split(" ").length;
  return {
    wordCount,
    readingMinutes: Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE)),
    headings,
    plainText,
  };
}
