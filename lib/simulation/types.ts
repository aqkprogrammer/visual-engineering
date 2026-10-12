import type { Rng } from "./rng";

/** One snapshot the player can show. Frames are immutable once produced. */
export type Frame<State, Event = SimEvent> = {
  index: number;
  state: State;
  /** Things that happened while producing this frame, shown in the event log. */
  events: Event[];
  /** One plain-language sentence describing this frame, announced to screen readers. */
  caption: string;
};

export type SimEvent = {
  /** Simulation time (tick) or step number the event belongs to. */
  at: number;
  message: string;
  tone?: "info" | "success" | "warning" | "error";
};

export type StepResult<State> = { state: State; events: SimEvent[] };

/**
 * A deterministic teaching model. Every function is pure: it returns a new state and never reads
 * clocks, globals or Math.random — randomness comes only from the provided Rng.
 */
export interface SimulationModel<State, Params, Action> {
  id: string;
  init(params: Params, rng: Rng): State;
  /** Advance one tick. */
  tick(state: State, rng: Rng): StepResult<State>;
  /** Apply a user action (e.g. crash a server) at the current tick. */
  apply(state: State, action: Action): StepResult<State>;
  describe(state: State): string;
}

/** A user action pinned to the tick at which it happened, so runs can be replayed exactly. */
export type ScheduledAction<Action> = { tick: number; action: Action };
