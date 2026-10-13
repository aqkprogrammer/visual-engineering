/**
 * Teaching model of a retrieval-augmented generation (RAG) pipeline over a tiny, fictional
 * company handbook.
 *
 * Simplifications (shown to learners):
 * - Retrieval scores use word overlap, standing in for embedding similarity, so you can see why
 *   each chunk scored as it did.
 * - The reranker re-scores candidates with a stricter phrase match and drops documents marked as
 *   superseded — a stand-in for a cross-encoder plus a metadata filter.
 * - No language model is called. The "generated" answer is chosen from pre-written responses
 *   according to which facts made it into the context.
 */
import { walkthroughFrames, type WalkthroughStep } from "../run";

export type Doc = { id: string; title: string; current: boolean; text: string };

export const CORPUS: Doc[] = [
  {
    id: "expenses-2025",
    title: "Expense policy (current, 2025)",
    current: true,
    text: "Submit expense claims within 30 days of purchase. Hotel and travel costs over $500 need approval from your manager before booking. Meals are reimbursed up to $60 per day while travelling.",
  },
  {
    id: "expenses-2023",
    title: "Expense policy (superseded, 2023)",
    current: false,
    text: "Submit expense claims within 60 days of purchase. Hotel and travel expenses over $1,000 need approval from a director. Meals are reimbursed up to $45 per day.",
  },
  {
    id: "remote-work",
    title: "Remote work policy",
    current: true,
    text: "Employees may work remotely up to three days per week. A one-time equipment stipend of $300 covers a desk chair or monitor. Record remote days in the team calendar.",
  },
  {
    id: "security",
    title: "Security policy",
    current: true,
    text: "Multi-factor authentication is required for all accounts. Laptops must use full-disk encryption. Report suspected security incidents to the security team within 24 hours.",
  },
];

export type QuestionId = "approval" | "deadline" | "stipend" | "gym";

/** Facts a correct answer depends on: the true one and, where relevant, the outdated one. */
const FACTS: Record<QuestionId, { question: string; current: RegExp; outdated?: RegExp }> = {
  approval: {
    question: "Who has to approve a $700 hotel booking?",
    current: /over \$500 need approval from your manager/,
    outdated: /over \$1,000 need approval from a director/,
  },
  deadline: {
    question: "How long do I have to submit an expense claim?",
    current: /within 30 days/,
    outdated: /within 60 days/,
  },
  stipend: {
    question: "How much is the equipment stipend for remote work?",
    current: /equipment stipend of \$300/,
  },
  // Not covered by any document: retrieval still returns *something*, and the model must refuse.
  gym: {
    question: "Can I expense a gym membership?",
    current: /gym membership/,
  },
};

export const QUESTIONS = Object.entries(FACTS).map(([id, f]) => ({
  id: id as QuestionId,
  text: f.question,
}));

export type RagParams = {
  question: QuestionId;
  chunking: "document" | "sentence";
  topK: number;
  rerank: boolean;
  includeSuperseded: boolean;
};

export const DEFAULT_RAG_PARAMS: RagParams = {
  question: "approval",
  chunking: "sentence",
  topK: 2,
  rerank: false,
  includeSuperseded: true,
};

export type Chunk = { id: string; docId: string; docTitle: string; current: boolean; text: string };
export type Scored = Chunk & { score: number };

const STOP = new Set(
  "a an the of to for and or is are do i my your how who what much long has have be by in on at up with from per before while".split(
    " ",
  ),
);

export function terms(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9$,.\s-]/g, " ")
      .split(/\s+/)
      .map((w) => w.replace(/[.,]+$/, ""))
      .filter((w) => w && !STOP.has(w)),
  );
}

export function chunk(corpus: Doc[], mode: RagParams["chunking"]): Chunk[] {
  return corpus.flatMap((doc) => {
    const pieces = mode === "document" ? [doc.text] : doc.text.split(/(?<=\.)\s+/);
    return pieces.map((text, i) => ({
      id: mode === "document" ? doc.id : `${doc.id}#${i + 1}`,
      docId: doc.id,
      docTitle: doc.title,
      current: doc.current,
      text,
    }));
  });
}

/** Word-overlap score normalised by chunk length (a crude stand-in for cosine similarity). */
export function score(question: string, text: string): number {
  const q = terms(question);
  const c = terms(text);
  let overlap = 0;
  for (const t of q) if (c.has(t)) overlap += 1;
  return c.size === 0 ? 0 : overlap / Math.sqrt(c.size);
}

/** Retrieval: every chunk scored and sorted. Ties keep corpus order. */
export function retrieve(question: string, chunks: Chunk[]): Scored[] {
  return chunks
    .map((c, i) => ({ ...c, score: score(question, c.text), i }))
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map(({ i: _i, ...rest }) => rest);
}

/** Toy reranker: drop superseded documents, then prefer chunks sharing adjacent word pairs with the question. */
export function rerank(question: string, candidates: Scored[]): Scored[] {
  const words = question
    .toLowerCase()
    .replace(/[^a-z0-9$\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const pairs = words.slice(1).map((w, i) => `${words[i]} ${w}`);
  return candidates
    .filter((c) => c.current)
    .map((c, i) => {
      const lower = c.text.toLowerCase();
      const phraseBonus = pairs.filter((p) => lower.includes(p)).length * 0.5;
      return { ...c, score: c.score + phraseBonus, i };
    })
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map(({ i: _i, ...rest }) => rest);
}

export type Verdict = "correct" | "conflicting" | "outdated" | "not-found";

export function answer(question: QuestionId, context: Chunk[]): { text: string; verdict: Verdict } {
  const fact = FACTS[question];
  const cite = (re: RegExp) => context.findIndex((c) => re.test(c.text)) + 1;
  const current = cite(fact.current);
  const outdated = fact.outdated ? cite(fact.outdated) : 0;
  const responses: Record<QuestionId, { correct: string; conflicting: string; outdated: string }> =
    {
      approval: {
        correct: `Your manager must approve it before you book — hotel and travel costs over $500 need manager approval [${current}].`,
        conflicting: `The documents disagree: one says costs over $500 need your manager's approval [${current}], another says only expenses over $1,000 need a director's approval [${outdated}]. Please check which policy is current.`,
        outdated: `A $700 booking doesn't need approval — only expenses over $1,000 do, and those need a director [${outdated}].`,
      },
      deadline: {
        correct: `You have 30 days from the purchase to submit an expense claim [${current}].`,
        conflicting: `The documents disagree: one says 30 days [${current}], another says 60 days [${outdated}]. Please check which policy is current.`,
        outdated: `You have 60 days from the purchase to submit an expense claim [${outdated}].`,
      },
      stipend: {
        correct: `There is a one-time equipment stipend of $300 for things like a desk chair or monitor [${current}].`,
        conflicting: "",
        outdated: "",
      },
      gym: { correct: "", conflicting: "", outdated: "" },
    };
  if (current && outdated) return { text: responses[question].conflicting, verdict: "conflicting" };
  if (current) return { text: responses[question].correct, verdict: "correct" };
  if (outdated) return { text: responses[question].outdated, verdict: "outdated" };
  return { text: "I couldn't find this in the provided documents.", verdict: "not-found" };
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  correct: "Correct and grounded",
  conflicting: "Grounded, but sources conflict",
  outdated: "Grounded in an outdated source — wrong",
  "not-found": "Grounded refusal — the answer wasn't retrieved",
};

export function buildPrompt(question: string, context: Chunk[]): string {
  return [
    "Answer the question using only the numbered context. Cite sources like [1].",
    "If the answer is not in the context, say you couldn't find it.",
    "",
    ...context.map((c, i) => `[${i + 1}] (${c.docTitle}) ${c.text}`),
    "",
    `Question: ${question}`,
  ].join("\n");
}

const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;

export type Stage =
  | "documents"
  | "chunking"
  | "indexing"
  | "question"
  | "retrieval"
  | "reranking"
  | "context"
  | "generation";

export type RagState = {
  stage: Stage;
  params: RagParams;
  question: string;
  corpus: Doc[];
  chunks: Chunk[];
  retrieved: Scored[];
  reranked: Scored[] | null;
  context: Chunk[];
  prompt: string;
  contextWords: number;
  answer: { text: string; verdict: Verdict } | null;
};

export function ragSteps(params: RagParams): WalkthroughStep<RagState>[] {
  const corpus = CORPUS.filter((d) => params.includeSuperseded || d.current);
  const question = FACTS[params.question].question;
  const chunks = chunk(corpus, params.chunking);
  const retrieved = retrieve(question, chunks);
  const reranked = params.rerank ? rerank(question, retrieved) : null;
  const context = (reranked ?? retrieved).slice(0, params.topK);
  const prompt = buildPrompt(question, context);
  const result = answer(params.question, context);
  const base: RagState = {
    stage: "documents",
    params,
    question,
    corpus,
    chunks,
    retrieved,
    reranked,
    context,
    prompt,
    contextWords: context.reduce((n, c) => n + wordCount(c.text), 0),
    answer: null,
  };
  const at = (stage: Stage, extra: Partial<RagState> = {}) => ({ ...base, stage, ...extra });

  const steps: WalkthroughStep<RagState>[] = [
    {
      title: "Documents",
      caption: `The knowledge base: ${corpus.length} internal documents${params.includeSuperseded ? ", including an outdated 2023 policy nobody deleted" : ""}. The model was never trained on any of them.`,
      state: at("documents"),
    },
    {
      title: "Chunking",
      caption:
        params.chunking === "sentence"
          ? `Each document is split into sentences, giving ${chunks.length} small chunks. Small chunks match precisely but lose surrounding context.`
          : `Each document stays whole: ${chunks.length} large chunks. Large chunks keep context but mix several topics, which dilutes relevance scores.`,
      state: at("chunking"),
    },
    {
      title: "Embedding and indexing",
      caption:
        "Each chunk is turned into a vector and stored in an index. In this teaching model the 'vector' is the set of significant words in the chunk.",
      state: at("indexing"),
    },
    {
      title: "The question arrives",
      caption: `“${question}” is embedded the same way as the chunks.`,
      state: at("question"),
    },
    {
      title: "Retrieval",
      caption: `Every chunk is scored against the question and ranked. The top result is “${retrieved[0]?.text}” from ${retrieved[0]?.docTitle}.`,
      state: at("retrieval"),
    },
  ];
  if (reranked) {
    steps.push({
      title: "Reranking",
      caption: `The reranker re-scores candidates more carefully and drops superseded documents, leaving ${reranked.length} candidates.`,
      state: at("reranking"),
    });
  }
  steps.push(
    {
      title: "Context construction",
      caption: `The top ${params.topK} chunk${params.topK === 1 ? "" : "s"} (${base.contextWords} words) are numbered and placed in the prompt with instructions to answer only from them and cite sources.`,
      state: at("context"),
    },
    {
      title: "Generation",
      caption: `${VERDICT_LABEL[result.verdict]}. The model can only be as right as the context it was given.`,
      state: at("generation", { answer: result }),
      events: [
        {
          message: `${VERDICT_LABEL[result.verdict]}`,
          tone:
            result.verdict === "correct"
              ? "success"
              : result.verdict === "outdated"
                ? "error"
                : "warning",
        },
      ],
    },
  );
  return steps;
}

export const ragFrames = (params: RagParams) => walkthroughFrames(ragSteps(params));
