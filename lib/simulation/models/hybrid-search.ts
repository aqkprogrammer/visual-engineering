/**
 * Keyword, vector and hybrid search over a small, fictional help centre.
 *
 * - Keyword search is real BM25 with Elasticsearch's defaults (k1 = 1.2, b = 0.75) and Lucene's
 *   IDF, over lower-cased words with no stemming or stop words — like Elasticsearch's standard
 *   analyzer.
 * - Vector search is a teaching stand-in: each word or phrase in a small hand-written lexicon
 *   adds weight to a few named concepts, and texts are compared by cosine similarity. A real
 *   embedding model learns hundreds of unnamed dimensions instead.
 * - Hybrid search combines the two rankings with reciprocal rank fusion (Cormack et al., 2009).
 */

export type Article = { id: string; title: string; body: string };

export const ARTICLES: Article[] = [
  {
    id: "refunds",
    title: "Refunds for cancelled orders",
    body: "Refunds are returned to the original card within 14 days of a cancelled order. Ask support to start a refund if it has not arrived.",
  },
  {
    id: "send-money",
    title: "Send money to a friend",
    body: "Transfer money to another Ledgerly user with their email address or phone number. Money arrives instantly.",
  },
  {
    id: "export",
    title: "Back up your account data",
    body: "Export a copy of your account history before you close your account. The export includes every statement.",
  },
  {
    id: "e1042",
    title: "Error E1042: card declined by issuer",
    body: "E1042 means the bank that issued your card declined the payment. Ask the bank to allow the charge, then try again.",
  },
  {
    id: "payment-failed",
    title: "Why a payment fails",
    body: "A payment can fail because of an expired card, a wrong security code or not enough funds. Failed payments are not charged.",
  },
  {
    id: "two-factor",
    title: "Two-factor authentication",
    body: "Two-factor authentication asks for a code from your authenticator app when you sign in. Turn it on in security settings.",
  },
  {
    id: "new-phone",
    title: "Moving to a new phone",
    body: "Move your authenticator app to the new device before you erase the old one. Lost the old phone? Sign in with a recovery code.",
  },
  {
    id: "cancel-premium",
    title: "Cancel a Premium subscription",
    body: "Cancel Premium at any time from billing settings. You keep Premium until the end of the period you paid for.",
  },
  {
    id: "password",
    title: "Reset your password",
    body: "Choose Forgot password on the sign-in page and follow the link in the email we send you.",
  },
  {
    id: "fees",
    title: "Fees and exchange rates",
    body: "Card payments in another currency include a 1% exchange fee. Sending money to other Ledgerly users is free.",
  },
];

export type SearchQuery = { id: string; text: string; relevant: string[]; lesson: string };

export const SEARCH_QUERIES: SearchQuery[] = [
  {
    id: "code",
    text: "error E1042",
    relevant: ["e1042"],
    lesson:
      "An exact error code. Keyword search matches the rare term E1042 and ranks its article first; the toy embedding doesn't know the code, so it only sees “error” and prefers a general article.",
  },
  {
    id: "paraphrase",
    text: "how do I get my money back",
    relevant: ["refunds"],
    lesson:
      "A paraphrase. The refunds article shares no word with the question, so keyword search can't find it at all and matches “money” and “back” in the wrong articles; vector search matches the meaning.",
  },
  {
    id: "two-needs",
    text: "I want my money back after cancelling premium",
    relevant: ["cancel-premium", "refunds"],
    lesson:
      "Two needs in one question. Keyword search finds the Premium article but not the refund one; fusion keeps both of vector search's answers at the top.",
  },
  {
    id: "common-words",
    text: "how much does it cost to send money abroad",
    relevant: ["send-money", "fees"],
    lesson:
      "Common words. Keyword search finds both relevant articles, but matching “it” and “to” lets an unrelated one in between them.",
  },
];
// ---------- Keyword search: BM25 ----------

export const BM25 = { k1: 1.2, b: 0.75 } as const;

/** Lower-cased words, split on anything that isn't a letter or digit (so "two-factor" → two, factor). */
export function analyze(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export type TermContribution = { term: string; tf: number; df: number; idf: number; score: number };
export type Hit = { id: string; score: number; rank: number };
export type KeywordHit = Hit & { terms: TermContribution[] };

export function bm25Search(query: string, articles: Article[] = ARTICLES): KeywordHit[] {
  const docs = articles.map((a) => analyze(`${a.title} ${a.body}`));
  const n = docs.length;
  const avgdl = docs.reduce((sum, d) => sum + d.length, 0) / n;
  const df = (term: string) => docs.filter((d) => d.includes(term)).length;
  const queryTerms = analyze(query);
  const scored = articles.map((article, i) => {
    const doc = docs[i]!;
    const terms: TermContribution[] = [];
    for (const term of queryTerms) {
      const tf = doc.filter((w) => w === term).length;
      if (tf === 0) continue;
      const d = df(term);
      // Lucene's BM25 IDF, which is never negative.
      const idf = Math.log(1 + (n - d + 0.5) / (d + 0.5));
      const norm = tf + BM25.k1 * (1 - BM25.b + (BM25.b * doc.length) / avgdl);
      terms.push({ term, tf, df: d, idf, score: (idf * tf * (BM25.k1 + 1)) / norm });
    }
    return { id: article.id, score: terms.reduce((s, t) => s + t.score, 0), terms, i };
  });
  return rankHits(scored).map((h) => ({ ...h, terms: scored.find((s) => s.id === h.id)!.terms }));
}

// ---------- Vector search: a hand-written concept "embedding" ----------

export const CONCEPTS = [
  "refund",
  "payment",
  "transfer",
  "account",
  "security",
  "error",
  "mobile",
  "subscription",
  "fees",
] as const;
export type Concept = (typeof CONCEPTS)[number];
type Weights = Partial<Record<Concept, number>>;

/** Phrases are matched before single words, so "money back" means a refund, not a transfer. */
export const LEXICON: Record<string, Weights> = {
  "money back": { refund: 1 },
  "sign in": { security: 0.6, account: 0.4 },
  refund: { refund: 1 },
  refunds: { refund: 1 },
  returned: { refund: 0.5 },
  reimburse: { refund: 1 },
  cancelled: { refund: 0.4, subscription: 0.4 },
  cancel: { subscription: 1 },
  premium: { subscription: 1 },
  subscription: { subscription: 1 },
  billing: { subscription: 0.6, payment: 0.4 },
  paid: { payment: 0.6, subscription: 0.4 },
  payment: { payment: 1 },
  payments: { payment: 1 },
  card: { payment: 0.8 },
  charge: { payment: 0.8 },
  charged: { payment: 0.8 },
  bank: { payment: 0.6 },
  issuer: { payment: 0.6 },
  funds: { payment: 0.6 },
  money: { transfer: 0.6, payment: 0.4 },
  transfer: { transfer: 1 },
  send: { transfer: 0.8 },
  sending: { transfer: 0.8 },
  account: { account: 1 },
  export: { account: 0.8 },
  history: { account: 0.6 },
  statement: { account: 0.6 },
  close: { account: 0.6 },
  password: { security: 0.8, account: 0.2 },
  reset: { security: 0.5, account: 0.5 },
  forgot: { security: 0.5, account: 0.5 },
  factor: { security: 1 },
  authentication: { security: 1 },
  authenticator: { security: 0.8, mobile: 0.2 },
  security: { security: 1 },
  code: { security: 0.6 },
  recovery: { security: 0.8 },
  error: { error: 1 },
  declined: { error: 0.8, payment: 0.2 },
  fail: { error: 1 },
  fails: { error: 1 },
  failed: { error: 1 },
  phone: { mobile: 1 },
  device: { mobile: 1 },
  app: { mobile: 0.6 },
  fee: { fees: 1 },
  fees: { fees: 1 },
  exchange: { fees: 0.8 },
  currency: { fees: 0.8 },
  rates: { fees: 0.6 },
  free: { fees: 0.6 },
};

export type Vector = Record<Concept, number>;
export type Embedded = { vector: Vector; matched: string[] };

export function embed(text: string): Embedded {
  const words = analyze(text);
  const vector = Object.fromEntries(CONCEPTS.map((c) => [c, 0])) as Vector;
  const matched: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const pair = `${words[i]} ${words[i + 1] ?? ""}`;
    const key = LEXICON[pair] ? pair : LEXICON[words[i]!] ? words[i]! : null;
    if (!key) continue;
    matched.push(key);
    for (const [concept, weight] of Object.entries(LEXICON[key]!)) {
      vector[concept as Concept] += weight;
    }
    if (key === pair) i += 1;
  }
  return { vector, matched };
}

export function cosine(a: Vector, b: Vector): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const c of CONCEPTS) {
    dot += a[c] * b[c];
    na += a[c] ** 2;
    nb += b[c] ** 2;
  }
  return na === 0 || nb === 0 ? 0 : dot / Math.sqrt(na * nb);
}

export type VectorHit = Hit & { matched: string[] };

export function vectorSearch(query: string, articles: Article[] = ARTICLES): VectorHit[] {
  const q = embed(query).vector;
  const scored = articles.map((a, i) => {
    const doc = embed(`${a.title} ${a.body}`);
    return { id: a.id, score: cosine(q, doc.vector), matched: doc.matched, i };
  });
  return rankHits(scored).map((h) => ({
    ...h,
    matched: scored.find((s) => s.id === h.id)!.matched,
  }));
}

// ---------- Hybrid: reciprocal rank fusion ----------

export const RRF_K = 60;

export type FusedHit = Hit & { keywordRank?: number; vectorRank?: number };

/** RRF score = Σ 1 / (k + rank) over the rankings a document appears in. */
export function reciprocalRankFusion(rankings: Hit[][], k = RRF_K): FusedHit[] {
  const scores = new Map<string, { score: number; ranks: number[]; first: number }>();
  rankings.forEach((ranking, r) => {
    for (const hit of ranking) {
      const entry = scores.get(hit.id) ?? { score: 0, ranks: [], first: Infinity };
      entry.score += 1 / (k + hit.rank);
      entry.ranks[r] = hit.rank;
      entry.first = Math.min(entry.first, hit.rank * 10 + r);
      scores.set(hit.id, entry);
    }
  });
  return [...scores.entries()]
    .sort(([, a], [, b]) => b.score - a.score || a.first - b.first)
    .map(([id, e], i) => ({
      id,
      score: e.score,
      rank: i + 1,
      ...(e.ranks[0] !== undefined && { keywordRank: e.ranks[0] }),
      ...(e.ranks[1] !== undefined && { vectorRank: e.ranks[1] }),
    }));
}

/** Documents with a positive score, best first; ties keep article order. */
function rankHits<T extends { id: string; score: number; i: number }>(scored: T[]): Hit[] {
  return scored
    .filter((s) => s.score > 1e-9)
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map((s, index) => ({ id: s.id, score: s.score, rank: index + 1 }));
}

// ---------- Evaluation ----------

export function recallAt(hits: Hit[], relevant: string[], k: number): number {
  const top = hits.slice(0, k).map((h) => h.id);
  return relevant.filter((id) => top.includes(id)).length / relevant.length;
}

/** 1 / rank of the first relevant result, or 0 if none was returned. */
export function reciprocalRank(hits: Hit[], relevant: string[]): number {
  const first = hits.find((h) => relevant.includes(h.id));
  return first ? 1 / first.rank : 0;
}

export type SearchComparison = {
  keyword: KeywordHit[];
  vector: VectorHit[];
  hybrid: FusedHit[];
};

export function compareSearch(query: string, k = RRF_K): SearchComparison {
  const keyword = bm25Search(query);
  const vector = vectorSearch(query);
  return { keyword, vector, hybrid: reciprocalRankFusion([keyword, vector], k) };
}
