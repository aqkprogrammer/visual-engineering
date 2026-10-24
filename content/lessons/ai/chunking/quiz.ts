import { defineQuiz } from "@/lib/content/schema";

export default defineQuiz([
  {
    id: "boundary-caveat",
    prompt:
      "A RAG assistant tells users to run a retry job but never mentions the documented limit of two runs an hour. The limit is in the sentence right after the instruction. What is the most likely cause?",
    options: [
      {
        id: "a",
        text: "A chunk boundary fell between the instruction and its warning, and only the instruction's chunk was retrieved.",
        correct: true,
        explanation:
          "The model can only use what it was given. Splitting on structure, overlap or retrieving neighbouring chunks keeps them together.",
      },
      {
        id: "b",
        text: "The language model is too small to understand warnings.",
        explanation:
          "Check the retrieved context first: if the warning wasn't in it, no model could use it.",
      },
      {
        id: "c",
        text: "The embedding model can't represent numbers.",
        explanation:
          "The question is about whether the warning was retrieved at all, not how numbers are embedded.",
      },
    ],
  },
  {
    id: "pronoun-chunk",
    prompt:
      "A chunk reads “The on-call lead must approve it before you start.” Why might a question about who approves a database failover fail to retrieve it?",
    options: [
      {
        id: "a",
        text: "Nothing in the chunk itself says “database” or “failover”; that context is in its heading and the sentences before it.",
        correct: true,
        explanation:
          "Prefixing chunks with their heading, or with generated context, makes them understandable — and findable — on their own.",
      },
      {
        id: "b",
        text: "The chunk is too short to be embedded.",
        explanation: "Short texts can be embedded; the problem is what this one says.",
      },
      {
        id: "c",
        text: "Vector search ignores verbs such as “approve”.",
        explanation:
          "Embeddings represent verbs too; the chunk is missing its subject, not its verb.",
      },
    ],
  },
  {
    id: "overlap-cost",
    prompt: "What does adding overlap between chunks cost?",
    options: [
      {
        id: "a",
        text: "More text to store, embed and index, and near-duplicate chunks that can both be retrieved.",
        correct: true,
        explanation:
          "Overlapped text exists in two chunks. With 20% overlap you embed and store about a fifth more text.",
      },
      {
        id: "b",
        text: "Nothing: overlap is free.",
        explanation: "Repeated text is stored and embedded again, and can be retrieved twice.",
      },
      {
        id: "c",
        text: "It makes every chunk smaller.",
        explanation: "Chunk size stays the same; there are more chunks covering the same text.",
      },
    ],
  },
  {
    id: "big-chunks",
    prompt: "Why isn't the answer to boundary problems simply to make every chunk very large?",
    options: [
      {
        id: "a",
        text: "Large chunks blend several topics, so they match questions less precisely and fill the prompt with text that isn't the answer.",
        correct: true,
        explanation:
          "In the demo, 120-word chunks answer the retry question but send three times the words of two small, well-cut chunks.",
      },
      {
        id: "b",
        text: "Embedding models can only accept one sentence at a time.",
        explanation:
          "Embedding models accept passages up to their input limit, which is usually hundreds of tokens or more.",
      },
      {
        id: "c",
        text: "Large chunks can't be cited.",
        explanation: "They can be cited; they're just less precise and more expensive to use.",
      },
    ],
  },
  {
    id: "rechunk",
    prompt: "You switch from fixed-size to structure-aware chunking. What else has to happen?",
    options: [
      {
        id: "a",
        text: "Every document is re-chunked and every new chunk embedded and indexed again.",
        correct: true,
        explanation:
          "The chunks themselves change, so their vectors do too. Build the new index alongside the old one and switch when it's ready.",
      },
      {
        id: "b",
        text: "Nothing: the existing vectors still work.",
        explanation: "The existing vectors represent the old chunks, which no longer exist.",
      },
      {
        id: "c",
        text: "Only the questions need to be re-embedded.",
        explanation:
          "Questions are embedded at query time anyway; it's the stored chunks that change.",
      },
    ],
  },
]);
