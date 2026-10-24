import { defineInterview } from "@/lib/content/schema";

export default defineInterview([
  {
    id: "bm25-explained",
    question: "Explain how BM25 scores a document for a query.",
    level: "mid",
    kind: "concept",
    answer:
      "BM25 adds a contribution for each query term found in the document. Each contribution is the term's inverse document frequency — rare terms weigh more — multiplied by a term-frequency factor that saturates, so repeating a word helps less each time; the parameter k1 controls how quickly. The term frequency is also normalised by document length relative to the average, controlled by b, so long documents don't win just by containing more words. Elasticsearch uses k1 = 1.2 and b = 0.75 by default.",
    rubric: {
      core: [
        "Sums a contribution per matching query term",
        "Inverse document frequency makes rare terms weigh more",
        "Term frequency saturates (k1)",
        "Normalises for document length (b)",
      ],
      strong: [
        "Mentions that text analysis (stemming, stop words) affects results as much as the formula",
      ],
      redFlags: ["Describes it as counting matching words"],
    },
  },
  {
    id: "keyword-vs-vector-failures",
    question:
      "Give an example query where vector search beats keyword search, and one where it loses. Why?",
    level: "junior",
    kind: "trade-off",
    answer:
      "Vector search wins on paraphrases: “how do I get my money back” matches a refunds article that shares none of its words, because their embeddings are close in meaning. It loses on exact identifiers: a query for an error code or product number may be embedded as generic “error” or “product” meaning, while keyword search matches the rare term exactly and weights it highly.",
    rubric: {
      core: [
        "Vector search handles paraphrases and synonyms",
        "Keyword search handles exact rare terms such as codes and names",
        "Explains the reason: meaning versus exact words",
      ],
      strong: ["Proposes hybrid search for queries that mix both"],
      redFlags: ["Says vector search is better in every case"],
    },
  },
  {
    id: "rank-fusion-design",
    question: "How would you combine keyword and vector results, and how would you know it helped?",
    level: "senior",
    kind: "design",
    answer:
      "Run both searches for each query and fuse their rankings with reciprocal rank fusion, which sums 1/(k + rank) across lists and needs no score normalisation; k = 60 is the standard starting point. Alternatively, normalise both scores and take a weighted sum, tuning the weight on labelled data. To know it helped, build a labelled set of real queries with their relevant passages and compare recall@k and mean reciprocal rank for keyword, vector and hybrid, broken down by query type.",
    rubric: {
      core: [
        "Runs both searches and fuses rankings, for example with RRF",
        "Explains why scores can't simply be added",
        "Evaluates with labelled queries and metrics such as recall@k or MRR",
      ],
      strong: [
        "Breaks results down by query type (identifiers versus paraphrases)",
        "Mentions reranking the fused results",
      ],
      redFlags: ["Adds raw BM25 and cosine scores"],
    },
  },
  {
    id: "identifier-search-bug",
    question:
      "After moving from keyword search to vector search, users complain that searching for order numbers no longer works. What happened and what would you do?",
    level: "mid",
    kind: "debugging",
    answer:
      "Order numbers are arbitrary strings with no learned meaning, so their embeddings are close to many other numbers and exact matches no longer rank first. Keep keyword search for them: either detect identifier-shaped queries and use an exact match, or run hybrid search with keyword search on a field that isn't split or stemmed, so the exact match dominates.",
    rubric: {
      core: [
        "Explains that identifiers carry little meaning for an embedding model",
        "Restores exact or keyword matching for identifiers",
        "Uses an unanalysed field or hybrid search",
      ],
      strong: ["Adds identifier queries to the retrieval evaluation set"],
      redFlags: ["Suggests a bigger embedding model as the fix"],
    },
  },
]);
