import { describe, expect, it } from "vitest";
import { lessonMetaSchema, slugSchema } from "@/lib/content/schema";
import { makeLesson } from "../support/fixtures";

describe("slugSchema", () => {
  it.each(["load-balancing", "tls-1-3", "rag"])("accepts %s", (slug) => {
    expect(slugSchema.safeParse(slug).success).toBe(true);
  });

  it.each(["Load-Balancing", "load_balancing", "-leading", "trailing-", "double--hyphen", ""])(
    "rejects %j",
    (slug) => {
      expect(slugSchema.safeParse(slug).success).toBe(false);
    },
  );
});

describe("lessonMetaSchema", () => {
  const valid = makeLesson();

  it("accepts a complete lesson and applies defaults", () => {
    expect(valid.order).toBe(100);
    expect(valid.prerequisites).toEqual([]);
    expect(valid.related).toEqual([]);
  });

  it("rejects an unknown domain", () => {
    expect(lessonMetaSchema.safeParse({ ...valid, domain: "astrology" }).success).toBe(false);
  });

  it("rejects a description too short to be a useful meta description", () => {
    expect(lessonMetaSchema.safeParse({ ...valid, description: "Too short." }).success).toBe(false);
  });

  it("requires at least two references", () => {
    expect(
      lessonMetaSchema.safeParse({ ...valid, references: valid.references.slice(0, 1) }).success,
    ).toBe(false);
  });

  it("rejects non-https references", () => {
    const references = [
      { ...valid.references[0], url: "http://example.org/insecure" },
      valid.references[1],
    ];
    const result = lessonMetaSchema.safeParse({ ...valid, references });
    expect(result.success).toBe(false);
  });

  it("rejects malformed prerequisite references", () => {
    expect(
      lessonMetaSchema.safeParse({ ...valid, prerequisites: ["no-domain-part"] }).success,
    ).toBe(false);
  });

  it("rejects an invalid review date", () => {
    expect(lessonMetaSchema.safeParse({ ...valid, lastReviewed: "12/10/2026" }).success).toBe(
      false,
    );
  });
});
