import { defineLesson } from "@/lib/content/schema";

export default defineLesson({
  slug: "tokenization",
  domain: "ai",
  module: "language-models",
  order: 10,
  title: "Tokens and tokenization",
  description:
    "How language models split text into tokens with byte-pair encoding, why token counts drive context limits and cost, and why models stumble on spelling and numbers.",
  difficulty: "beginner",
  related: ["ai/embeddings", "ai/how-rag-works"],
  tags: ["tokens", "tokenization", "bpe", "llm", "nlp"],
  references: [
    {
      title: "Neural Machine Translation of Rare Words with Subword Units",
      url: "https://arxiv.org/abs/1508.07909",
      publisher: "Sennrich, Haddow and Birch, 2016",
      kind: "paper",
    },
    {
      title:
        "SentencePiece: A simple and language independent subword tokenizer and detokenizer for Neural Text Processing",
      url: "https://arxiv.org/abs/1808.06226",
      publisher: "Kudo and Richardson, 2018",
      kind: "paper",
    },
    {
      title: "Summary of the tokenizers",
      url: "https://huggingface.co/docs/transformers/tokenizer_summary",
      publisher: "Hugging Face",
      kind: "official-docs",
    },
    {
      title: "tiktoken: a fast BPE tokeniser for use with OpenAI's models",
      url: "https://github.com/openai/tiktoken",
      publisher: "OpenAI",
      kind: "official-docs",
    },
  ],
  lastReviewed: "2026-10-13",
  status: "published",
});
