import { defineInterview } from "@/lib/content/schema";

export default defineInterview([
  {
    id: "why-subword-tokenization",
    question: "Why do language models use subword tokenization instead of words or characters?",
    level: "junior",
    kind: "concept",
    answer:
      "Word vocabularies explode in size and still can't represent new or misspelled words, while character sequences are long and expensive to process. Subword methods such as BPE give frequent words their own tokens and build rare words from reusable pieces, keeping sequences short with no unknown words.",
    rubric: {
      core: [
        "Word vocabularies are huge and still can't represent new or misspelled words",
        "Character sequences are long and expensive to process",
        "Subword methods give frequent words one token and build rare words from pieces",
      ],
      strong: ["Mentions that byte-level BPE can tokenize any input"],
      redFlags: ["Says one token is one word"],
    },
  },
  {
    id: "byte-pair-encoding",
    question: "Explain how byte-pair encoding builds its vocabulary.",
    level: "mid",
    kind: "concept",
    answer:
      "Start from single characters (or bytes) for every word in a corpus. Repeatedly count all adjacent symbol pairs, weighted by word frequency, merge the most frequent pair into a new symbol and add it to the vocabulary, until the vocabulary reaches the target size. Tokenizing new text applies the learned merges in the same order.",
    rubric: {
      core: [
        "Starts from single characters or bytes",
        "Repeatedly merges the most frequent adjacent pair, weighted by word frequency",
        "Stops at a target vocabulary size; tokenizing applies the merges in the learned order",
      ],
      strong: ["Mentions the end-of-word marker or the byte-level variant"],
      redFlags: ["Describes splitting on spaces and punctuation only"],
    },
  },
  {
    id: "counting-letters",
    question: "Why might an LLM struggle to count the letters in a word?",
    level: "mid",
    kind: "concept",
    answer:
      "The model never sees the individual letters: the word reaches it as one or a few token ids, and the spelling inside each token is only indirectly encoded. Character-level tasks therefore depend on knowledge the model has to infer rather than read directly.",
    rubric: {
      core: [
        "The model sees token ids, not individual letters",
        "Spelling inside a token is only indirectly encoded",
      ],
      strong: ["Connects this to numbers being split into arbitrary chunks"],
      redFlags: ["Blames the problem only on a lack of training data"],
    },
  },
  {
    id: "cost-by-language",
    question: "Why can the same prompt cost more in one language than another?",
    level: "mid",
    kind: "trade-off",
    answer:
      "Pricing and limits are per token, and tokenizers trained mostly on one language split other languages into more, shorter tokens. The same meaning therefore needs more tokens, costing more and using more of the context window.",
    rubric: {
      core: [
        "Pricing and context limits are counted in tokens",
        "Tokenizers trained mostly on one language split others into more tokens",
        "The same meaning costs more and uses more of the context window",
      ],
      strong: ["Suggests measuring token usage by language"],
      redFlags: ["Estimates cost from word counts"],
    },
  },
]);
