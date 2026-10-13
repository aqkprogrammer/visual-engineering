# Lesson authoring guide

How to write a lesson, and the other content around it: learning paths, glossary terms and incidents. Everything here is checked by `pnpm content`, which reports every problem at once.

## A lesson's files

```
content/lessons/<domain>/<slug>/
  meta.ts         title, description, difficulty, links, references   (defineLesson)
  index.mdx       the lesson itself
  quiz.ts         3–8 knowledge-check questions                       (defineQuiz)
  interview.ts    3–8 interview questions with rubrics                (defineInterview)
```

The folder must match `domain` and `slug` in `meta.ts`, and the module must exist in `content/domains.ts`. A lesson is visible everywhere only when `status: "published"`; drafts show in `pnpm dev` only. A published lesson needs a quiz, interview questions and at least 300 words.

## The shape of a lesson

Every published lesson follows the same arc, so readers always know where they are. Use these sections, in this order, adapting headings to the topic:

1. **`<Definition>`** — one or two sentences a newcomer can understand.
2. **The problem it solves** — why this exists; what goes wrong without it.
3. **An everyday analogy** — in `<Analogy>`, followed by a paragraph starting "Where the analogy breaks down".
4. **See it in action** — `<Demo slug="…" />`, then three or four "Things to try" that each teach one thing.
5. **Step by step** — the mechanism as an ordered list inside `<Steps>`.
6. **Under the hood** — the real terminology, protocols and internals.
7. **An example** — a short code or configuration sample, with the language on the code fence.
8. **In production** — how it is operated, monitored and scaled.
9. **Trade-offs** — `<TradeOffs use={[…]} avoid={[…]} />`.
10. **Common misconceptions** — each as a bold, quoted misconception followed by the correction.
11. **Failure modes and debugging** — symptom first, then cause and what to check.

Interview questions and the knowledge check are rendered after the body from `interview.ts` and `quiz.ts`; don't write them in the MDX.

### Components available in MDX

| Component                                                    | Use                                                           |
| ------------------------------------------------------------ | ------------------------------------------------------------- |
| `<Definition>`                                               | The opening definition                                        |
| `<Analogy>`                                                  | An everyday comparison, labelled as one                       |
| `<Callout kind="note \| warning \| illustrative" title="…">` | Asides; `illustrative` marks made-up numbers or examples      |
| `<Steps>`                                                    | Wraps an ordered list                                         |
| `<TradeOffs use={[…]} avoid={[…]} />`                        | When to use it and when not to                                |
| `<Demo slug="…" />`                                          | Any demo in `content/playground.ts`, loaded only on this page |

Leave a blank line after an opening tag and before a closing tag, so the content inside is parsed as Markdown. MDX files are deliberately excluded from Prettier, which would reflow those blocks.

Never import a simulation component directly; `pnpm content` rejects it, because it would add that simulation to every lesson page's JavaScript.

## Writing style

- **Plain language first.** Define a term the first time it appears. Prefer short sentences and concrete examples.
- **One idea per paragraph.** Readers skim; bold the key term in the paragraph that explains it.
- **British or American spelling — be consistent within a lesson.** The existing lessons use British spelling.
- **Numbers.** Real defaults and limits must be cited ("30 seconds by default in Amazon SQS"). Anything made up for teaching is labelled illustrative, in the text or with `<Callout kind="illustrative">`.
- **No vendor favouritism.** Name products when they are the clearest example, and say when something is specific to one product.

## Accuracy and sources

- Verify every factual claim against a primary source: official documentation, a specification or RFC, or a paper. Secondary articles can guide you, but cite the primary source.
- `meta.ts` needs at least two `https` references. List official docs and specifications first.
- Write in your own words. Don't copy text, diagrams or code from sources; link to them instead.
- Set `lastReviewed` to the date you last checked the facts, and update it when you re-check.

## Knowledge checks (`quiz.ts`)

- 3–8 questions, each with 2–5 options and **exactly one** correct option.
- Every option has an explanation of why it is right or wrong. Wrong options should be plausible misconceptions, not jokes.
- Options are shown in a stable shuffled order, so don't rely on position ("all of the above").

## Interview questions (`interview.ts`)

Each question has:

- `level` — `junior`, `mid` or `senior`: the level at which a candidate should answer it well.
- `kind` — `concept`, `design`, `debugging` or `trade-off`.
- `answer` — a model answer in full sentences. Inline `code` is allowed.
- `rubric` — the published grading rubric:
  - `core`: 2–5 points every good answer covers;
  - `strong`: up to 3 signs of a strong answer;
  - `redFlags`: 1–3 common mistakes.

Ids must be unique across all lessons; they become links such as `/interview/#cache-stampede`. Learners grade themselves by ticking rubric points, so write each point as something you can clearly say you did or didn't cover.

## Learning paths (`content/paths.ts`)

A path is an ordered list of published lessons, each with a sentence explaining why it comes at that point. Every lesson's prerequisites must appear earlier in the path. Every published lesson should belong to at least one path; a test checks this.

## Glossary (`content/glossary.ts`)

One to three plain-language sentences per term, a link to the lesson that explains it, optional aliases (abbreviations and other names, which search matches) and related terms. Names and aliases must be unique.

## Incidents (`content/incidents.ts`)

An incident is a debugging exercise: a briefing, evidence, two questions (the root cause, then the best first fix), a postmortem, and steps to reproduce it in a playground demo.

Charts and logs must come from a simulation run in `lib/incidents/evidence.ts`, never be drawn by hand. Add tests to `tests/unit/incident-evidence.test.ts` that check the evidence shows exactly what the briefing, answers and postmortem claim — if a model changes later, those tests stop the story silently becoming false.

## Review checklist

Before opening a pull request for content:

- [ ] `pnpm content` passes and the lesson reads well in `pnpm dev`, in both themes.
- [ ] Every factual claim is checked against a cited primary source.
- [ ] Analogies and illustrative numbers are labelled.
- [ ] The demo's "things to try" work as described.
- [ ] Quiz explanations are correct for every option.
- [ ] Interview rubric points match the model answer.
- [ ] `lastReviewed` is today's date.
- [ ] `pnpm readme` has been run if you added or published a lesson or demo.
