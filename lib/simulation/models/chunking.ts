/**
 * Teaching model of document chunking for retrieval, over a short fictional runbook.
 *
 * Simplifications (shown to learners):
 * - Sizes are counted in words. Real splitters count characters or tokens.
 * - Retrieval uses the same word-overlap score as the RAG demo, standing in for embedding
 *   similarity, so you can see why each chunk matched.
 * - A question counts as answerable when every word of its evidence is inside the retrieved
 *   chunks. Real systems also depend on how well the model reads them.
 */
import { score } from "./rag";

export type Section = { heading: string; sentences: string[] };

export const RUNBOOK: Section[] = [
  {
    heading: "Overview",
    sentences: [
      "The payments service takes card payments for the online shop and issues refunds.",
      "It runs in two zones and stores every transaction in a PostgreSQL database.",
      "Most alerts clear on their own within five minutes, so wait before acting.",
    ],
  },
  {
    heading: "Refunds stuck in pending",
    sentences: [
      "Refunds normally reach the card network within ten minutes.",
      "If a refund has been pending for over an hour, run the refund retry job from the admin console.",
      "Never run the job more than twice in one hour, because the card network blocks merchants that resend refunds repeatedly.",
      "If the second run fails, open a ticket with the card network.",
    ],
  },
  {
    heading: "Database failover",
    sentences: [
      "Fail over only when the primary database has been unreachable for ten minutes.",
      "A failover promotes the standby in the other zone and takes about two minutes.",
      "The on-call lead must approve it before you start.",
      "Payments fail while it runs, so post a notice on the status page first.",
    ],
  },
  {
    heading: "Escalation",
    sentences: [
      "Page the payments on-call engineer for any customer-facing outage.",
      "If they do not respond within fifteen minutes, page the engineering manager.",
    ],
  },
];

export type Unit = {
  kind: "heading" | "sentence";
  section: number;
  text: string;
  /** Word range [start, end) in the whole document. */
  start: number;
  end: number;
};

export function layout(sections: Section[] = RUNBOOK): { words: string[]; units: Unit[] } {
  const words: string[] = [];
  const units: Unit[] = [];
  sections.forEach((section, s) => {
    for (const [kind, text] of [
      ["heading", section.heading] as const,
      ...section.sentences.map((t) => ["sentence", t] as const),
    ]) {
      const parts = text.split(/\s+/);
      units.push({ kind, section: s, text, start: words.length, end: words.length + parts.length });
      words.push(...parts);
    }
  });
  return { words, units };
}

export type Strategy = "fixed" | "sentence" | "structure";

export type ChunkingParams = {
  strategy: Strategy;
  /** Maximum chunk size in words. */
  size: number;
  /** Words repeated from the end of one chunk at the start of the next. */
  overlap: number;
  /** Prefix every chunk with its section heading before scoring ("contextual" chunks). */
  headings: boolean;
  /** Chunks retrieved per question. */
  topK: number;
};

export const DEFAULT_CHUNKING_PARAMS: ChunkingParams = {
  strategy: "fixed",
  size: 30,
  overlap: 0,
  headings: false,
  topK: 1,
};

export const SIZES = [30, 60, 120] as const;
export const OVERLAPS = [0, 10, 20] as const;

export type Chunk = {
  index: number;
  start: number;
  end: number;
  section: number;
  text: string;
  /** What gets scored: the text, with the heading in front when headings are on. */
  indexed: string;
  /** Starts or ends in the middle of a sentence. */
  cutsSentence: boolean;
};

type Range = { start: number; end: number };

function fixedRanges(total: number, size: number, overlap: number): Range[] {
  const ranges: Range[] = [];
  const step = Math.max(1, size - overlap);
  for (let start = 0; start < total; start += step) {
    const end = Math.min(total, start + size);
    ranges.push({ start, end });
    if (end === total) break;
  }
  return ranges;
}

/**
 * Packs whole units into chunks of at most `size` words, carrying trailing units of up to
 * `overlap` words into the next chunk. A unit longer than `size` is split by words — the last
 * resort of a recursive splitter.
 */
function packRanges(units: Unit[], size: number, overlap: number): Range[] {
  const ranges: Range[] = [];
  let current: Unit[] = [];
  const length = (us: Unit[]) => us.reduce((n, u) => n + u.end - u.start, 0);
  const flush = () => {
    if (current.length === 0) return;
    ranges.push({ start: current[0]!.start, end: current.at(-1)!.end });
    const carried: Unit[] = [];
    for (let i = current.length - 1; i > 0; i--) {
      if (length([current[i]!, ...carried]) > overlap) break;
      carried.unshift(current[i]!);
    }
    current = carried;
  };
  for (const unit of units) {
    const words = unit.end - unit.start;
    if (words > size) {
      flush();
      current = [];
      for (const r of fixedRanges(words, size, 0)) {
        ranges.push({ start: unit.start + r.start, end: unit.start + r.end });
      }
      continue;
    }
    if (current.length > 0 && length(current) + words > size) {
      flush();
      while (current.length > 0 && length(current) + words > size) current.shift();
    }
    current.push(unit);
  }
  flush();
  return ranges;
}

export function chunkDocument(
  params: Pick<ChunkingParams, "strategy" | "size" | "overlap" | "headings">,
  sections: Section[] = RUNBOOK,
): Chunk[] {
  const { words, units } = layout(sections);
  let ranges: Range[];
  if (params.strategy === "fixed") {
    ranges = fixedRanges(words.length, params.size, params.overlap);
  } else if (params.strategy === "sentence") {
    ranges = packRanges(units, params.size, params.overlap);
  } else {
    // Structure-aware: never cross a section boundary; within a section, pack whole sentences.
    ranges = sections.flatMap((_, s) =>
      packRanges(
        units.filter((u) => u.section === s),
        params.size,
        params.overlap,
      ),
    );
  }
  const boundaries = new Set(units.flatMap((u) => [u.start, u.end]));
  const sectionAt = (word: number) => units.find((u) => word >= u.start && word < u.end)!.section;
  return ranges.map((r, index) => {
    const section = sectionAt(r.start);
    const text = words.slice(r.start, r.end).join(" ");
    return {
      index,
      start: r.start,
      end: r.end,
      section,
      text,
      indexed: params.headings ? `${sections[section]!.heading}: ${text}` : text,
      cutsSentence: !boundaries.has(r.start) || !boundaries.has(r.end),
    };
  });
}

export type ChunkQuestion = {
  id: string;
  text: string;
  /** Indexes into the flattened sentence list (see `evidenceUnits`). */
  evidence: { section: number; sentence: number }[];
  why: string;
};

export const CHUNK_QUESTIONS: ChunkQuestion[] = [
  {
    id: "retry",
    text: "A refund has been pending for two hours. Should I run the refund retry job?",
    evidence: [
      { section: 1, sentence: 1 },
      { section: 1, sentence: 2 },
    ],
    why: "The instruction and its warning are in neighbouring sentences: an answer with only the first one risks getting the shop blocked.",
  },
  {
    id: "approval",
    text: "Who has to approve a database failover?",
    evidence: [{ section: 2, sentence: 2 }],
    why: "The answer says the lead must approve “it” — only the heading and the sentences before it say what “it” is.",
  },
  {
    id: "escalate",
    text: "Who do I page if the on-call engineer does not respond?",
    evidence: [{ section: 3, sentence: 1 }],
    why: "A short answer in a short section.",
  },
];

export type Verdict = "answerable" | "partial" | "missed";

export type QuestionResult = {
  question: ChunkQuestion;
  ranked: { chunk: Chunk; score: number }[];
  retrieved: Chunk[];
  /** Share of evidence words inside the retrieved chunks. */
  coverage: number;
  /** Words the model would receive: every retrieved chunk, headings included. */
  sentWords: number;
  /** Share of the words sent that are evidence. */
  relevantShare: number;
  verdict: Verdict;
};

export function evidenceRanges(question: ChunkQuestion, sections: Section[] = RUNBOOK): Range[] {
  const { units } = layout(sections);
  return question.evidence.map(({ section, sentence }) => {
    const unit = units.filter((u) => u.section === section && u.kind === "sentence")[sentence]!;
    return { start: unit.start, end: unit.end };
  });
}

export function answerQuestion(
  question: ChunkQuestion,
  chunks: Chunk[],
  topK: number,
  sections: Section[] = RUNBOOK,
): QuestionResult {
  const ranked = chunks
    .map((chunk) => ({ chunk, score: score(question.text, chunk.indexed) }))
    .sort((a, b) => b.score - a.score || a.chunk.index - b.chunk.index);
  const retrieved = ranked.slice(0, topK).map((r) => r.chunk);
  let needed = 0;
  let covered = 0;
  for (const range of evidenceRanges(question, sections)) {
    for (let w = range.start; w < range.end; w++) {
      needed += 1;
      if (retrieved.some((c) => w >= c.start && w < c.end)) covered += 1;
    }
  }
  const coverage = needed === 0 ? 0 : covered / needed;
  const verdict: Verdict = coverage === 1 ? "answerable" : coverage > 0 ? "partial" : "missed";
  const sentWords = retrieved.reduce((n, c) => n + c.indexed.split(/\s+/).length, 0);
  const relevantShare = sentWords === 0 ? 0 : covered / sentWords;
  return { question, ranked, retrieved, coverage, sentWords, relevantShare, verdict };
}

export type ChunkingResult = {
  chunks: Chunk[];
  documentWords: number;
  indexedWords: number;
  cutSentences: number;
  questions: QuestionResult[];
};

export function runChunking(params: ChunkingParams, sections: Section[] = RUNBOOK): ChunkingResult {
  const chunks = chunkDocument(params, sections);
  const { words } = layout(sections);
  return {
    chunks,
    documentWords: words.length,
    indexedWords: chunks.reduce((n, c) => n + c.indexed.split(/\s+/).length, 0),
    cutSentences: chunks.filter((c) => c.cutsSentence).length,
    questions: CHUNK_QUESTIONS.map((q) => answerQuestion(q, chunks, params.topK, sections)),
  };
}
