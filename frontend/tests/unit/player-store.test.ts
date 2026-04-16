import { beforeEach, describe, it, expect } from "vitest";
import { usePlayerStore } from "@/lib/stores/player-store";
import type { Track } from "@/types/api";

const track1: Track = {
  id: "t1",
  title: "Track 1",
  mood: "focus",
  prompt: "p",
  stream_url: "u1",
  duration_sec: 180,
  source: "seed",
  created_at: "2026-01-01",
};
const track2: Track = { ...track1, id: "t2", title: "Track 2", stream_url: "u2" };

beforeEach(() => {
  usePlayerStore.setState({
    currentTrack: null,
    isPlaying: false,
    volume: 60,
    queue: [],
    playbackSessionId: null,
  });
});

describe("playerStore", () => {
  it("playTrack 設定 currentTrack 並 isPlaying=true", () => {
    usePlayerStore.getState().playTrack(track1);
    const s = usePlayerStore.getState();
    expect(s.currentTrack).toEqual(track1);
    expect(s.isPlaying).toBe(true);
  });

  it("pause 設定 isPlaying=false", () => {
    usePlayerStore.getState().playTrack(track1);
    usePlayerStore.getState().pause();
    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });

  it("resume 設定 isPlaying=true", () => {
    usePlayerStore.setState({ currentTrack: track1, isPlaying: false });
    usePlayerStore.getState().resume();
    expect(usePlayerStore.getState().isPlaying).toBe(true);
  });

  it("enqueue 不重複 id", () => {
    usePlayerStore.getState().enqueue([track1, track2]);
    usePlayerStore.getState().enqueue([track1]);
    expect(usePlayerStore.getState().queue).toHaveLength(2);
  });

  it("setVolume clamps to 0-100", () => {
    usePlayerStore.getState().setVolume(150);
    expect(usePlayerStore.getState().volume).toBe(100);
    usePlayerStore.getState().setVolume(-5);
    expect(usePlayerStore.getState().volume).toBe(0);
  });

  it("next 從 queue 取出第一首並設為 current", async () => {
    usePlayerStore.setState({ queue: [track1, track2] });
    await usePlayerStore.getState().next();
    const s = usePlayerStore.getState();
    expect(s.currentTrack).toEqual(track1);
    expect(s.queue).toEqual([track2]);
  });

  it("queue 空 + 沒 sessionId 時，next 不 throw 也不換 track", async () => {
    usePlayerStore.setState({ currentTrack: track1, queue: [], playbackSessionId: null });
    await expect(usePlayerStore.getState().next()).resolves.toBeUndefined();
    expect(usePlayerStore.getState().currentTrack).toEqual(track1);
  });
});
