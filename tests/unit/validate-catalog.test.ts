import { describe, expect, it } from "vitest";
import { findPrerequisiteCycles, validateCatalog } from "@/lib/content/validate";
import { makeDomain, makeLesson } from "../support/fixtures";

const messages = (issues: { message: string }[]) => issues.map((i) => i.message);

describe("validateCatalog", () => {
  it("accepts a consistent catalog", () => {
    const a = makeLesson({ slug: "a" });
    const b = makeLesson({
      slug: "b",
      prerequisites: ["system-design/a"],
      related: ["system-design/a"],
    });
    expect(validateCatalog([makeDomain()], [a, b])).toEqual([]);
  });

  it("flags duplicate lessons", () => {
    const issues = validateCatalog([makeDomain()], [makeLesson(), makeLesson()]);
    expect(messages(issues)).toContain("duplicate lesson slug within domain");
  });

  it("flags an unknown module", () => {
    const issues = validateCatalog([makeDomain()], [makeLesson({ module: "nonexistent" })]);
    expect(messages(issues)[0]).toMatch(/unknown module "nonexistent"/);
  });

  it("flags a lesson whose domain has no definition", () => {
    const issues = validateCatalog([makeDomain()], [makeLesson({ domain: "ai" })]);
    expect(messages(issues)[0]).toMatch(/unknown domain "ai"/);
  });

  it("flags references to lessons that do not exist", () => {
    const issues = validateCatalog(
      [makeDomain()],
      [makeLesson({ related: ["system-design/missing"] })],
    );
    expect(messages(issues)[0]).toMatch(/related lesson "system-design\/missing" does not exist/);
  });

  it("flags a published lesson linking to a draft", () => {
    const draft = makeLesson({ slug: "draft", status: "draft" });
    const published = makeLesson({ slug: "pub", prerequisites: ["system-design/draft"] });
    const issues = validateCatalog([makeDomain()], [draft, published]);
    expect(messages(issues)[0]).toMatch(/is not published yet/);
  });

  it("flags self references", () => {
    const issues = validateCatalog(
      [makeDomain()],
      [makeLesson({ related: ["system-design/load-balancing"] })],
    );
    expect(messages(issues)[0]).toMatch(/lists itself/);
  });

  it("flags domain ids that would shadow a static route", () => {
    // Bypass the enum to simulate a future taxonomy change colliding with /explore.
    const domain = { ...makeDomain(), id: "explore" } as unknown as ReturnType<typeof makeDomain>;
    expect(messages(validateCatalog([domain], []))).toContain(
      "domain id collides with a reserved route",
    );
  });

  it("flags duplicate module ids", () => {
    const base = makeDomain();
    const domain = { ...base, modules: [...base.modules, base.modules[0]!] };
    expect(messages(validateCatalog([domain], []))[0]).toMatch(/duplicate module id "traffic"/);
  });

  it("flags duplicate tags", () => {
    const issues = validateCatalog([makeDomain()], [makeLesson({ tags: ["cache", "cache"] })]);
    expect(messages(issues)).toContain("duplicate tags");
  });
});

describe("findPrerequisiteCycles", () => {
  it("finds a cycle across three lessons", () => {
    const a = makeLesson({ slug: "a", prerequisites: ["system-design/c"] });
    const b = makeLesson({ slug: "b", prerequisites: ["system-design/a"] });
    const c = makeLesson({ slug: "c", prerequisites: ["system-design/b"] });
    const cycles = findPrerequisiteCycles([a, b, c]);
    expect(cycles).toHaveLength(1);
    expect(cycles[0]).toHaveLength(4);
    expect(cycles[0]![0]).toBe(cycles[0]![3]);
  });

  it("returns nothing for a DAG with shared prerequisites", () => {
    const a = makeLesson({ slug: "a" });
    const b = makeLesson({ slug: "b", prerequisites: ["system-design/a"] });
    const c = makeLesson({ slug: "c", prerequisites: ["system-design/a", "system-design/b"] });
    expect(findPrerequisiteCycles([a, b, c])).toEqual([]);
  });

  it("reports the cycle through validateCatalog", () => {
    const a = makeLesson({ slug: "a", prerequisites: ["system-design/b"] });
    const b = makeLesson({ slug: "b", prerequisites: ["system-design/a"] });
    expect(
      messages(validateCatalog([makeDomain()], [a, b])).some((m) =>
        m.startsWith("prerequisite cycle"),
      ),
    ).toBe(true);
  });
});
