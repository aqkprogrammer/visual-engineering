import { defineQuiz } from "@/lib/content/schema";

export default defineQuiz([
  {
    id: "bpe-step",
    prompt: "What does one training step of byte-pair encoding do?",
    options: [
      {
        id: "a",
        text: "Merges the most frequent adjacent pair of symbols in the corpus into a new vocabulary entry.",
        correct: true,
        explanation:
          "Repeating this builds a vocabulary of frequent pieces, from common endings to whole common words.",
      },
      {
        id: "b",
        text: "Splits every word into its dictionary roots and suffixes.",
        explanation:
          "BPE knows nothing about grammar; its pieces come purely from frequency statistics.",
      },
      {
        id: "c",
        text: "Removes the least frequent words from the vocabulary.",
        explanation:
          "BPE only adds merged symbols; rare words are represented by smaller pieces instead.",
      },
    ],
  },
  {
    id: "unknown-word",
    prompt:
      "A byte-level BPE tokenizer meets a brand-new product name it has never seen. What happens?",
    options: [
      {
        id: "a",
        text: "It becomes a single 'unknown' token.",
        explanation:
          "Byte-level tokenizers have every byte in their base vocabulary, so nothing is unknown.",
      },
      {
        id: "b",
        text: "It is split into smaller known pieces, down to single bytes if necessary.",
        correct: true,
        explanation:
          "That's the core advantage of subword tokenization: rare words cost more tokens but are always representable.",
      },
      {
        id: "c",
        text: "The tokenizer adds it to the vocabulary on the fly.",
        explanation:
          "Vocabularies are fixed after training; the model only understands the ids it was trained with.",
      },
    ],
  },
  {
    id: "budget",
    prompt:
      "You estimate a prompt's size by counting words, and the API rejects it for exceeding the context limit. Why?",
    options: [
      {
        id: "a",
        text: "Limits are measured in tokens, and text often has more tokens than words.",
        correct: true,
        explanation:
          "Punctuation, spaces, rare words, code and non-English text all add tokens. Count with the model's tokenizer.",
      },
      {
        id: "b",
        text: "The API counts characters, not words.",
        explanation: "Context limits are quoted in tokens, not characters.",
      },
      {
        id: "c",
        text: "System prompts are free, so they can't be the cause.",
        explanation:
          "System prompts, history and retrieved context all count toward the same token budget.",
      },
    ],
  },
  {
    id: "letters",
    prompt: "Why can a model miscount the letters in a word like 'strawberry'?",
    options: [
      {
        id: "a",
        text: "It sees token ids for chunks of the word, not the individual letters.",
        correct: true,
        explanation:
          "The spelling inside each token is only indirectly known to the model, so character-level tasks are surprisingly hard.",
      },
      {
        id: "b",
        text: "Models are not trained on English.",
        explanation:
          "The model may know English very well; the issue is how text is presented to it.",
      },
      {
        id: "c",
        text: "The tokenizer deletes repeated letters.",
        explanation: "Tokenization is lossless — decoding the tokens gives back the original text.",
      },
    ],
  },
]);
