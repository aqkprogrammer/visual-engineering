# Building a simulation

Every interactive visualization uses one engine and one player. This guide shows how to add a new one; the load balancer (`lib/simulation/models/load-balancer.ts`) is the reference example.

## The three layers

| Layer         | Lives in                                                        | Rules                                                                                                              |
| ------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Model**     | `lib/simulation/models/<name>.ts`                               | Pure TypeScript, no React, no DOM, no `Math.random`, no clocks. Returns new state; never mutates its input.        |
| **Scene**     | `components/visualizations/scenes/<name>/<name>-scene.tsx`      | Renders one frame's state as SVG. No state of its own, no event handlers that change the simulation.               |
| **Container** | `components/visualizations/scenes/<name>/<name>-simulation.tsx` | `"use client"`. Runs the model, owns the action log, renders `<SimulationPlayer>` with the scene and the controls. |

Keeping these apart is what makes simulations testable without a browser and reproducible for every learner.

## 1. Write the model

Implement `SimulationModel<State, Params, Action>` from `lib/simulation/types.ts`:

```ts
export const myModel: SimulationModel<MyState, MyParams, MyAction> = {
  id: "my-model",
  init(params, rng) {
    /* initial state */
  },
  tick(state, rng) {
    /* advance one step → { state, events } */
  },
  apply(state, action) {
    /* a user action → { state, events } */
  },
  describe(state) {
    /* one plain-language sentence for screen readers */
  },
};
```

- **Randomness** comes only from the `rng` argument (seeded mulberry32). The same seed and actions must always produce the same frames.
- **Every user control is an action**, including parameter changes. `useActionLog` records each one at the next tick, so the past never changes and seeking back then acting creates a new branch.
- **Events** (`{ at, message, tone }`) feed the event log. Write them as complete sentences a learner can understand without seeing the diagram.
- **`describe`** is announced to screen readers whenever playback is paused, so include the numbers that matter.
- **Bound everything**: cap entity counts and keep rolling windows for metrics, so precomputing hundreds of frames stays fast.
- **State your assumptions** at the top of the file. They are shown to learners verbatim in the player's _Assumptions_ panel, so be specific about what is simplified, compressed or illustrative.

For authored step-by-step explanations (like the TLS handshake), skip the model: write `WalkthroughStep[]` and call `walkthroughFrames()` from `lib/simulation/run.ts`.

## 2. Test the model

Add `tests/unit/<name>-model.test.ts`. At minimum:

- determinism — the same inputs produce equal frames;
- each user action's effect, at the exact tick you expect;
- invariants that must hold in every frame (for example, a server never runs more requests than it has workers);
- the behaviour the lesson claims, such as "least connections lowers tail latency when request costs vary". If the claim isn't true in the model, either the model or the lesson is wrong.

## 3. Draw the scene

- Render an `<svg>` with `viewBox` and `className="absolute inset-0 h-full w-full"`, marked `aria-hidden`: the player provides the text alternative, the live caption and the event log.
- Colour only through design tokens (`fill-accent`, `stroke-fail`, …). Never encode state in colour alone; pair it with text, an icon or a line style.
- To animate movement between frames, set `transform` in `style` with `transition: transform var(--frame-ms) linear`. The player sets `--frame-ms` from the speed, and to `0ms` under reduced motion.
- Key moving elements by a stable id so they tween instead of remounting.

## 4. Build the container

```tsx
"use client";
export function MySimulation() {
  const log = useActionLog<MyAction>();
  const frames = useMemo(
    () => runSimulation(myModel, { params: DEFAULT_PARAMS, seed: SEED, ticks: 400, actions: log.actions }),
    [log.actions],
  );
  const playback = usePlayback({ frameCount: frames.length, frameMs: 150 });
  const act = (action: MyAction) => {
    log.add(playback.frame + 1, action);
    if (!playback.playing) playback.seek(playback.frame + 1); // show the effect immediately
  };
  return <SimulationPlayer kind="simulation" frames={frames} playback={playback} scene={…} controls={…} … />;
}
```

Use the controls in `components/visualizations/player/controls.tsx` (`SegmentedControl`, `Toggle`, `ActionButton`, `Stat`). They are native form elements, so they work with keyboards and screen readers out of the box.

## 5. Publish it

- Add an entry to `content/playground.ts` (title, summary, "try this" prompts, references), then add the component to `components/visualizations/demo-registry.tsx`. A test fails if the two lists disagree.
- To embed it in a lesson, add the component to `mdx-components.tsx` and use it in the MDX.
- Run `pnpm readme` to update the README's playground table.

## The player gives you, for free

Play / pause / restart / step, a timeline slider, speed control, keyboard shortcuts (`K`, `←`, `→`, `Home`, active only inside the player and never stealing keys from form controls), a polite live caption while paused, the event log, the assumptions panel, a step list for walkthroughs, pausing when the tab is hidden or the player scrolls out of view, and reduced-motion handling.
