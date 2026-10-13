/**
 * A toy byte-pair encoding (BPE) tokenizer, trained on a tiny fixed corpus.
 *
 * It follows the original algorithm for subword units (Sennrich et al., 2016): start from single
 * characters plus an end-of-word marker, then repeatedly merge the most frequent adjacent pair.
 * Real LLM tokenizers run byte-level BPE over raw bytes, learn tens or hundreds of thousands of
 * merges from huge corpora, and assign entirely different ids — this exists only to show the idea.
 */

export const END = "_";

/** The classic example corpus from Sennrich et al.: word → frequency. */
export const CORPUS: Record<string, number> = { low: 5, lower: 2, newest: 6, widest: 3 };

export type Merge = { pair: [string, string]; merged: string; frequency: number };

const splitWord = (word: string) => [...word, END];

/** Learns up to `count` merges. Ties are broken alphabetically so training is deterministic. */
export function train(corpus: Record<string, number> = CORPUS, count = 10): Merge[] {
  let words = Object.entries(corpus).map(([w, f]) => ({ symbols: splitWord(w), frequency: f }));
  const merges: Merge[] = [];
  for (let n = 0; n < count; n++) {
    const counts = new Map<string, number>();
    for (const { symbols, frequency } of words) {
      for (let i = 0; i < symbols.length - 1; i++) {
        const key = `${symbols[i]}\u0000${symbols[i + 1]}`;
        counts.set(key, (counts.get(key) ?? 0) + frequency);
      }
    }
    const best = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    if (!best) break;
    const [a, b] = best[0].split("\u0000") as [string, string];
    merges.push({ pair: [a, b], merged: a + b, frequency: best[1] });
    words = words.map(({ symbols, frequency }) => ({
      symbols: applyMerge(symbols, a, b),
      frequency,
    }));
  }
  return merges;
}

function applyMerge(symbols: string[], a: string, b: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < symbols.length; i++) {
    if (i < symbols.length - 1 && symbols[i] === a && symbols[i + 1] === b) {
      out.push(a + b);
      i++;
    } else {
      out.push(symbols[i]!);
    }
  }
  return out;
}

/** Applies merges in the order they were learned — the same order used at training time. */
export function tokenizeWord(word: string, merges: Merge[]): string[] {
  return merges.reduce((symbols, m) => applyMerge(symbols, m.pair[0], m.pair[1]), splitWord(word));
}

export function baseVocabulary(corpus: Record<string, number> = CORPUS): string[] {
  return [...new Set(Object.keys(corpus).flatMap(splitWord))].sort();
}

export type Token = { text: string; id: number | null; word: number };

/** Tokenizes text; characters never seen in training have no id (a byte-level tokenizer never has this problem). */
export function tokenize(text: string, merges: Merge[]): Token[] {
  const vocab = [...baseVocabulary(), ...merges.map((m) => m.merged)];
  const ids = new Map(vocab.map((t, i) => [t, i]));
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((word, w) =>
      tokenizeWord(word, merges).map((t) => ({ text: t, id: ids.get(t) ?? null, word: w })),
    );
}
