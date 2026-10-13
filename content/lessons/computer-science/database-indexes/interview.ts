import { defineInterview } from "@/lib/content/schema";

export default defineInterview([
  {
    id: "why-b-trees",
    question:
      "Why are B-trees the default index structure for databases, rather than hash tables or binary trees?",
    level: "mid",
    kind: "concept",
    answer:
      "B-trees keep keys sorted, so one structure serves equality lookups, range queries and ordered results. Each node is a whole disk page holding hundreds of keys, so the tree is only a few levels deep even for huge tables, which minimises page reads. They stay balanced automatically under inserts and deletes. A hash index only supports equality, and a binary tree would be far deeper, with one page read per level.",
    rubric: {
      core: [
        "Sorted keys serve equality, range queries and ordered results from one structure",
        "Each node is a page holding many keys, so the tree is only a few levels deep",
        "The tree stays balanced under inserts and deletes",
      ],
      strong: ["Contrasts it with hash indexes (equality only) and much deeper binary trees"],
      redFlags: ["Says a B-tree is a binary tree"],
    },
  },
  {
    id: "cost-of-an-index",
    question: "What does an index cost, and how do you decide whether to add one?",
    level: "mid",
    kind: "trade-off",
    answer:
      "Every write to an indexed column must also update the index, indexes use storage and memory, and they add maintenance. Add one when a frequent or latency-sensitive query filters, joins or sorts on a selective column and `EXPLAIN` shows a sequential scan; measure the read improvement against the write overhead, and remove indexes that statistics show are unused.",
    rubric: {
      core: [
        "Every write must also update each affected index",
        "Indexes use storage and memory",
        "Adds an index when a frequent or slow query shows a sequential scan in EXPLAIN",
      ],
      strong: ["Removes indexes that usage statistics show are unused"],
      redFlags: ["Says more indexes always make the database faster"],
    },
  },
  {
    id: "multicolumn-index-order",
    question:
      "You have an index on (customer_id, created_at). Which of these queries can use it efficiently: filtering on customer_id, on created_at, or on both?",
    level: "mid",
    kind: "concept",
    answer:
      "Filtering on `customer_id`, and on both `customer_id` and `created_at`, can use it efficiently because `customer_id` is the leading column; the index can also return each customer's rows already ordered by `created_at`. Filtering on `created_at` alone generally cannot use it efficiently, because entries are sorted by `customer_id` first.",
    rubric: {
      core: [
        "Filtering on customer_id, or on both columns, can use the index efficiently",
        "Filtering on created_at alone generally can't, because entries are sorted by customer_id first",
      ],
      strong: ["Notes the index returns each customer's rows already ordered by created_at"],
      redFlags: ["Says column order in the index doesn't matter"],
    },
  },
  {
    id: "planner-chooses-sequential-scan",
    question:
      "Why might the database choose a sequential scan even though an index exists on the filtered column?",
    level: "senior",
    kind: "debugging",
    answer:
      "If the filter matches a large share of rows, scanning the table sequentially reads fewer pages overall than following the index to many scattered table pages. The planner estimates selectivity from statistics and picks the cheaper plan. Stale statistics can also mislead it, which `ANALYZE` fixes.",
    rubric: {
      core: [
        "When a filter matches a large share of rows, a sequential scan reads fewer pages overall",
        "The planner estimates selectivity from statistics and picks the cheaper plan",
      ],
      strong: ["Mentions stale statistics and refreshing them with ANALYZE"],
      redFlags: ["Calls an unused index a database bug"],
    },
  },
]);
