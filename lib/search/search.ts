/**
 * Client-side search over a small, build-time index of lessons, demos, paths and glossary terms.
 * Pure and dependency-free: the whole catalog is a few hundred kilobytes of text at most, so a
 * linear scan with simple, explainable scoring is faster to load than any search library.
 *
 * Rules: every query word must match somewhere in a document (AND). A whole-word match scores
 * more than a prefix match, which scores more than a one-letter typo. Matches in the title count
 * most, then keywords, then the summary, then the body.
 */

export const SEARCH_KINDS = ["lesson", "path", "demo", "incident", "term", "question"] as const;
export type SearchKind = (typeof SEARCH_KINDS)[number];

export type SearchDoc = {
  kind: SearchKind;
  title: string;
  href: string;
  summary: string;
  /** Where the result lives, e.g. the domain name. Shown, and searched like keywords. */
  context: string;
  /** Other names for the same thing (e.g. "DLQ"): searched with the same weight as the title. */
  aliases: string[];
  /** Tags and headings: not shown, but searched. */
  keywords: string[];
  /** Longer supporting text (steps, try-this lists): searched with the lowest weight. */
  body: string;
};

export type SearchResult = { doc: SearchDoc; score: number };

const WEIGHTS = { title: 10, keywords: 5, summary: 3, body: 1 } as const;
const QUALITY = { exact: 1, prefix: 0.6, typo: 0.35 } as const;
/** Tie-breaks: explanations first, then definitions, then practice questions. */
const KIND_ORDER: Record<SearchKind, number> = {
  lesson: 0,
  path: 1,
  demo: 2,
  incident: 3,
  term: 4,
  question: 5,
};

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "do",
  "does",
  "for",
  "from",
  "how",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "the",
  "to",
  "what",
  "when",
  "why",
  "with",
]);

/** Lowercase, strip accents, and keep only letters and digits as word characters. */
export function normalize(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * A deliberately tiny stemmer that maps common word forms onto one key, so "caches", "cached" and
 * "caching" all find "cache", and "indexes" finds "index". Keys are for comparison only; they are
 * not always real words ("cach"). Exact-word matching uses keys; prefix matching uses the raw word,
 * so half-typed words still match.
 */
export function stem(word: string): string {
  let w = word;
  if (w.length > 4 && /(?:x|sh|ss)es$/.test(w)) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) w = w.slice(0, -1);
  if (w.length > 5 && w.endsWith("ing")) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith("ed")) w = w.slice(0, -2);
  if (w.length > 3 && w.endsWith("e")) w = w.slice(0, -1);
  return w;
}

function words(text: string): string[] {
  return normalize(text).split(" ").filter(Boolean);
}

type Tokens = { raw: string[]; stems: string[] };

export function tokenize(text: string): Tokens {
  const raw = words(text);
  return { raw, stems: raw.map(stem) };
}

/**
 * Query words without stopwords — unless the query is nothing but stopwords — with one word per
 * stem ("queue queues" is one term).
 */
export function queryTerms(query: string): string[] {
  const all = words(query);
  const meaningful = all.filter((w) => !STOPWORDS.has(w));
  const byStem = new Map<string, string>();
  for (const word of meaningful.length > 0 ? meaningful : all) {
    if (!byStem.has(stem(word))) byStem.set(stem(word), word);
  }
  return [...byStem.values()];
}

/** True when a and b differ by at most one insertion, deletion or substitution. */
export function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

function matchQuality(term: string, tokens: Tokens): number {
  const key = stem(term);
  let best = 0;
  for (let i = 0; i < tokens.raw.length; i++) {
    const raw = tokens.raw[i] ?? "";
    if (tokens.stems[i] === key) return QUALITY.exact;
    if (term.length >= 2 && raw.startsWith(term)) best = Math.max(best, QUALITY.prefix);
    else if (term.length >= 5 && best < QUALITY.typo && withinOneEdit(term, raw)) {
      best = QUALITY.typo;
    }
  }
  return best;
}

type Field = keyof typeof WEIGHTS;
/** `titleKeys` are the title and aliases as stems ("cach hit evict"), for whole-phrase matches. */
export type PreparedDoc = { doc: SearchDoc; fields: Record<Field, Tokens>; titleKeys: string[] };

/** Tokenize once, up front, so each keystroke only compares strings. */
export function prepare(docs: SearchDoc[]): PreparedDoc[] {
  return docs.map((doc) => ({
    doc,
    titleKeys: [doc.title, ...doc.aliases].map((t) => tokenize(t).stems.join(" ")),
    fields: {
      title: tokenize([doc.title, ...doc.aliases].join(" ")),
      keywords: tokenize([doc.context, ...doc.keywords].join(" ")),
      summary: tokenize(doc.summary),
      body: tokenize(doc.body),
    },
  }));
}

export function search(prepared: PreparedDoc[], query: string, limit = 30): SearchResult[] {
  const terms = queryTerms(query);
  if (terms.length === 0) return [];
  const phrase = tokenize(query).stems.join(" ");

  const results: SearchResult[] = [];
  for (const entry of prepared) {
    let score = 0;
    let matchedAll = true;
    for (const term of terms) {
      let best = 0;
      for (const field of Object.keys(WEIGHTS) as Field[]) {
        best = Math.max(best, WEIGHTS[field] * matchQuality(term, entry.fields[field]));
      }
      if (best === 0) {
        matchedAll = false;
        break;
      }
      score += best;
    }
    if (!matchedAll) continue;
    if (phrase.length > 0 && entry.titleKeys.some((key) => key.includes(phrase))) {
      score += WEIGHTS.title;
    }
    results.push({ doc: entry.doc, score });
  }

  return results
    .sort(
      (a, b) =>
        b.score - a.score ||
        KIND_ORDER[a.doc.kind] - KIND_ORDER[b.doc.kind] ||
        a.doc.title.localeCompare(b.doc.title),
    )
    .slice(0, limit);
}

/**
 * Splits text into plain and highlighted segments: a word is marked when it starts with a query
 * word or shares its stem ("Caching" for "cache"). Used for titles only.
 */
export function highlight(text: string, query: string): { text: string; match: boolean }[] {
  const terms = words(query).filter((w) => w.length >= 2 && !STOPWORDS.has(w));
  if (terms.length === 0) return [{ text, match: false }];

  const segments: { text: string; match: boolean }[] = [];
  for (const part of text.split(/(\s+)/)) {
    const plain = normalize(part);
    const match =
      plain.length > 0 && terms.some((w) => plain.startsWith(w) || stem(plain) === stem(w));
    const last = segments.at(-1);
    if (last && last.match === match) last.text += part;
    else segments.push({ text: part, match });
  }
  return segments;
}
