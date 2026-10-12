"use client";

import { useCallback, useEffect, useMemo, useReducer } from "react";
import {
  initialPlayback,
  playbackReducer,
  type PlaybackState,
  type Speed,
} from "@/lib/simulation/playback";
import { useReducedMotion } from "./use-reduced-motion";

export type Playback = PlaybackState & {
  frameMs: number;
  reducedMotion: boolean;
  play(): void;
  pause(): void;
  toggle(): void;
  next(): void;
  previous(): void;
  restart(): void;
  seek(frame: number): void;
  setSpeed(speed: Speed): void;
};

/** Longest gap fed to the reducer at once, so a stalled tab doesn't jump far ahead. */
const MAX_STEP_MS = 250;

/**
 * Drives a playback state machine from requestAnimationFrame. Never autoplays: learners start
 * playback themselves, which also respects reduced-motion preferences by default.
 */
export function usePlayback({
  frameCount,
  frameMs,
}: {
  frameCount: number;
  frameMs: number;
}): Playback {
  const reducedMotion = useReducedMotion();
  const [state, dispatch] = useReducer(playbackReducer, frameCount, initialPlayback);

  useEffect(() => dispatch({ type: "frames", frameCount }), [frameCount]);

  useEffect(() => {
    if (!state.playing) return;
    let last = performance.now();
    let id = requestAnimationFrame(function loop(now) {
      dispatch({ type: "elapsed", ms: Math.min(now - last, MAX_STEP_MS), frameMs });
      last = now;
      id = requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(id);
  }, [state.playing, frameMs]);

  // Pause when the tab is hidden; don't silently run ahead in the background.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) dispatch({ type: "pause" });
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const play = useCallback(() => dispatch({ type: "play" }), []);
  const pause = useCallback(() => dispatch({ type: "pause" }), []);
  const toggle = useCallback(() => dispatch({ type: "toggle" }), []);
  const next = useCallback(() => dispatch({ type: "next" }), []);
  const previous = useCallback(() => dispatch({ type: "previous" }), []);
  const restart = useCallback(() => dispatch({ type: "restart" }), []);
  const seek = useCallback((frame: number) => dispatch({ type: "seek", frame }), []);
  const setSpeed = useCallback((speed: Speed) => dispatch({ type: "speed", speed }), []);

  return useMemo(
    () => ({
      ...state,
      frameMs,
      reducedMotion,
      play,
      pause,
      toggle,
      next,
      previous,
      restart,
      seek,
      setSpeed,
    }),
    [state, frameMs, reducedMotion, play, pause, toggle, next, previous, restart, seek, setSpeed],
  );
}
