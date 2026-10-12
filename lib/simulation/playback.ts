/**
 * Pure playback state machine shared by every visualization. The React hook only feeds it
 * elapsed time; all rules live here so they can be tested without a browser.
 */
export const SPEEDS = [0.5, 1, 2, 4] as const;
export type Speed = (typeof SPEEDS)[number];

export type PlaybackState = {
  frame: number;
  frameCount: number;
  playing: boolean;
  speed: Speed;
  /** Milliseconds accumulated towards the next frame. */
  carry: number;
};

export type PlaybackAction =
  | { type: "play" }
  | { type: "pause" }
  | { type: "toggle" }
  | { type: "next" }
  | { type: "previous" }
  | { type: "restart" }
  | { type: "seek"; frame: number }
  | { type: "speed"; speed: Speed }
  | { type: "frames"; frameCount: number }
  | { type: "elapsed"; ms: number; frameMs: number };

export function initialPlayback(frameCount: number): PlaybackState {
  return { frame: 0, frameCount, playing: false, speed: 1, carry: 0 };
}

const clamp = (frame: number, count: number) => Math.max(0, Math.min(count - 1, frame));
const atEnd = (s: PlaybackState) => s.frame >= s.frameCount - 1;

export function playbackReducer(state: PlaybackState, action: PlaybackAction): PlaybackState {
  switch (action.type) {
    case "play":
      // Playing from the last frame starts over, like a media player.
      return { ...state, playing: true, carry: 0, frame: atEnd(state) ? 0 : state.frame };
    case "pause":
      return { ...state, playing: false, carry: 0 };
    case "toggle":
      return playbackReducer(state, { type: state.playing ? "pause" : "play" });
    case "next":
      return {
        ...state,
        playing: false,
        carry: 0,
        frame: clamp(state.frame + 1, state.frameCount),
      };
    case "previous":
      return {
        ...state,
        playing: false,
        carry: 0,
        frame: clamp(state.frame - 1, state.frameCount),
      };
    case "restart":
      return { ...state, frame: 0, carry: 0 };
    case "seek":
      return { ...state, carry: 0, frame: clamp(Math.round(action.frame), state.frameCount) };
    case "speed":
      return { ...state, speed: action.speed };
    case "frames":
      return {
        ...state,
        frameCount: action.frameCount,
        frame: clamp(state.frame, action.frameCount),
      };
    case "elapsed": {
      if (!state.playing) return state;
      const total = state.carry + action.ms * state.speed;
      const steps = Math.floor(total / action.frameMs);
      if (steps === 0) return { ...state, carry: total };
      const frame = clamp(state.frame + steps, state.frameCount);
      const finished = frame >= state.frameCount - 1;
      return {
        ...state,
        frame,
        playing: !finished,
        carry: finished ? 0 : total - steps * action.frameMs,
      };
    }
  }
}
