import "server-only";
import { lessonBodies } from "@/content/.generated/bodies";
import type { Lesson } from "./schema";

/**
 * Lesson MDX bodies. Separate from `catalog.ts` on purpose: a module that imports the bodies pulls
 * every lesson's interactive components into its route's client bundle, so only the lesson page
 * imports this file. Everything else reads metadata from the catalog.
 */
export async function loadLessonBody(lesson: Lesson) {
  const load = lessonBodies[lesson.id];
  if (!load) throw new Error(`No MDX body registered for lesson ${lesson.id}`);
  return (await load()).default;
}
