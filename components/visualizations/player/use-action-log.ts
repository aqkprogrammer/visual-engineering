"use client";

import { useCallback, useState } from "react";
import type { ScheduledAction } from "@/lib/simulation/types";

/**
 * The list of user actions that, together with the seed, fully determines a simulation run.
 * Adding an action at tick t discards any actions after t — like typing after an undo, the
 * timeline branches from that point.
 */
export function useActionLog<Action>(initial: ScheduledAction<Action>[] = []) {
  const [actions, setActions] = useState<ScheduledAction<Action>[]>(() => initial);
  const add = useCallback((tick: number, action: Action) => {
    setActions((current) => [...current.filter((a) => a.tick <= tick), { tick, action }]);
  }, []);
  const reset = useCallback(() => setActions([]), []);
  return { actions, add, reset };
}
