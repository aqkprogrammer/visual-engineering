import { createRng } from "./rng";
import type { Frame, ScheduledAction, SimEvent, SimulationModel } from "./types";

export type RunOptions<Params, Action> = {
  params: Params;
  seed: number;
  ticks: number;
  actions?: ScheduledAction<Action>[];
};

/**
 * Runs a model from scratch and returns every frame: frame 0 is the initial state, frame n is the
 * state after tick n. Actions scheduled for tick n are applied before that tick is simulated.
 *
 * Because runs are deterministic, adding an action at tick n leaves frames 0..n-1 unchanged —
 * which is what lets the player inject a failure "now" without rewriting the past.
 */
export function runSimulation<State, Params, Action>(
  model: SimulationModel<State, Params, Action>,
  { params, seed, ticks, actions = [] }: RunOptions<Params, Action>,
): Frame<State>[] {
  const rng = createRng(seed);
  let state = model.init(params, rng);
  const frames: Frame<State>[] = [{ index: 0, state, events: [], caption: model.describe(state) }];
  const byTick = new Map<number, Action[]>();
  for (const { tick, action } of actions) byTick.set(tick, [...(byTick.get(tick) ?? []), action]);

  for (let tick = 1; tick <= ticks; tick++) {
    const events: SimEvent[] = [];
    for (const action of byTick.get(tick) ?? []) {
      const applied = model.apply(state, action);
      state = applied.state;
      events.push(...applied.events);
    }
    const stepped = model.tick(state, rng);
    state = stepped.state;
    events.push(...stepped.events);
    frames.push({ index: tick, state, events, caption: model.describe(state) });
  }
  return frames;
}

/** An authored, step-by-step explanation. Each step becomes one frame. */
export type WalkthroughStep<State> = {
  title: string;
  caption: string;
  state: State;
  events?: Omit<SimEvent, "at">[];
};

export function walkthroughFrames<State>(steps: WalkthroughStep<State>[]): Frame<State>[] {
  return steps.map((step, index) => ({
    index,
    state: step.state,
    caption: `${step.title}. ${step.caption}`,
    events: (step.events ?? []).map((e) => ({ ...e, at: index })),
  }));
}
