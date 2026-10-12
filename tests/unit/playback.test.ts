import { describe, expect, it } from "vitest";
import { initialPlayback, playbackReducer, type PlaybackState } from "@/lib/simulation/playback";

const at = (frame: number, extra: Partial<PlaybackState> = {}): PlaybackState => ({
  ...initialPlayback(10),
  frame,
  ...extra,
});

describe("playbackReducer", () => {
  it("starts paused on the first frame at 1×", () => {
    expect(initialPlayback(10)).toEqual({
      frame: 0,
      frameCount: 10,
      playing: false,
      speed: 1,
      carry: 0,
    });
  });

  it("steps forward and back within bounds, pausing playback", () => {
    expect(playbackReducer(at(3, { playing: true }), { type: "next" })).toMatchObject({
      frame: 4,
      playing: false,
    });
    expect(playbackReducer(at(9), { type: "next" }).frame).toBe(9);
    expect(playbackReducer(at(0), { type: "previous" }).frame).toBe(0);
    expect(playbackReducer(at(5), { type: "previous" }).frame).toBe(4);
  });

  it("toggles play and pause", () => {
    const playing = playbackReducer(at(2), { type: "toggle" });
    expect(playing.playing).toBe(true);
    expect(playbackReducer(playing, { type: "toggle" }).playing).toBe(false);
  });

  it("restarts from the beginning when play is pressed on the last frame", () => {
    expect(playbackReducer(at(9), { type: "play" })).toMatchObject({ frame: 0, playing: true });
  });

  it("advances by elapsed time scaled by speed, carrying the remainder", () => {
    const playing = at(0, { playing: true });
    const a = playbackReducer(playing, { type: "elapsed", ms: 150, frameMs: 100 });
    expect(a).toMatchObject({ frame: 1, carry: 50 });
    const b = playbackReducer(a, { type: "elapsed", ms: 50, frameMs: 100 });
    expect(b).toMatchObject({ frame: 2, carry: 0 });
    const fast = playbackReducer(at(0, { playing: true, speed: 4 }), {
      type: "elapsed",
      ms: 100,
      frameMs: 100,
    });
    expect(fast.frame).toBe(4);
  });

  it("ignores elapsed time while paused", () => {
    const paused = at(3);
    expect(playbackReducer(paused, { type: "elapsed", ms: 1000, frameMs: 100 })).toBe(paused);
  });

  it("stops at the last frame", () => {
    const end = playbackReducer(at(8, { playing: true }), {
      type: "elapsed",
      ms: 1000,
      frameMs: 100,
    });
    expect(end).toMatchObject({ frame: 9, playing: false, carry: 0 });
  });

  it("seeks with clamping and rounding", () => {
    expect(playbackReducer(at(0), { type: "seek", frame: 4.6 }).frame).toBe(5);
    expect(playbackReducer(at(0), { type: "seek", frame: 99 }).frame).toBe(9);
    expect(playbackReducer(at(5), { type: "seek", frame: -3 }).frame).toBe(0);
  });

  it("keeps the frame valid when the number of frames shrinks", () => {
    expect(playbackReducer(at(9), { type: "frames", frameCount: 4 })).toMatchObject({
      frame: 3,
      frameCount: 4,
    });
  });

  it("restart keeps the playing state", () => {
    expect(playbackReducer(at(6, { playing: true }), { type: "restart" })).toMatchObject({
      frame: 0,
      playing: true,
    });
  });

  it("changes speed", () => {
    expect(playbackReducer(at(0), { type: "speed", speed: 2 }).speed).toBe(2);
  });
});
