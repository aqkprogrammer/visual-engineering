import { defineQuiz } from "@/lib/content/schema";

export default defineQuiz([
  {
    id: "lookup-cost",
    prompt:
      "A table holds 10 million rows. Roughly how many pages does a B-tree index lookup on its id read, compared with a full table scan?",
    options: [
      {
        id: "a",
        text: "About the same — the index still has to look at every row.",
        explanation:
          "The index never looks at every row; each level discards all but one child page.",
      },
      {
        id: "b",
        text: "A handful (one per tree level plus the table page) versus the entire table.",
        correct: true,
        explanation:
          "With hundreds of entries per page the tree is only three or four levels deep, while a full scan reads every page of the table.",
      },
      {
        id: "c",
        text: "Half as many, because the index is sorted.",
        explanation:
          "Sorting enables a tree search that touches only one page per level — far better than halving the work.",
      },
    ],
  },
  {
    id: "write-cost",
    prompt: "A table has eight indexes. What happens to the cost of inserting a row?",
    options: [
      {
        id: "a",
        text: "Nothing — indexes only affect reads.",
        explanation:
          "Every index must be updated when a row is inserted, so writes pay for every index.",
      },
      {
        id: "b",
        text: "Each insert must also write to all eight indexes, occasionally splitting pages.",
        correct: true,
        explanation: "That is the price of faster reads. Unused indexes are pure overhead.",
      },
      {
        id: "c",
        text: "Inserts get faster because the database knows where rows go.",
        explanation: "Rows still go into the table; indexes add work on top.",
      },
    ],
  },
  {
    id: "leading-column",
    prompt:
      "There is an index on (customer_id, created_at). Which query is least likely to use it efficiently?",
    options: [
      {
        id: "a",
        text: "WHERE customer_id = 42",
        explanation: "customer_id is the leading column, so the index finds these rows directly.",
      },
      {
        id: "b",
        text: "WHERE customer_id = 42 AND created_at > '2026-01-01'",
        explanation: "Both columns are constrained in index order — an ideal case.",
      },
      {
        id: "c",
        text: "WHERE created_at > '2026-01-01'",
        correct: true,
        explanation:
          "Entries are sorted by customer_id first, so dates are scattered through the index. This query usually needs its own index on created_at.",
      },
    ],
  },
  {
    id: "planner-ignores",
    prompt:
      "90% of rows have status = 'active'. Why might the database ignore an index on status for WHERE status = 'active'?",
    options: [
      {
        id: "a",
        text: "Reading the table sequentially is cheaper than jumping between the index and most of the table's pages.",
        correct: true,
        explanation:
          "The planner estimates selectivity from statistics; for low-selectivity filters a sequential scan wins.",
      },
      {
        id: "b",
        text: "Indexes don't work on text columns.",
        explanation: "B-tree indexes work fine on text; the issue is how many rows match.",
      },
      {
        id: "c",
        text: "The index is corrupted.",
        explanation:
          "Corruption is rare; choosing a scan for a non-selective filter is normal, intended behaviour.",
      },
    ],
  },
]);
