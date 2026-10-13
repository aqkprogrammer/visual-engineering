/**
 * Toy embedding space for teaching vector similarity.
 *
 * The vectors are hand-placed in two made-up dimensions so related words point in similar
 * directions. Real embedding models learn hundreds to thousands of dimensions from data, and their
 * individual dimensions usually have no human-readable meaning. "animals" is deliberately longer
 * than the rest to show how the dot product rewards magnitude while cosine similarity ignores it.
 */
export type Vec = readonly [number, number];
export type Item = { word: string; group: "animal" | "vehicle" | "fruit"; vector: Vec };

export const ITEMS: Item[] = [
  { word: "cat", group: "animal", vector: [0.92, 0.3] },
  { word: "kitten", group: "animal", vector: [0.88, 0.22] },
  { word: "dog", group: "animal", vector: [0.95, 0.42] },
  { word: "puppy", group: "animal", vector: [0.9, 0.48] },
  { word: "animals", group: "animal", vector: [1.7, 0.7] },
  { word: "car", group: "vehicle", vector: [0.35, 0.9] },
  { word: "truck", group: "vehicle", vector: [0.25, 0.95] },
  { word: "bus", group: "vehicle", vector: [0.3, 0.86] },
  { word: "bicycle", group: "vehicle", vector: [0.48, 0.8] },
  { word: "apple", group: "fruit", vector: [-0.7, 0.6] },
  { word: "banana", group: "fruit", vector: [-0.8, 0.5] },
  { word: "orange", group: "fruit", vector: [-0.64, 0.72] },
];

export type Metric = "cosine" | "dot" | "euclidean";

export const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1];
export const norm = (a: Vec) => Math.hypot(a[0], a[1]);
export const cosine = (a: Vec, b: Vec) => dot(a, b) / (norm(a) * norm(b));
export const euclidean = (a: Vec, b: Vec) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Angle between two vectors in degrees. */
export const angleBetween = (a: Vec, b: Vec) =>
  (Math.acos(Math.max(-1, Math.min(1, cosine(a, b)))) * 180) / Math.PI;

export function score(metric: Metric, a: Vec, b: Vec): number {
  switch (metric) {
    case "cosine":
      return cosine(a, b);
    case "dot":
      return dot(a, b);
    case "euclidean":
      return euclidean(a, b);
  }
}

/** Higher is more similar, except for Euclidean distance where lower is. */
export const higherIsBetter = (metric: Metric) => metric !== "euclidean";

export type Ranked = { item: Item; score: number; rank: number };

/** All other items ranked from most to least similar to the query. Ties keep list order. */
export function rank(query: Item, metric: Metric, items: Item[] = ITEMS): Ranked[] {
  const direction = higherIsBetter(metric) ? -1 : 1;
  return items
    .filter((item) => item.word !== query.word)
    .map((item, index) => ({ item, index, score: score(metric, query.vector, item.vector) }))
    .sort((a, b) => direction * (a.score - b.score) || a.index - b.index)
    .map(({ item, score: s }, i) => ({ item, score: s, rank: i + 1 }));
}
