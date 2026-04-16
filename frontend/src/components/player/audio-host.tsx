"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { usePlayerStore } from "@/lib/stores/player-store";
import { nextTrackAction } from "@/lib/server/actions/playback";

export function AudioHost() {
  const ref = useRef<HTMLAudioElement>(null);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const playbackSessionId = usePlayerStore((s) => s.playbackSessionId);
  const queue = usePlayerStore((s) => s.queue);

  useEffect(() => {
    const el = ref.current;
    if (!el || !currentTrack) return;
    if (el.src !== currentTrack.stream_url) el.src = currentTrack.stream_url;
    el.volume = volume / 100;
    if (isPlaying) {
      el.play().catch(() => toast.error("Playback blocked. Click play."));
    } else {
      el.pause();
    }
  }, [currentTrack, isPlaying, volume]);

  async function handleEnded() {
    if (queue.length > 0) {
      await usePlayerStore.getState().next();
      return;
    }
    if (!playbackSessionId) return;
    const result = await nextTrackAction(playbackSessionId);
    if (result.ok) usePlayerStore.getState().playTrack(result.data.track);
    else toast.error(result.error);
  }

  return <audio ref={ref} onEnded={handleEnded} preload="auto" />;
}
