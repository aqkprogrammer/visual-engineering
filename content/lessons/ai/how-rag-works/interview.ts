import { defineInterview } from "@/lib/content/schema";

export default defineInterview([
  {
    id: "rag-components",
    question: "Walk through the components of a RAG system and what each is responsible for.",
    level: "mid",
    kind: "design",
    answer:
      "Ingestion extracts text from source documents; chunking splits it into retrievable passages; an embedding model turns chunks and queries into vectors; a vector index stores them for nearest-neighbour search, with metadata for filtering; an optional reranker re-scores candidates more accurately; context construction selects the top passages and builds a prompt with instructions and citations; the LLM generates the answer; and an evaluation loop measures retrieval recall and answer faithfulness.",
    rubric: {
      core: [
        "Ingestion and chunking of source documents",
        "An embedding model and a vector index with metadata for filtering",
        "Retrieval, optional reranking, and building a context with citations",
        "Generation plus an evaluation loop for retrieval and answers",
      ],
      strong: ["Separates offline indexing from the online answering path"],
      redFlags: ["Describes RAG as just a vector database"],
    },
  },
  {
    id: "confident-wrong-answers",
    question: "Your RAG chatbot gives confident, cited, but wrong answers. How do you debug it?",
    level: "senior",
    kind: "debugging",
    answer:
      "Separate retrieval from generation. Log the retrieved chunks for failing questions and check whether the correct passage was retrieved at all. If not, look at extraction, chunking, the embedding model, filters and whether outdated documents are outranking current ones. If the right passage was retrieved, examine the prompt: instructions, ordering and truncation. Build an evaluation set so fixes can be measured.",
    rubric: {
      core: [
        "Separates retrieval from generation by logging the retrieved chunks",
        "If the right passage wasn't retrieved: checks extraction, chunking, embeddings, filters and outdated documents",
        "If it was retrieved: inspects the prompt's instructions, ordering and truncation",
      ],
      strong: ["Builds an evaluation set so fixes can be measured"],
      redFlags: ["Jumps straight to switching the language model"],
    },
  },
  {
    id: "chunk-size-and-top-k",
    question: "How do you choose chunk size and top-k?",
    level: "mid",
    kind: "trade-off",
    answer:
      "Start from the structure of your documents and the questions users ask, then measure. Smaller chunks give more precise matches but lose context; larger chunks keep context but dilute relevance and consume tokens. Higher k raises the chance of including the answer but adds noise, cost and latency. Evaluate recall at k and answer quality on a representative question set and tune from there.",
    rubric: {
      core: [
        "Smaller chunks match precisely but lose surrounding context",
        "Larger chunks keep context but dilute relevance and use more tokens",
        "A higher k raises recall but adds noise, cost and latency",
        "Tunes both by measuring recall at k and answer quality",
      ],
      strong: ["Starts from the documents' structure and real user questions"],
      redFlags: ["Picks values without measuring"],
    },
  },
  {
    id: "rag-permissions",
    question: "How do you stop a RAG system from leaking documents a user isn't allowed to see?",
    level: "senior",
    kind: "design",
    answer:
      "Store access-control metadata with every chunk and filter retrieval by the requesting user's permissions before anything reaches the prompt. Never rely on the model to withhold information it has been given. Also log retrievals, and treat retrieved content as untrusted to limit prompt-injection risks.",
    rubric: {
      core: [
        "Stores access-control metadata with every chunk",
        "Filters by the user's permissions at retrieval time, before anything reaches the prompt",
        "Never relies on the model to withhold information it was given",
      ],
      strong: ["Treats retrieved content as untrusted because of prompt injection"],
      redFlags: ["Tells the model not to reveal restricted text"],
    },
  },
]);
