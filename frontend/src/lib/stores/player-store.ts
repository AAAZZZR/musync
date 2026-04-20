import { create } from "zustand";
import type { Track } from "@/types/api";

type PlayerState = {
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number;
  queue: Track[];
  history: Track[];
  playbackSessionId: string | null;
  progressSec: number;
  durationSec: number;
  seekTargetSec: number | null;
  loopCurrent: boolean;
};

type PlayerActions = {
  playTrack: (track: Track) => void;
  enqueue: (tracks: Track[]) => void;
  next: () => Promise<void>;
  previous: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  seekTo: (sec: number) => void;
  clearSeek: () => void;
  setProgress: (sec: number) => void;
  setDuration: (sec: number) => void;
  toggleLoop: () => void;
  setVolume: (v: number) => void;
  setPlaybackSession: (id: string) => void;
};

const HISTORY_MAX = 20;

export const usePlayerStore = create<PlayerState & PlayerActions>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  volume: 60,
  queue: [],
  history: [],
  playbackSessionId: null,
  progressSec: 0,
  durationSec: 0,
  seekTargetSec: null,
  loopCurrent: false,

  playTrack: (track) =>
    set((state) => ({
      currentTrack: track,
      isPlaying: true,
      progressSec: 0,
      history: state.currentTrack
        ? [state.currentTrack, ...state.history].slice(0, HISTORY_MAX)
        : state.history,
    })),

  enqueue: (tracks) =>
    set((state) => {
      const seen = new Set(state.queue.map((t) => t.id));
      const additions = tracks.filter((t) => !seen.has(t.id));
      return { queue: [...state.queue, ...additions] };
    }),

  next: async () => {
    const { queue, currentTrack, history } = get();
    if (queue.length > 0) {
      const [head, ...rest] = queue;
      set({
        currentTrack: head,
        queue: rest,
        isPlaying: true,
        progressSec: 0,
        history: currentTrack ? [currentTrack, ...history].slice(0, HISTORY_MAX) : history,
      });
    }
    // queue 空時由呼叫端（AudioHost）負責 fetch next
  },

  previous: () => {
    const { history, currentTrack, queue } = get();
    if (history.length === 0) return;
    const [prev, ...rest] = history;
    set({
      currentTrack: prev,
      history: rest,
      isPlaying: true,
      progressSec: 0,
      queue: currentTrack ? [currentTrack, ...queue] : queue,
    });
  },

  pause: () => set({ isPlaying: false }),
  resume: () => set({ isPlaying: true }),
  stop: () =>
    set({ currentTrack: null, isPlaying: false, progressSec: 0, durationSec: 0 }),

  seekTo: (sec) => set({ seekTargetSec: sec }),
  clearSeek: () => set({ seekTargetSec: null }),
  setProgress: (sec) => set({ progressSec: sec }),
  setDuration: (sec) => set({ durationSec: sec }),
  toggleLoop: () => set((s) => ({ loopCurrent: !s.loopCurrent })),

  setVolume: (v) => set({ volume: Math.max(0, Math.min(100, v)) }),
  setPlaybackSession: (id) => set({ playbackSessionId: id }),
}));
