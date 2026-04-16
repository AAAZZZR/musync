import { create } from "zustand";
import type { Track } from "@/types/api";

type PlayerState = {
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number;
  queue: Track[];
  playbackSessionId: string | null;
};

type PlayerActions = {
  playTrack: (track: Track) => void;
  enqueue: (tracks: Track[]) => void;
  next: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  setVolume: (v: number) => void;
  setPlaybackSession: (id: string) => void;
};

export const usePlayerStore = create<PlayerState & PlayerActions>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  volume: 60,
  queue: [],
  playbackSessionId: null,

  playTrack: (track) => set({ currentTrack: track, isPlaying: true }),

  enqueue: (tracks) =>
    set((state) => {
      const seen = new Set(state.queue.map((t) => t.id));
      const additions = tracks.filter((t) => !seen.has(t.id));
      return { queue: [...state.queue, ...additions] };
    }),

  next: async () => {
    const { queue } = get();
    if (queue.length > 0) {
      const [head, ...rest] = queue;
      set({ currentTrack: head, queue: rest, isPlaying: true });
      return;
    }
    // queue 空時由呼叫端負責 fetch next track
  },

  pause: () => set({ isPlaying: false }),
  resume: () => set({ isPlaying: true }),

  setVolume: (v) => set({ volume: Math.max(0, Math.min(100, v)) }),

  setPlaybackSession: (id) => set({ playbackSessionId: id }),
}));
